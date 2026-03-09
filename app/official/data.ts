// ─── Domain Heatmap Metrics ───────────────────────────────────────────────
export const DOMAIN_HEATMAP: Record<string, { label: string; icon: string; score: number; trend: string }[]> = {
    geopolitics: [
        { label: "Energy", icon: "⚡", score: 72, trend: "Rising" },
        { label: "Trade", icon: "🔄", score: 65, trend: "Stable" },
        { label: "Defense", icon: "🛡️", score: 81, trend: "Escalating" },
        { label: "Climate", icon: "🌿", score: 40, trend: "Declining" },
    ],
    economics: [
        { label: "Inflation", icon: "📈", score: 61, trend: "Rising" },
        { label: "Trade Deficit", icon: "🔄", score: 68, trend: "Stable" },
        { label: "Fiscal Risk", icon: "💸", score: 55, trend: "Stable" },
        { label: "FDI Inflow", icon: "🏦", score: 44, trend: "Declining" },
    ],
    defense: [
        { label: "China Threat", icon: "🇨🇳", score: 85, trend: "Escalating" },
        { label: "Pakistan Risk", icon: "⚔️", score: 78, trend: "Rising" },
        { label: "Cyber Threats", icon: "💻", score: 70, trend: "Rising" },
        { label: "Maritime", icon: "🚢", score: 62, trend: "Stable" },
    ],
    technology: [
        { label: "AI Race", icon: "🤖", score: 65, trend: "Rising" },
        { label: "Semiconductor", icon: "🔬", score: 72, trend: "Rising" },
        { label: "Cyber Threats", icon: "🛡️", score: 80, trend: "Escalating" },
        { label: "Data Sovereignty", icon: "🗄️", score: 55, trend: "Stable" },
    ],
    climate: [
        { label: "Monsoon Risk", icon: "🌧️", score: 75, trend: "Rising" },
        { label: "Air Pollution", icon: "🌫️", score: 82, trend: "Escalating" },
        { label: "Water Stress", icon: "💧", score: 68, trend: "Stable" },
        { label: "Heat Stress", icon: "🌡️", score: 77, trend: "Rising" },
    ],
    society: [
        { label: "Healthcare Gap", icon: "🏥", score: 58, trend: "Stable" },
        { label: "Education", icon: "📚", score: 62, trend: "Stable" },
        { label: "Inequality", icon: "⚖️", score: 70, trend: "Rising" },
        { label: "Youth Unemp.", icon: "👤", score: 72, trend: "Rising" },
    ],
};

// ─── Static Entity Networks ───────────────────────────────────────────────
export type Entity = { id: string; label: string; type: string; riskScore: number };
export type Edge = { source: string; target: string; label: string; weight: number };

