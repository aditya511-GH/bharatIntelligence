import { NextRequest, NextResponse } from "next/server";
import { analyzeComplaint } from "@/lib/gemini";
import { sendComplaintEmail } from "@/lib/mailer";
import {
    loadComplaints,
    addComplaint,
    updateComplaintStatus,
    nextComplaintId,
} from "@/lib/store";
import type { ComplaintRecord } from "@/lib/store";

// Re-export the type for components that import from this route
export type { ComplaintRecord };

// Helper to compute priority from gravity
function gravityToPriority(gravity: string): "High" | "Medium" | "Low" {
    if (gravity === "Critical" || gravity === "High") return "High";
    if (gravity === "Medium") return "Medium";
    return "Low";
}

// Strike counter per user email (in-memory is fine — resets on restart)
const strikeCounter: Record<string, number> = {};

export async function POST(req: NextRequest) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData = await req.formData() as any;
        const complaintText = String(formData.get("text") ?? "");
        const department = String(formData.get("department") ?? "");
        const title = String(formData.get("title") ?? complaintText.slice(0, 60));
        const location = String(formData.get("location") ?? "India");
        const lat = parseFloat(String(formData.get("lat") ?? "20.5937"));
        const lng = parseFloat(String(formData.get("lng") ?? "78.9629"));
        const userName = String(formData.get("userName") ?? "Citizen");
        const userEmail = String(formData.get("userEmail") ?? "");
        const originalLanguage = String(formData.get("originalLanguage") ?? "");
        const originalText = String(formData.get("originalText") ?? "");

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

        // Image verification strike logic (only if image provided AND clearly fake)
        const strikeKey = userEmail;
        if (imageBase64 && analysis.isImageAIGenerated) {
            strikeCounter[strikeKey] = (strikeCounter[strikeKey] ?? 0) + 1;
            if (strikeCounter[strikeKey] >= 3) {
                return NextResponse.json({
                    error: "BANNED",
                    message: "Your account has been flagged for repeatedly submitting AI-generated images.",
                }, { status: 403 });
            }
            return NextResponse.json({
                warning: true,
                strikes: strikeCounter[strikeKey],
                message: "⚠️ This image appears to be AI-generated or synthetic. Strike recorded.",
                analysis: analysis.imageAnalysis,
            }, { status: 422 });
        }

        // Send email to officials (best-effort)
        try {
            await sendComplaintEmail({
                complainantName: userName,
                department,
                originalText: complaintText,
                refinedText: analysis.refinedText,
                gravity: analysis.gravity,
                problemType: analysis.problemType,
                imageAttachment,
            });
        } catch (emailErr) {
            console.warn("Email send failed (non-fatal):", emailErr);
        }

        // Store complaint in Supabase
        const complaintId = await nextComplaintId();
        const newComplaint: ComplaintRecord = {
            id: complaintId,
            title,
            department,
            gravity: analysis.gravity,
            priority: gravityToPriority(analysis.gravity),
            problemType: analysis.problemType,
            status: "Filed",
            timestamp: new Date().toISOString(),
            location,
            lat: isNaN(lat) ? 20.5937 : lat,
            lng: isNaN(lng) ? 78.9629 : lng,
            userName,
            userEmail,
            description: complaintText,
            originalLanguage: originalLanguage || undefined,
            originalText: originalText || undefined,
        };
        await addComplaint(newComplaint);

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
    const complaints = await loadComplaints();
    const stats = {
        total: complaints.length,
        filed: complaints.filter((c) => c.status === "Filed").length,
        underReview: complaints.filter((c) => c.status === "Under Review").length,
        resolved: complaints.filter((c) => c.status === "Resolved").length,
        byDepartment: complaints.reduce((acc, c) => {
            acc[c.department] = (acc[c.department] ?? 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        byGravity: complaints.reduce((acc, c) => {
            acc[c.gravity] = (acc[c.gravity] ?? 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        recent: [...complaints].slice(0, 10),
        all: complaints,
        locations: complaints.map((c) => ({
            id: c.id,
            title: c.title,
            lat: c.lat,
            lng: c.lng,
            location: c.location,
            priority: c.priority,
            department: c.department,
            status: c.status,
            timestamp: c.timestamp,
        })),
    };
    return NextResponse.json(stats);
}

// PATCH endpoint for updating complaint status
export async function PATCH(req: NextRequest) {
    try {
        const { id, status } = await req.json();
        const updated = await updateComplaintStatus(id, status);
        if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, complaint: updated });
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
