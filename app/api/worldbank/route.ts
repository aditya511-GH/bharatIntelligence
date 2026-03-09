import { NextRequest, NextResponse } from "next/server";
import { fetchWorldBankIndicator } from "@/lib/worldbank";
import { DOMAIN_CONFIG, DomainKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
    const domain = (req.nextUrl.searchParams.get("domain") ?? "economics") as DomainKey;
    const config = DOMAIN_CONFIG[domain];
    if (!config) return NextResponse.json({ error: "Invalid domain" }, { status: 400 });

    try {
        const data = await fetchWorldBankIndicator(config.worldbankIndicator);
        return NextResponse.json({ data, indicator: config.worldbankIndicator, domain });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
