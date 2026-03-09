import { NextRequest, NextResponse } from "next/server";
import { analyzeDomainNews } from "@/lib/gemini";
import { DOMAIN_CONFIG, DomainKey } from "@/lib/utils";

const MOCK_ARTICLES: Record<string, { title: string; description: string; url: string; urlToImage: null; publishedAt: string; source: { name: string } }[]> = {
    geopolitics: [
        { title: "India-China Border Tensions Ease After Diplomatic Talks", description: "Both nations agreed to resume patrol activities in contested areas following rounds of military-level negotiations.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "The Hindu" } },
        { title: "India Strengthens Quad Alliance With Strategic Maritime Drills", description: "Navy exercises with US, Japan, and Australia signal deepening security cooperation in the Indo-Pacific region.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Times of India" } },
        { title: "Pakistan Ceasefire Holds as Backchannel Diplomacy Intensifies", description: "Bilateral contacts through UAE mediation have produced calm along the LoC for 30 consecutive days.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "NDTV" } },
        { title: "Russia Arms Deal Faces Global Scrutiny as India Navigates Pressures", description: "S-400 missile defense system integration continues despite Western sanctions debate.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Indian Express" } },
        { title: "India Joins BRICS+ Expansion Talks, Seeks Balanced Multilateralism", description: "New Delhi pushes for reforms in global financial institutions during BRICS ministerial summit.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Mint" } },
    ],
    economics: [
        { title: "India GDP Growth at 7.2% Beats IMF Estimates for Q3 2025", description: "Strong manufacturing and services sector output drives India as the world's fastest-growing major economy.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Business Standard" } },
        { title: "RBI Holds Rates Steady; Inflation Concerns Persist", description: "Retail inflation at 5.1% remains above comfort zone, pushing RBI to maintain cautious monetary stance.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Economic Times" } },
        { title: "India Trade Deficit Widens as Oil Imports Surge", description: "Merchandise trade deficit hit $24.2 billion in November driven by crude oil and gold imports.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Financial Express" } },
        { title: "Rupee Stabilizes at 83.2 Against Dollar Amid Strong FDI Inflows", description: "Foreign direct investment in technology and manufacturing sectors offsets trade deficit pressures.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Mint" } },
    ],
    defense: [
        { title: "DRDO Successfully Tests Hypersonic Missile Technology", description: "India joins elite club of nations with hypersonic glide vehicle capability after successful terminal phase test.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Economic Times" } },
        { title: "India Increases Defense Budget by 12% for FY 2026", description: "Modernization push focuses on domestic manufacturing under Atmanirbhar Bharat defense initiative.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "The Hindu" } },
        { title: "China's PLA Activity Along LAC Increases, India Responds", description: "Satellite imagery shows increased Chinese infrastructure construction in eastern Ladakh sector.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "NDTV" } },
        { title: "India-US Defense Tech Transfer Agreement Signed", description: "GE jet engine co-production deal marks landmark shift in defense-industrial partnership.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Hindustan Times" } },
    ],
    technology: [
        { title: "India's AI Mission Deploys First National LLM for Government Use", description: "BharatGPT trained on multilingual Indian datasets goes live for citizen service applications.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Economic Times" } },
        { title: "Semiconductor Fab in Gujarat Begins First Chip Production", description: "India's first advanced semiconductor facility starts commercial-scale production reducing import dependency.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Mint" } },
        { title: "5G Coverage Reaches 600 Districts; Rural Connectivity Improves", description: "Telecom operators report 5G now covers 78% of India's population after major rollout push.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Business Standard" } },
        { title: "India Tech Startup Ecosystem Raises $8.2B in 2025", description: "Despite global funding winter, Indian startups attracted strong capital in deeptech and fintech sectors.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "TechCrunch India" } },
    ],
    climate: [
        { title: "Monsoon Deficit in Rajasthan Raises Crop Failure Alarm", description: "Southwest monsoon rainfall 22% below normal in northwestern regions; groundwater depletion worsens.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Hindustan Times" } },
        { title: "India Accelerates Solar Capacity; Hits 100 GW Milestone", description: "Cumulative installed solar power capacity crosses 100 GW as renewable energy transition accelerates.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Energy Monitor" } },
        { title: "River Pollution Worsens in Ganga Tributaries Despite Mission Ganga", description: "Industrial effluent discharge in UP continues unchecked despite CPCB directives.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Down to Earth" } },
    ],
    society: [
        { title: "India's Urban Population Crosses 500 Million", description: "Rapid urbanization creating strain on infrastructure but also driving economic growth and opportunity.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Times of India" } },
        { title: "Healthcare Coverage Under PM-JAY Expands to 600M Beneficiaries", description: "Ayushman Bharat enrollment drive shows 85% utilization rate in tier-2 and tier-3 cities.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "The Hindu" } },
        { title: "Education Gap Persists: Only 27% Rural Students Reach Higher Education", description: "ASER report highlights continued disparity in learning outcomes between urban and rural India.", url: "#", urlToImage: null, publishedAt: new Date().toISOString(), source: { name: "Indian Express" } },
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

    let articles = MOCK_ARTICLES[domain] ?? MOCK_ARTICLES.geopolitics;

    // Try to fetch live articles — fall back to mock if any error
    try {
        const apiKey = process.env.NEWS_API_KEY;
        if (apiKey) {
            const q = encodeURIComponent(`${config.keywords} India`);
            const url = `https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=8&sortBy=publishedAt&apiKey=${apiKey}`;
            const res = await fetch(url, { next: { revalidate: 900 }, headers: { "User-Agent": "BharatIntelligence/1.0" } });
            if (res.ok) {
                const data = await res.json();
                const live = (data.articles ?? []).filter((a: { title?: string }) => a.title && a.title !== "[Removed]");
                if (live.length > 0) articles = live.slice(0, 8);
            }
        }
    } catch {
        // silently use mock data
    }

    try {
        const analysis = await analyzeDomainNews(domain, articles);
        return NextResponse.json({
            articles: articles.slice(0, 8),
            entities: analysis.entities ?? [],
            edges: analysis.edges ?? [],
            insights: analysis.insights ?? null,
            causalChain: analysis.causalChain ?? "",
            riskScore: analysis.topRisk ?? 0,
        });
    } catch (err) {
        console.error("Gemini analysis error:", err);
        // Return articles without AI analysis as fallback
        return NextResponse.json({
            ...EMPTY_RESPONSE,
            articles: articles.slice(0, 8),
            riskScore: 55,
        });
    }
}
