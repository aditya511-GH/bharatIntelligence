import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

// In-memory OTP store: phone → { otp, expiresAt }
// For production, use Redis or a DB with TTL
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/otp — generate & send OTP via Twilio SMS
export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();
        if (!phone) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !from) {
            return NextResponse.json({ error: "Twilio credentials not configured" }, { status: 500 });
        }

        const otp = generateOtp();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

        // Store OTP before sending (avoid race conditions)
        otpStore.set(phone, { otp, expiresAt });

        // Send OTP via Twilio SMS
        const client = twilio(accountSid, authToken);
        await client.messages.create({
            body: `Your National Ontology Platform OTP is: ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
            from,
            to: phone,
        });

        return NextResponse.json({ success: true, message: "OTP sent successfully" });
    } catch (err: unknown) {
        console.error("OTP send error:", err);
        const message = err instanceof Error ? err.message : "Failed to send OTP";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PUT /api/otp — verify OTP
export async function PUT(req: NextRequest) {
    try {
        const { phone, otp } = await req.json();
        if (!phone || !otp) {
            return NextResponse.json({ error: "Phone and OTP are required" }, { status: 400 });
        }

        const stored = otpStore.get(phone);
        if (!stored) {
            return NextResponse.json({ error: "No OTP found for this number. Please request a new one." }, { status: 400 });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(phone);
            return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
        }

        if (stored.otp !== otp) {
            return NextResponse.json({ error: "Invalid OTP. Please check and try again." }, { status: 401 });
        }

        // OTP verified — clean up
        otpStore.delete(phone);

        return NextResponse.json({ success: true, message: "OTP verified successfully" });
    } catch (err: unknown) {
        console.error("OTP verify error:", err);
        const message = err instanceof Error ? err.message : "Failed to verify OTP";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
