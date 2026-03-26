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

export function renderMarkdown(text: string): string {
    if (!text) return "";
    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:13px;margin:8px 0 4px;color:#1e293b">$1</div>')
        .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:14px;margin:12px 0 4px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:4px">$1</div>')
        .replace(/^# (.+)$/gm, '<div style="font-weight:800;font-size:16px;margin:12px 0 6px;color:#1e293b">$1</div>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
        .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0"/>')
        .replace(/^[•\-] (.+)$/gm, '<li style="margin-left:16px;list-style:disc inside;margin-bottom:2px">$1</li>')
        .replace(/(<li style="[^"]*disc[^"]*">[\s\S]+?<\/li>(?:\n|$))+/g, match => `<ul style="margin:8px 0">${match}</ul>`)
        .replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal inside;margin-bottom:2px">$1</li>')
        .replace(/(<li style="[^"]*decimal[^"]*">[\s\S]+?<\/li>(?:\n|$))+/g, match => `<ol style="margin:8px 0">${match}</ol>`)
        .replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (full) => {
            const cols = full.split('|').slice(1, -1);
            if (!cols.length) return full;
            const isSep = cols.every(c => /^[\s\-:]+$/.test(c));
            if (isSep) return ''; 
            const cells = cols.map(c => `<td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:11px;color:#334155">${c.trim()}</td>`).join('');
            return `<tr>${cells}</tr>`;
        })
        .replace(/((?:<tr>[\s\S]*?<\/tr>\n*)+)/g, '<div style="overflow-x:auto;margin:12px 0;border-radius:8px;border:1px solid #e2e8f0"><table style="border-collapse:collapse;width:100%;font-size:11px;background:rgba(255,255,255,0.7)">$1</table></div>')
        .replace(/\n/g, '<br/>');

    html = html.replace(/(<table[^>]*>)([\s\S]*?)(<\/table>)/g, (match, p1, p2, p3) => p1 + p2.replace(/<br\/>/g, '') + p3)
               .replace(/(<ul[^>]*>)([\s\S]*?)(<\/ul>)/g, (match, p1, p2, p3) => p1 + p2.replace(/<br\/>/g, '') + p3)
               .replace(/(<ol[^>]*>)([\s\S]*?)(<\/ol>)/g, (match, p1, p2, p3) => p1 + p2.replace(/<br\/>/g, '') + p3);

    return html;
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
