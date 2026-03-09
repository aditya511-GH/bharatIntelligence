"use client";
import { ComposableMap, Geographies, Geography, Marker, Annotation } from "react-simple-maps";
import { DomainKey } from "@/lib/utils";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Geographic coordinates [longitude, latitude] for each entity
type GeoNode = { id: string; label: string; coords: [number, number]; style: "bold" | "box" | "dot"; color?: string };
type GeoEdge = { from: string; to: string; label: string; color: string; dash?: boolean };

const FLOWS: Record<DomainKey, { nodes: GeoNode[]; edges: GeoEdge[]; legend: string[] }> = {
    geopolitics: {
        nodes: [
            { id: "russia", label: "Russia", coords: [60, 62], style: "bold", color: "#1E40AF" },
            { id: "oil_trade", label: "Oil Trade", coords: [50, 45], style: "box", color: "#F97316" },
            { id: "india", label: "India 72%", coords: [78, 22], style: "dot", color: "#1E40AF" },
            { id: "usa", label: "USA", coords: [-98, 39], style: "dot", color: "#1E40AF" },
            { id: "sanctions", label: "US Sanctions", coords: [-20, 42], style: "box", color: "#EF4444" },
            { id: "china", label: "China", coords: [105, 35], style: "dot", color: "#7C3AED" },
            { id: "taiwan", label: "Taiwan", coords: [121, 24], style: "dot", color: "#7C3AED" },
        ],
        edges: [
            { from: "russia", to: "oil_trade", label: "+1.80T 32%", color: "#F97316" },
            { from: "oil_trade", to: "india", label: "72% flow", color: "#3B82F6" },
            { from: "usa", to: "sanctions", label: "Sanctions ~72%", color: "#EF4444" },
            { from: "sanctions", to: "russia", label: "Influence Weight", color: "#EF4444", dash: true },
            { from: "china", to: "taiwan", label: "Tension", color: "#7C3AED" },
        ],
        legend: ["Sanctions: ~72%", "→ Oil flow 94%", "High • Taiwan", "US Influence"],
    },
    economics: {
        nodes: [
            { id: "india", label: "India RBI", coords: [78, 22], style: "bold", color: "#1E40AF" },
            { id: "crude", label: "Oil $88", coords: [50, 26], style: "box", color: "#F97316" },
            { id: "usa", label: "USD Fed", coords: [-98, 39], style: "dot", color: "#1E40AF" },
            { id: "opec", label: "OPEC", coords: [45, 25], style: "box", color: "#EF4444" },
            { id: "china", label: "China Trade", coords: [105, 35], style: "dot", color: "#7C3AED" },
            { id: "imf", label: "IMF +6.5%", coords: [-77, 39], style: "dot", color: "#22C55E" },
        ],
        edges: [
            { from: "opec", to: "crude", label: "Cut 1.2Mb/d", color: "#EF4444" },
            { from: "crude", to: "india", label: "+2.1% cost", color: "#F97316" },
            { from: "usa", to: "india", label: "USD pressure", color: "#EF4444", dash: true },
            { from: "imf", to: "india", label: "Forecast 7.2%", color: "#22C55E" },
            { from: "china", to: "india", label: "Trade $90B", color: "#7C3AED" },
        ],
        legend: ["OPEC cut active", "→ INR pressure", "USD strong", "IMF bullish India"],
    },
    defense: {
        nodes: [
            { id: "india", label: "India", coords: [78, 22], style: "bold", color: "#1E40AF" },
            { id: "china_pla", label: "China PLA", coords: [91, 30], style: "box", color: "#EF4444" },
            { id: "lac", label: "LAC Zone", coords: [80, 33], style: "box", color: "#EF4444" },
            { id: "pak", label: "Pakistan", coords: [69, 30], style: "dot", color: "#EF4444" },
            { id: "usa_pact", label: "US-India", coords: [-80, 34], style: "dot", color: "#22C55E" },
            { id: "russia", label: "Russia S-400", coords: [60, 55], style: "dot", color: "#3B82F6" },
        ],
        edges: [
            { from: "china_pla", to: "lac", label: "Incursion +18km", color: "#EF4444" },
            { from: "india", to: "lac", label: "60k troops", color: "#1E40AF" },
            { from: "pak", to: "india", label: "LoC tension", color: "#EF4444", dash: true },
            { from: "russia", to: "india", label: "S-400 delivery", color: "#3B82F6" },
            { from: "usa_pact", to: "india", label: "Tech transfer", color: "#22C55E" },
        ],
        legend: ["LAC tension HIGH", "→ Dual front risk", "S-400 active", "US pact signed"],
    },
    technology: {
        nodes: [
            { id: "india", label: "India IT", coords: [78, 22], style: "bold", color: "#1E40AF" },
            { id: "usa", label: "USA Chip Ban", coords: [-98, 39], style: "box", color: "#EF4444" },
            { id: "china_ai", label: "China AI", coords: [105, 35], style: "dot", color: "#7C3AED" },
            { id: "taiwan", label: "TSMC Taiwan", coords: [121, 24], style: "box", color: "#22C55E" },
            { id: "india_fab", label: "Gujarat Fab", coords: [72, 23], style: "dot", color: "#22C55E" },
        ],
        edges: [
            { from: "usa", to: "india", label: "Export controls", color: "#EF4444", dash: true },
            { from: "taiwan", to: "india_fab", label: "TSMC deal", color: "#22C55E" },
            { from: "china_ai", to: "india", label: "Cyber 80%", color: "#EF4444", dash: true },
            { from: "india_fab", to: "india", label: "−12% import dep", color: "#3B82F6" },
        ],
        legend: ["Chip ban: active", "→ TSMC deal", "Cyber: ongoing", "Fab on track"],
    },
    climate: {
        nodes: [
            { id: "india", label: "India", coords: [78, 22], style: "bold", color: "#1E40AF" },
            { id: "monsoon", label: "Monsoon −22%", coords: [72, 18], style: "box", color: "#EF4444" },
            { id: "arctic", label: "Arctic Melt", coords: [0, 80], style: "dot", color: "#7C3AED" },
            { id: "solar", label: "Solar 100GW", coords: [75, 25], style: "box", color: "#22C55E" },
            { id: "cop30", label: "COP30 UAE", coords: [55, 25], style: "dot", color: "#3B82F6" },
        ],
        edges: [
            { from: "arctic", to: "monsoon", label: "Jet stream shift", color: "#7C3AED" },
            { from: "monsoon", to: "india", label: "Kharif −15%", color: "#EF4444" },
            { from: "india", to: "solar", label: "150GW target", color: "#22C55E" },
            { from: "cop30", to: "india", label: "Net zero 2070", color: "#3B82F6" },
        ],
        legend: ["Monsoon deficit", "→ Food risk", "Solar milestone", "COP30 committed"],
    },
    society: {
        nodes: [
            { id: "india", label: "India", coords: [78, 22], style: "bold", color: "#1E40AF" },
            { id: "urban", label: "Urban 500M", coords: [77, 28], style: "box", color: "#F97316" },
            { id: "edu", label: "Edu Gap 27%", coords: [80, 18], style: "box", color: "#EF4444" },
            { id: "pmjay", label: "PM-JAY 600M", coords: [75, 20], style: "dot", color: "#22C55E" },
            { id: "diaspora", label: "Diaspora $120B", coords: [-80, 34], style: "dot", color: "#3B82F6" },
        ],
        edges: [
            { from: "edu", to: "india", label: "Skills gap", color: "#EF4444" },
            { from: "urban", to: "india", label: "Inequality ↑70", color: "#F97316" },
            { from: "pmjay", to: "india", label: "Coverage 85%", color: "#22C55E" },
            { from: "diaspora", to: "india", label: "Remit $120B", color: "#3B82F6" },
        ],
        legend: ["Urban pressure", "→ Inequality rising", "PM-JAY expanding", "Diaspora funding"],
    },
};

