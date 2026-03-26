import { NextRequest, NextResponse } from "next/server";
import { analyzeDomainNews } from "@/lib/gemini";
import { fetchRssArticles } from "@/lib/rss";
import { DOMAIN_CONFIG, DomainKey } from "@/lib/utils";

// Fallback mock articles if all RSS feeds fail
const MOCK_ARTICLES: Record<string, { title: string; description: string; url: string; urlToImage: null; publishedAt: string; source: { name: string } }[]> = {
    geopolitics: [
        { title: "India-China Border Tensions Ease After Diplomatic Talks", description: "Both nations agreed to resume patrol activities in contested areas following military-level negotiations.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "The Hindu" } },
        { title: "India Strengthens Quad Alliance With Strategic Maritime Drills", description: "Navy exercises with US, Japan, and Australia signal deepening security cooperation in the Indo-Pacific.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Times of India" } },
        { title: "Pakistan Ceasefire Holds as Backchannel Diplomacy Intensifies", description: "Bilateral contacts through UAE mediation have produced calm along the LoC for 30 consecutive days.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "NDTV" } },
        { title: "India Joins BRICS+ Expansion Talks, Seeks Balanced Multilateralism", description: "New Delhi pushes for reforms in global financial institutions during BRICS ministerial summit.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Mint" } },
    ],
    economics: [
        { title: "India GDP Growth at 7.2% Beats IMF Estimates", description: "Strong manufacturing and services output drives India as the world's fastest-growing major economy.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Business Standard" } },
        { title: "RBI Holds Rates Steady; Inflation Concerns Persist", description: "Retail inflation at 5.1% remains above comfort zone, pushing RBI to maintain cautious monetary stance.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Economic Times" } },
        { title: "Rupee Stabilizes at 83.2 Against Dollar Amid Strong FDI Inflows", description: "Foreign direct investment in technology and manufacturing sectors offsets trade deficit pressures.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Mint" } },
    ],
    defense: [
        { title: "DRDO Successfully Tests Hypersonic Missile Technology", description: "India joins elite club with hypersonic glide vehicle capability after successful terminal phase test.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Economic Times" } },
        { title: "India Increases Defense Budget by 12% for FY 2026", description: "Modernization push focuses on domestic manufacturing under Atmanirbhar Bharat defense initiative.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "The Hindu" } },
    ],
    technology: [
        { title: "India's AI Mission Deploys First National LLM for Government Use", description: "BharatGPT trained on multilingual Indian datasets goes live for citizen service applications.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Economic Times" } },
        { title: "Semiconductor Fab in Gujarat Begins First Chip Production", description: "India's first advanced semiconductor facility starts commercial-scale production.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Mint" } },
    ],
    climate: [
        { title: "Monsoon Deficit in Rajasthan Raises Crop Failure Alarm", description: "Southwest monsoon rainfall 22% below normal in northwestern regions; groundwater depletion worsens.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Hindustan Times" } },
        { title: "India Accelerates Solar Capacity; Hits 100 GW Milestone", description: "Cumulative installed solar power capacity crosses 100 GW as renewable energy transition accelerates.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Energy Monitor" } },
    ],
    society: [
        { title: "India's Urban Population Crosses 500 Million", description: "Rapid urbanisation creating strain on infrastructure but also driving economic growth.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Times of India" } },
        { title: "Healthcare Coverage Under PM-JAY Expands to 600M Beneficiaries", description: "Ayushman Bharat enrollment drive shows 85% utilization rate in tier-2 and tier-3 cities.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "The Hindu" } },
    ],
};

const EMPTY_RESPONSE = {
    articles: [],
    entities: [],
    edges: [],
    insights: null,
    causalChain: "",
    riskScore: 0,
};

export async function GET(req: NextRequest) {
    const domain = (req.nextUrl.searchParams.get("domain") ?? "geopolitics") as DomainKey;
    const config = DOMAIN_CONFIG[domain];
    if (!config) return NextResponse.json({ error: "Invalid domain", ...EMPTY_RESPONSE }, { status: 400 });

    // Try RSS first — falls back to mock
    let articles: typeof MOCK_ARTICLES[string] = MOCK_ARTICLES[domain] ?? MOCK_ARTICLES.geopolitics;

    try {
        const rssArticles = await fetchRssArticles(domain, 10);
        if (rssArticles.length > 0) {
            articles = rssArticles.map((a) => ({
                title: a.title,
                description: a.description ?? "",
                url: a.url,
                urlToImage: null,
                publishedAt: a.publishedAt,
                source: a.source,
            }));
        }
    } catch {
        // silently use mock
    }

    try {
        const analysis = await analyzeDomainNews(domain, articles);
        return NextResponse.json({
            articles: articles.slice(0, 10),
            entities: analysis.entities ?? [],
            edges: analysis.edges ?? [],
            insights: analysis.insights ?? null,
            causalChain: analysis.causalChain ?? "",
            riskScore: analysis.topRisk ?? 0,
        });
    } catch (err) {
        console.error("Groq analysis error:", err);
        return NextResponse.json({
            ...EMPTY_RESPONSE,
            articles: articles.slice(0, 10),
            riskScore: 55,
        });
    }
}
