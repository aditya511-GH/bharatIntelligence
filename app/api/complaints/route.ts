import { NextRequest, NextResponse } from "next/server";
import { analyzeComplaint } from "@/lib/gemini";
import { sendComplaintEmail } from "@/lib/mailer";

// In-memory store for demo; use DB in production
const complaintsStore: {
    id: string;
    department: string;
    gravity: string;
    problemType: string;
    status: "Filed" | "Under Review" | "Resolved";
    timestamp: string;
}[] = [];

// Strike counter per "user" (identified by session/email in production)
const strikeCounter: Record<string, number> = {};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const complaintText = String(formData.get("text") ?? "");
        const department = String(formData.get("department") ?? "");
        const userName = String(formData.get("userName") ?? "Anonymous");
        const userEmail = String(formData.get("userEmail") ?? "citizen@india.in");
        // FormData.get() returns FormDataEntryValue (string | File) | null
        const imageEntry = formData.get("image");
        const imageFile: File | null = imageEntry instanceof File ? imageEntry : null;

        if (!complaintText || !department) {
            return NextResponse.json({ error: "Text and department are required" }, { status: 400 });
        }

        // Convert image to base64 if provided
        let imageBase64: string | undefined;
        let imageAttachment: { content: string; filename: string; contentType: string } | undefined;
        if (imageFile && imageFile.size > 0) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            imageBase64 = buffer.toString("base64");
            imageAttachment = {
                content: imageBase64,
                filename: imageFile.name,
                contentType: imageFile.type || "image/jpeg",
            };
        }

        // AI analysis
        const analysis = await analyzeComplaint(complaintText, department, imageBase64);

        // Image verification strike logic
        const strikeKey = userEmail;
        if (imageBase64 && (analysis.isImageAIGenerated || !analysis.imageMatchesText)) {
            strikeCounter[strikeKey] = (strikeCounter[strikeKey] ?? 0) + 1;
            if (strikeCounter[strikeKey] >= 3) {
                return NextResponse.json({
                    error: "BANNED",
                    message: "Your account has been flagged for repeatedly submitting fake or misleading images.",
                }, { status: 403 });
            }
            return NextResponse.json({
                warning: true,
                strikes: strikeCounter[strikeKey],
                message: analysis.isImageAIGenerated
                    ? "⚠️ This image appears to be AI-generated or not authentic. Strike recorded."
                    : "⚠️ The image does not match your complaint. Please attach a relevant image.",
                analysis: analysis.imageAnalysis,
            }, { status: 422 });
        }

        // Send email to officials
        await sendComplaintEmail({
            complainantName: userName,
            department,
            originalText: complaintText,
            refinedText: analysis.refinedText,
            gravity: analysis.gravity,
            problemType: analysis.problemType,
            imageAttachment,
        });

        // Store complaint for stats
        const newComplaint = {
            id: Math.random().toString(36).slice(2),
            department,
            gravity: analysis.gravity,
            problemType: analysis.problemType,
            status: "Filed" as const,
            timestamp: new Date().toISOString(),
        };
        complaintsStore.push(newComplaint);

        return NextResponse.json({
            success: true,
            gravity: analysis.gravity,
            problemType: analysis.problemType,
            refinedText: analysis.refinedText,
            complaintId: newComplaint.id,
        });
    } catch (err) {
        console.error("Complaint processing error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function GET() {
    // Return complaint statistics
    const stats = {
        total: complaintsStore.length,
        filed: complaintsStore.filter((c) => c.status === "Filed").length,
        underReview: complaintsStore.filter((c) => c.status === "Under Review").length,
        resolved: complaintsStore.filter((c) => c.status === "Resolved").length,
        byDepartment: complaintsStore.reduce((acc, c) => {
            acc[c.department] = (acc[c.department] ?? 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        byGravity: complaintsStore.reduce((acc, c) => {
            acc[c.gravity] = (acc[c.gravity] ?? 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        recent: complaintsStore.slice(-10).reverse(),
    };
    return NextResponse.json(stats);
}
