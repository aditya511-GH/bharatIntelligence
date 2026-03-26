import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";

// POST /api/map-intel
// Body: { title: string, description: string, domain: string }
// Returns AI-generated world-relation map nodes/edges + insights + future prediction

export async function POST(req: NextRequest) {
    try {
        const { title, description, domain } = await req.json();
        if (!title) {
            return NextResponse.json({ error: "title required" }, { status: 400 });
        }

        const prompt = `You are India's National Intelligence Platform geospatial analyst.
Analyze this news event and return a JSON world-relation map showing how countries/entities are connected through this event, with India's perspective.

EVENT:
Title: "${title}"
Description: "${description ?? "N/A"}"
Domain: ${domain}

Return ONLY valid JSON (no markdown, no explanation):
{
  "nodes": [
    { "id": "unique_id", "label": "Country/Entity Name\\nKey metric", "lat": 0.0, "lng": 0.0, "color": "#hex", "size": "large|small" }
  ],
  "edges": [
    { "from": "node_id", "to": "node_id", "label": "relationship description", "color": "#hex", "dash": false, "weight": 2 }
  ],
  "center": [lat, lng],
  "zoom": 3,
  "insights": "2-3 sentence strategic analysis for India from this specific event",
  "futurePrediction": "What happens in the next 30-90 days if this trend continues — specifically for India's economy, security, or foreign policy"
}

Rules:
- Always include India as a node (lat: 22, lng: 78, color: "#1E40AF", size: "large")
- Include 4-8 total nodes relevant to THIS specific event
- Include 3-6 edges showing actual relationships from THIS event
- Colors: #EF4444=conflict/risk, #22C55E=alliance/benefit, #3B82F6=trade/dependency, #F97316=energy/resource, #7C3AED=geopolitical pressure
- Set center/zoom to focus on the most relevant geographic area
- Make nodes, edges, insights, and futurePrediction SPECIFIC to this article, not generic`;

        const raw = await callAI(
            prompt,
            "You are an expert geospatial intelligence analyst. Return only valid, parseable JSON.",
            { temperature: 0.3, max_tokens: 1200 },
        );

        const cleaned = raw
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        const parsed = JSON.parse(cleaned);

        return NextResponse.json(parsed);
    } catch (err: unknown) {
        console.error("map-intel error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Analysis failed" },
            { status: 500 }
        );
    }
}