export const STATIC_NETWORKS: Record<string, { entities: Entity[]; edges: Edge[] }> = {
    geopolitics: {
        entities: [
            { id: "india", label: "India", type: "country", riskScore: 55 },
            { id: "china", label: "China", type: "country", riskScore: 78 },
            { id: "pakistan", label: "Pakistan", type: "country", riskScore: 82 },
            { id: "russia", label: "Russia", type: "country", riskScore: 70 },
            { id: "usa", label: "USA", type: "country", riskScore: 45 },
            { id: "quad", label: "Quad", type: "org", riskScore: 35 },
            { id: "sanctions", label: "US Sanctions", type: "policy", riskScore: 72 },
        ],
        edges: [
            { source: "india", target: "china", label: "border tension", weight: 0.9 },
            { source: "india", target: "pakistan", label: "LoC conflict", weight: 0.85 },
            { source: "india", target: "russia", label: "oil trade", weight: 0.6 },
            { source: "india", target: "usa", label: "strategic partner", weight: 0.7 },
            { source: "india", target: "quad", label: "member", weight: 0.75 },
            { source: "usa", target: "sanctions", label: "imposes", weight: 0.8 },
            { source: "russia", target: "sanctions", label: "targeted by", weight: 0.85 },
        ],
    },
    economics: {
        entities: [
            { id: "india", label: "India GDP", type: "country", riskScore: 55 },
            { id: "rbi", label: "RBI", type: "org", riskScore: 40 },
            { id: "inflation", label: "Inflation", type: "event", riskScore: 61 },
            { id: "trade", label: "Trade Def.", type: "event", riskScore: 68 },
            { id: "fdi", label: "FDI", type: "event", riskScore: 44 },
            { id: "imf", label: "IMF", type: "org", riskScore: 32 },
            { id: "rupee", label: "Rupee", type: "policy", riskScore: 50 },
        ],
        edges: [
            { source: "rbi", target: "inflation", label: "controls", weight: 0.8 },
            { source: "rbi", target: "rupee", label: "regulates", weight: 0.9 },
            { source: "inflation", target: "trade", label: "worsens", weight: 0.7 },
            { source: "fdi", target: "india", label: "boosts", weight: 0.65 },
            { source: "imf", target: "india", label: "monitors", weight: 0.5 },
        ],
    },
    defense: {
        entities: [
            { id: "india", label: "India", type: "country", riskScore: 70 },
            { id: "china", label: "China PLA", type: "country", riskScore: 85 },
            { id: "pak", label: "Pakistan", type: "country", riskScore: 78 },
            { id: "drdo", label: "DRDO", type: "org", riskScore: 30 },
            { id: "lac", label: "LAC Zone", type: "event", riskScore: 82 },
            { id: "cyber", label: "Cyber Ops", type: "event", riskScore: 70 },
            { id: "navy", label: "Indian Navy", type: "org", riskScore: 35 },
        ],
        edges: [
            { source: "china", target: "lac", label: "incursion", weight: 0.9 },
            { source: "india", target: "lac", label: "deploys", weight: 0.85 },
            { source: "pak", target: "cyber", label: "sponsors", weight: 0.7 },
            { source: "drdo", target: "india", label: "arms", weight: 0.8 },
            { source: "china", target: "pak", label: "military aid", weight: 0.8 },
        ],
    },
    technology: {
        entities: [
            { id: "india", label: "India", type: "country", riskScore: 58 },
            { id: "ai", label: "AI Race", type: "event", riskScore: 65 },
            { id: "semicon", label: "Semiconductors", type: "policy", riskScore: 72 },
            { id: "cyber", label: "Cyber Threats", type: "event", riskScore: 80 },
            { id: "china", label: "China Tech", type: "country", riskScore: 80 },
            { id: "usa", label: "USA Tech", type: "country", riskScore: 50 },
            { id: "startup", label: "Startups", type: "org", riskScore: 35 },
        ],
        edges: [
            { source: "china", target: "cyber", label: "attacks", weight: 0.85 },
            { source: "india", target: "semicon", label: "building", weight: 0.65 },
            { source: "usa", target: "semicon", label: "transfers", weight: 0.75 },
            { source: "india", target: "ai", label: "invests", weight: 0.7 },
        ],
    },
    climate: {
        entities: [
            { id: "india", label: "India", type: "country", riskScore: 77 },
            { id: "monsoon", label: "Monsoon", type: "event", riskScore: 75 },
            { id: "flood", label: "Flood Risk", type: "event", riskScore: 70 },
            { id: "solar", label: "Solar Power", type: "policy", riskScore: 25 },
            { id: "air", label: "Air Quality", type: "event", riskScore: 82 },
            { id: "water", label: "Water Stress", type: "event", riskScore: 68 },
            { id: "cop", label: "COP30", type: "org", riskScore: 40 },
        ],
        edges: [
            { source: "monsoon", target: "flood", label: "triggers", weight: 0.8 },
            { source: "monsoon", target: "water", label: "governs", weight: 0.75 },
            { source: "air", target: "india", label: "health risk", weight: 0.85 },
            { source: "india", target: "solar", label: "deploys", weight: 0.7 },
        ],
    },
    society: {
        entities: [
            { id: "india", label: "India", type: "country", riskScore: 60 },
            { id: "health", label: "PM-JAY", type: "policy", riskScore: 35 },
            { id: "edu", label: "Education", type: "event", riskScore: 62 },
            { id: "urban", label: "Urbanization", type: "event", riskScore: 65 },
            { id: "inequality", label: "Inequality", type: "event", riskScore: 70 },
            { id: "youth", label: "Youth Unemp.", type: "event", riskScore: 72 },
            { id: "ngo", label: "Civil Society", type: "org", riskScore: 30 },
        ],
        edges: [
            { source: "india", target: "health", label: "funds", weight: 0.7 },
            { source: "inequality", target: "youth", label: "worsens", weight: 0.8 },
            { source: "urban", target: "inequality", label: "drives", weight: 0.65 },
            { source: "edu", target: "youth", label: "impacts", weight: 0.75 },
        ],
    },
};

