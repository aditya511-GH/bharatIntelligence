// ─── Utility functions ───────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function getRiskColor(score: number): string {
    if (score >= 80) return "badge-critical";
    if (score >= 60) return "badge-high";
    if (score >= 40) return "badge-medium";
    return "badge-low";
}

export function getRiskLabel(score: number): string {
    if (score >= 80) return "Critical";
    if (score >= 60) return "High";
    if (score >= 40) return "Medium";
    return "Low";
}

export function truncate(text: string, length: number): string {
    return text.length > length ? text.slice(0, length) + "..." : text;
}

export const DOMAIN_CONFIG = {
    geopolitics: {
        label: "Geopolitics",
        icon: "🌐",
        color: "#1565C0",
        glow: "#42A5F5",
        keywords: "India foreign policy geopolitics China Russia Pakistan border",
        worldbankIndicator: "NY.GDP.MKTP.CD",
        description: "Cross-border relations, alliances, and strategic positioning",
    },
    economics: {
        label: "Economics",
        icon: "📈",
        color: "#00695C",
        glow: "#4DB6AC",
        keywords: "India economy GDP inflation trade deficit RBI rupee exports imports",
        worldbankIndicator: "FP.CPI.TOTL.ZG",
        description: "Macroeconomic indicators, trade flows, and fiscal health",
    },
    defense: {
        label: "Defense",
        icon: "🛡️",
        color: "#4A148C",
        glow: "#CE93D8",
        keywords: "India defense military DRDO arms procurement border security",
        worldbankIndicator: "MS.MIL.XPND.GD.ZS",
        description: "Security posture, military capability, and threat landscape",
    },
    technology: {
        label: "Technology",
        icon: "⚡",
        color: "#E65100",
        glow: "#FFAB91",
        keywords: "India technology AI semiconductor startup digital infrastructure",
        worldbankIndicator: "IT.NET.USER.ZS",
        description: "Innovation ecosystems, digital infrastructure, and tech rivalry",
    },
    climate: {
        label: "Climate",
        icon: "🌿",
        color: "#1B5E20",
        glow: "#A5D6A7",
        keywords: "India climate monsoon flood drought renewable energy pollution",
        worldbankIndicator: "EN.ATM.CO2E.PC",
        description: "Environmental risks, resource scarcity, and climate resilience",
    },
    society: {
        label: "Society",
        icon: "🏛️",
        color: "#B71C1C",
        glow: "#EF9A9A",
        keywords: "India social welfare education health inequality rural urban",
        worldbankIndicator: "SI.POV.NAHC",
        description: "Social cohesion, welfare, and human development indicators",
    },
} as const;

export type DomainKey = keyof typeof DOMAIN_CONFIG;

export const DOMAINS: DomainKey[] = ["geopolitics", "economics", "defense", "technology", "climate", "society"];
