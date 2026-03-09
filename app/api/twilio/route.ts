import { NextRequest, NextResponse } from "next/server";
import { makeSchemeReminderCall } from "@/lib/twilioClient";

// In-memory schedule store (use DB in production)
const scheduleStore: {
    schemeId: string;
    schemeName: string;
    deadline: string;
    userPhone: string;
    scheduledAt: string;
    called: boolean;
}[] = [];

export async function POST(req: NextRequest) {
    try {
        const { schemeId, schemeName, deadline, userPhone } = await req.json();
        if (!userPhone || !schemeName) {
            return NextResponse.json({ error: "Phone and scheme name required" }, { status: 400 });
        }

        const deadlineDate = deadline ? new Date(deadline) : null;
        const now = new Date();
        const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

        const scheduleEntry = {
            schemeId,
            schemeName,
            deadline: deadline ?? "soon",
            userPhone,
            scheduledAt: new Date().toISOString(),
            called: false,
        };

        if (!deadlineDate || deadlineDate <= threeHoursFromNow) {
            // Call immediately — deadline is within 3 hours or unknown
            const callSid = await makeSchemeReminderCall(
                userPhone,
                schemeName,
                deadlineDate ? deadlineDate.toLocaleString("en-IN") : "soon"
            );
            scheduleEntry.called = true;
            scheduleStore.push(scheduleEntry);
            return NextResponse.json({ success: true, callSid, immediate: true });
        } else {
            // Schedule (store for polling)
            scheduleStore.push(scheduleEntry);
            return NextResponse.json({
                success: true,
                scheduled: true,
                callTime: new Date(deadlineDate.getTime() - 3 * 60 * 60 * 1000).toISOString(),
            });
        }
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// Polling endpoint (call every minute via cron or setInterval)
export async function GET() {
    const now = new Date();
    const results = [];

    for (const entry of scheduleStore) {
        if (entry.called) continue;
        const deadline = new Date(entry.deadline);
        const diff = deadline.getTime() - now.getTime();
        if (diff <= 3 * 60 * 60 * 1000) {
            try {
                const callSid = await makeSchemeReminderCall(entry.userPhone, entry.schemeName, deadline.toLocaleString("en-IN"));
                entry.called = true;
                results.push({ schemeId: entry.schemeId, callSid });
            } catch (err) {
                results.push({ schemeId: entry.schemeId, error: String(err) });
            }
        }
    }

    return NextResponse.json({ processed: results.length, results });
}