// ─── India Entity Profile ─────────────────────────────────────────────────
export const INDIA_RELATIONS: Record<string, { country: string; category: string; share: number; badge?: string }[]> = {
    geopolitics: [
        { country: "Russia", category: "Strategic Ally", share: 32, badge: "S-400" },
        { country: "China", category: "Border Rivalry", share: 28, badge: "LAC" },
        { country: "USA", category: "Quad Partner", share: 18, badge: "AUKUS" },
        { country: "Pakistan", category: "LoC Tension", share: 15 },
    ],
    economics: [
        { country: "Russia", category: "Oil Trade", share: 32, badge: "ENERGY" },
        { country: "China", category: "Electronics", share: 21, badge: "TAIWAN2" },
        { country: "USA", category: "Machinery", share: 18, badge: "S346%" },
        { country: "UAE", category: "Remittances", share: 12 },
    ],
    defense: [
        { country: "Russia", category: "Arms Imports", share: 45, badge: "S-400" },
        { country: "France", category: "Rafale Jets", share: 18, badge: "MIRAGE" },
        { country: "USA", category: "Defense Tech", share: 15, badge: "C2D2" },
        { country: "Israel", category: "Missiles", share: 10 },
    ],
    technology: [
        { country: "USA", category: "Chip Export", share: 38, badge: "CHIP4" },
        { country: "Taiwan", category: "TSMC Supply", share: 24, badge: "SEMI" },
        { country: "Japan", category: "Robotics", share: 15, badge: "AUTO" },
        { country: "Korea", category: "Displays", share: 12 },
    ],
    climate: [
        { country: "EU", category: "Climate Fund", share: 28, badge: "GCF" },
        { country: "USA", category: "Clean Tech", share: 22, badge: "IRA" },
        { country: "Japan", category: "Solar Tech", share: 18, badge: "METI" },
        { country: "China", category: "EV Imports", share: 14 },
    ],
    society: [
        { country: "USA", category: "Diaspora", share: 35, badge: "H1B" },
        { country: "UAE", category: "Migrants", share: 28, badge: "GCC" },
        { country: "UK", category: "Students", share: 15, badge: "UKVI" },
        { country: "Canada", category: "Immigration", share: 12 },
    ],
};

export const INDIA_METRICS: Record<string, { label: string; score: number; simScore: number; color: string }[]> = {
    geopolitics: [
        { label: "Influence Score", score: 67, simScore: 67, color: "#3B82F6" },
        { label: "Systemic Risk Exposure", score: 51, simScore: 48, color: "#3B82F6" },
        { label: "Escalation Probability", score: 42, simScore: 35, color: "#EF4444" },
        { label: "External Dependency Index", score: 49, simScore: 46, color: "#10B981" },
    ],
    economics: [
        { label: "Growth Momentum", score: 72, simScore: 70, color: "#3B82F6" },
        { label: "Fiscal Vulnerability", score: 55, simScore: 52, color: "#F97316" },
        { label: "Trade Risk Index", score: 61, simScore: 58, color: "#EF4444" },
        { label: "FX Dependency", score: 48, simScore: 45, color: "#10B981" },
    ],
    defense: [
        { label: "Threat Index", score: 78, simScore: 72, color: "#EF4444" },
        { label: "Force Readiness", score: 65, simScore: 68, color: "#3B82F6" },
        { label: "Border Risk", score: 82, simScore: 75, color: "#EF4444" },
        { label: "Cyber Vulnerability", score: 70, simScore: 62, color: "#F97316" },
    ],
    technology: [
        { label: "Innovation Index", score: 58, simScore: 62, color: "#3B82F6" },
        { label: "Cyber Risk", score: 72, simScore: 65, color: "#EF4444" },
        { label: "Chip Dependency", score: 80, simScore: 72, color: "#F97316" },
        { label: "AI Readiness", score: 55, simScore: 60, color: "#10B981" },
    ],
    climate: [
        { label: "Climate Vulnerability", score: 77, simScore: 72, color: "#F97316" },
        { label: "Disaster Risk", score: 70, simScore: 65, color: "#EF4444" },
        { label: "Water Security", score: 65, simScore: 60, color: "#3B82F6" },
        { label: "Renewable Progress", score: 55, simScore: 62, color: "#10B981" },
    ],
    society: [
        { label: "Social Cohesion", score: 60, simScore: 58, color: "#3B82F6" },
        { label: "Inequality Index", score: 70, simScore: 68, color: "#F97316" },
        { label: "Youth Pressure", score: 72, simScore: 70, color: "#EF4444" },
        { label: "Healthcare Access", score: 58, simScore: 62, color: "#10B981" },
    ],
};