// Convert projected pixel coords back — react-simple-maps handles projection internally
// We use Annotation for labels and Marker for nodes
export function GeoFlowMap({ domain, simulated }: { domain: DomainKey; simulated: boolean }) {
    const flow = FLOWS[domain] ?? FLOWS.geopolitics;

    return (
        <div className="relative w-full overflow-hidden" style={{ height: 360, borderRadius: 12, border: "1px solid #BFDBFE", background: "#DBEAFE" }}>
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 120, center: [40, 25] }}
                style={{ width: "100%", height: "100%" }}
            >
                {/* Real world countries */}
                <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                        geographies.map((geo) => (
                            <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill="#BFDBFE"
                                stroke="#93C5FD"
                                strokeWidth={0.5}
                                style={{
                                    default: { fill: "#BFDBFE", outline: "none" },
                                    hover: { fill: "#A5C8F0", outline: "none" },
                                    pressed: { fill: "#A5C8F0", outline: "none" },
                                }}
                            />
                        ))
                    }
                </Geographies>

                {/* Flow edges — drawn as Annotations from each node */}
                {flow.edges.map((edge, i) => {
                    const fromNode = flow.nodes.find(n => n.id === edge.from);
                    const toNode = flow.nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;
                    const [fx, fy] = fromNode.coords;
                    const [tx, ty] = toNode.coords;
                    // Midpoint for label
                    const mx = (fx + tx) / 2;
                    const my = (fy + ty) / 2;
                    return (
                        <g key={i}>
                            {/* Line drawn as annotation from midpoint */}
                            <Annotation
                                subject={[mx, my]}
                                dx={0}
                                dy={0}
                                connectorProps={{ stroke: edge.color, strokeWidth: simulated ? 1 : 1.5, strokeDasharray: edge.dash ? "4,3" : undefined }}
                            >
                                <text fontSize={7} fill={edge.color} fontWeight="600" textAnchor="middle">{edge.label}</text>
                            </Annotation>
                        </g>
                    );
                })}

                {/* Markers for each node */}
                {flow.nodes.map((node) => (
                    <Marker key={node.id} coordinates={node.coords}>
                        {node.style === "bold" && (
                            <g>
                                <circle r={10} fill={node.color ?? "#1E40AF"} stroke="white" strokeWidth={2} opacity={0.9} />
                                <text textAnchor="middle" y={-14} fontSize={8} fontWeight="800" fill="#1E293B">{node.label}</text>
                            </g>
                        )}
                        {node.style === "box" && (
                            <g>
                                <rect x={-32} y={-12} width={64} height={22} rx={4} fill="white" stroke={node.color ?? "#1E40AF"} strokeWidth={1.5} opacity={0.95} />
                                <text textAnchor="middle" y={3} fontSize={8} fontWeight="700" fill={node.color ?? "#1E40AF"}>{node.label}</text>
                            </g>
                        )}
                        {node.style === "dot" && (
                            <g>
                                <circle r={7} fill={node.color ?? "#1E40AF"} stroke="white" strokeWidth={1.5} opacity={0.85} />
                                <text textAnchor="middle" y={-11} fontSize={7} fontWeight="600" fill="#1E293B">{node.label}</text>
                            </g>
                        )}
                    </Marker>
                ))}
            </ComposableMap>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-1">
                <div className="flex gap-3 flex-wrap">
                    {flow.legend.map(l => (
                        <span key={l} style={{ color: "#1E40AF", fontSize: 9, fontWeight: 500 }}>{l}</span>
                    ))}
                </div>
                <div className="flex gap-2 items-center">
                    {[["#EF4444", "Threat"], ["#22C55E", "Support"], ["#3B82F6", "Trade"]].map(([c, l]) => (
                        <div key={l} className="flex items-center gap-1">
                            <div style={{ width: 12, height: 2, borderRadius: 1, background: c }} />
                            <span style={{ color: "#64748B", fontSize: 8 }}>{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Simulated overlay */}
            {simulated && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: "#7C3AED", color: "white", opacity: 0.9 }}>
                    ⚡ Simulated Mode
                </div>
            )}
        </div>
    );
}
