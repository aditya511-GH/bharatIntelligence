import { NextRequest, NextResponse } from "next/server";
import { fetchSchemes } from "@/lib/schemes";

export async function GET(req: NextRequest) {
    const keyword = req.nextUrl.searchParams.get("keyword") ?? undefined;
    try {
        const schemes = await fetchSchemes(keyword, 24);
        return NextResponse.json({ schemes });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
