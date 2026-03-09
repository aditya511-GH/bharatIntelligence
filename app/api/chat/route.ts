import { NextRequest, NextResponse } from "next/server";
import { chatWithContext } from "@/lib/gemini";
import { summarizeScheme } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { message, context, history, type, schemeName, schemeDescription } = await req.json();

        if (type === "summarize") {
            const summary = await summarizeScheme(schemeName, schemeDescription);
            return NextResponse.json({ summary });
        }

        const response = await chatWithContext(message, context ?? "", history ?? []);
        return NextResponse.json({ response });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