export const IMPACT_CARDS: Record<string, { title: string; tag?: string; tagColor?: string; line1: string; line2: string; icon: string }[]> = {
    geopolitics: [
        { title: "Strategic Oil Reserves", tag: "EI.40", tagColor: "#3B82F6", line1: "Brent Crude rise n 6.8/p 30 days", line2: "Defense Perve:ite Ductner 39.5", icon: "🛢️" },
        { title: "Diplomatic Realignment", line1: "Russia-India ties reaffirmed", line2: "Quad meeting scheduled Dec 2025", icon: "🤝" },
        { title: "Semiconductor Manufacturing", line1: "Export controls: tightened", line2: "India fab investment accelerating", icon: "🔬" },
    ],
    economics: [
        { title: "Brent Crude Rise", line1: "Energy import cost | net Pecets", line2: "OPEC production cut rumors circulate", icon: "⚡" },
        { title: "RBI Rate Decision", tag: "LIVE", tagColor: "#EF4444", line1: "Inflation at 5.1%, rates held steady", line2: "Rupee at 83.2 vs USD", icon: "🏦" },
        { title: "Trade Deficit Widening", line1: "Merchandise deficit $24.2B Nov", line2: "Oil & gold imports drive gap", icon: "📉" },
    ],
    defense: [
        { title: "LAC Infrastructure", tag: "ALERT", tagColor: "#EF4444", line1: "China builds new road near Depsang", line2: "Satellite imagery confirms activity", icon: "🛡️" },
        { title: "Hypersonic Test", tag: "DRDO", tagColor: "#3B82F6", line1: "India tests glide vehicle terminal", line2: "Joins elite 5-nation club", icon: "🚀" },
        { title: "Cyber Incident India", line1: "APT group targets power grid", line2: "CERT-IN issues high-severity alert", icon: "💻" },
    ],
    technology: [
        { title: "BharatGPT Deployment", tag: "LIVE", tagColor: "#10B981", line1: "Multilingual LLM goes live gov use", line2: "6 Indian languages, 10B params", icon: "🤖" },
        { title: "Semiconductor Fab Gujarat", line1: "First chips off production line", line2: "Import dependency −12% in 18 months", icon: "🔬" },
        { title: "US Chip Export Controls", tag: "IMPACT", tagColor: "#F97316", line1: "Advanced AI chips restricted", line2: "India seeks exemption under tech pact", icon: "🇺🇸" },
    ],
    climate: [
        { title: "Monsoon Deficit Alert", tag: "HIGH", tagColor: "#EF4444", line1: "22% below normal NW India", line2: "Kharif crop output −15% projected", icon: "🌧️" },
        { title: "Solar 100 GW Milestone", tag: "ACHIEVED", tagColor: "#10B981", line1: "Cumulative solar crosses 100 GW", line2: "FY2026 target: 150 GW on track", icon: "☀️" },
        { title: "Ganga Pollution Crisis", line1: "UP industrial effluents unchecked", line2: "CPCB issues contempt notices", icon: "🌊" },
    ],
    society: [
        { title: "Urban Population 500M", tag: "MILESTONE", tagColor: "#3B82F6", line1: "Urbanization drives GDP growth", line2: "Infrastructure strain intensifying", icon: "🏙️" },
        { title: "PM-JAY Expansion", tag: "LIVE", tagColor: "#10B981", line1: "600M beneficiaries enrolled", line2: "85% utilization tier-2 cities", icon: "🏥" },
        { title: "Education Gap Report", line1: "27% rural students reach higher edu", line2: "ASER report: urban-rural divide widens", icon: "📚" },
    ],
};
