"use client";
import { useState, useEffect } from "react";
import { DomainKey } from "@/lib/utils";
import { Microscope, Trophy } from "lucide-react";

// ─── Heatmap Breakdown Definitions ───────────────────────────────────────────
export const HEATMAP_BREAKDOWN: Record<string, {
    formula: string; globalRank: string; trendDelta: number; trendDir: "up" | "down";
    components: { name: string; weight: number; unit: string; value: number; valueLabel: string; source: string; wbIndicator?: string }[];
}> = {
    "Energy": {
        formula: "OilImportDep×0.40 + BrentVol×0.25 + ReserveDays×0.20 + SanctionExp×0.15",
        globalRank: "5 of G20", trendDelta: 4, trendDir: "up",
        components: [
            { name: "Oil Import Dependency", weight: 40, unit: "%", value: 78, valueLabel: "78% of consumption", source: "IEA / World Bank", wbIndicator: "NE.IMP.GNFS.ZS" },
            { name: "Brent Price Volatility", weight: 25, unit: "$/bbl", value: 88, valueLabel: "$88/bbl ±6.2%", source: "EIA" },
            { name: "Strategic Reserve Days", weight: 20, unit: "days", value: 32, valueLabel: "32 days cover", source: "IEA" },
            { name: "Sanctions Exposure", weight: 15, unit: "index", value: 45, valueLabel: "Score: 45/100", source: "SIPRI" },
        ],
    },
    "Trade": {
        formula: "TradeDeficit×0.35 + ExportConc×0.25 + FDIInflow×0.20 + TariffExposure×0.20",
        globalRank: "8 of G20", trendDelta: 2, trendDir: "up",
        components: [
            { name: "Trade Deficit (% GDP)", weight: 35, unit: "%", value: 2.8, valueLabel: "−$120B annualised", source: "World Bank", wbIndicator: "BN.CAB.XOKA.GD.ZS" },
            { name: "Export Concentration", weight: 25, unit: "HHI", value: 62, valueLabel: "HHI: 0.31 (moderate)", source: "WTO" },
            { name: "FDI Inflow", weight: 20, unit: "B$", value: 44, valueLabel: "$44B inflow FY25", source: "RBI" },
            { name: "Tariff Exposure", weight: 20, unit: "%", value: 58, valueLabel: "ASEAN exposure 58%", source: "WTO" },
        ],
    },
    "Defense": {
        formula: "BorderTension×0.40 + CyberRisk×0.20 + MilSpend×0.25 + AllianceStr×0.15",
        globalRank: "3 of G20", trendDelta: 7, trendDir: "up",
        components: [
            { name: "Border Tension Index", weight: 40, unit: "index", value: 85, valueLabel: "LAC escalation HIGH", source: "SIPRI" },
            { name: "Cyber Threat Index", weight: 20, unit: "index", value: 70, valueLabel: "APT incidents: 2,400/yr", source: "CERT-In" },
            { name: "Military Spend % GDP", weight: 25, unit: "%", value: 2.4, valueLabel: "2.4% GDP ($74B)", source: "World Bank", wbIndicator: "MS.MIL.XPND.GD.ZS" },
            { name: "Alliance Strength", weight: 15, unit: "score", value: 68, valueLabel: "Quad+AUKUS orbit", source: "IISS" },
        ],
    },
    "Climate": {
        formula: "MonsoonDef×0.30 + AQI×0.25 + WaterStress×0.25 + HeatIndex×0.20",
        globalRank: "2 of G20", trendDelta: 3, trendDir: "up",
        components: [
            { name: "Monsoon Deficit", weight: 30, unit: "%", value: 22, valueLabel: "−22% below normal", source: "IMD" },
            { name: "Air Quality Index", weight: 25, unit: "AQI", value: 168, valueLabel: "AQI 168 (Unhealthy)", source: "CPCB" },
            { name: "Water Stress Level", weight: 25, unit: "index", value: 72, valueLabel: "High stress: 14 states", source: "NITI Aayog" },
            { name: "Heat Stress Events", weight: 20, unit: "days/yr", value: 48, valueLabel: "48 extreme heat days", source: "IMD" },
        ],
    },
    "Alliance Risk": {
        formula: "SanctionExp×0.35 + DiplScore×0.30 + AllianceCov×0.35",
        globalRank: "6 of G20", trendDelta: 2, trendDir: "up",
        components: [
            { name: "Sanction Exposure", weight: 35, unit: "index", value: 45, valueLabel: "Score: 45/100", source: "SIPRI" },
            { name: "Diplomatic Score", weight: 30, unit: "index", value: 58, valueLabel: "UN alignment: 0.71", source: "UNGA" },
            { name: "Alliance Coverage", weight: 35, unit: "score", value: 68, valueLabel: "Quad+SCO dual membership", source: "IISS" },
        ],
    },
    "Border Tension": {
        formula: "LACIndex×0.40 + LoC Activity×0.35 + NavalContest×0.25",
        globalRank: "4 of G20", trendDelta: 5, trendDir: "up",
        components: [
            { name: "LAC Incursion Index", weight: 40, unit: "index", value: 85, valueLabel: "18km deep, 3 friction pts", source: "IDSA" },
            { name: "LoC Activity", weight: 35, unit: "incidents/mo", value: 62, valueLabel: "62 incidents June", source: "MEA" },
            { name: "Naval Contest", weight: 25, unit: "index", value: 55, valueLabel: "IOR patrol frequency", source: "IISS" },
        ],
    },
    // ── Economics domain breakdowns ───────────────────────────────────────────
    "Capital Markets": {
        formula: "SensexVol×0.30 + FIIFlow×0.30 + BondYield×0.20 + CreditRating×0.20",
        globalRank: "5 of G20", trendDelta: 3, trendDir: "up",
        components: [
            { name: "BSE Sensex Volatility", weight: 30, unit: "VIX", value: 18, valueLabel: "18.2 (elevated)", source: "NSE" },
            { name: "FII Net Flow", weight: 30, unit: "$B/mo", value: -2.8, valueLabel: "−$2.8B outflows (Mar 26)", source: "SEBI" },
            { name: "10Y Bond Yield", weight: 20, unit: "%", value: 7.1, valueLabel: "7.1% (stress zone)", source: "RBI" },
            { name: "Sovereign Credit Rating", weight: 20, unit: "score", value: 62, valueLabel: "Baa3/BBB− watch", source: "Moody's" },
        ],
    },
    "Fiscal Deficit": {
        formula: "GovtExp×0.35 + TaxRev×0.30 + CapexRatio×0.20 + SubsidyLoad×0.15",
        globalRank: "7 of G20", trendDelta: 2, trendDir: "up",
        components: [
            { name: "Govt Expenditure % GDP", weight: 35, unit: "%", value: 15.3, valueLabel: "15.3% GDP — ↑ from 14.8", source: "MoF" },
            { name: "Tax Revenue % GDP", weight: 30, unit: "%", value: 10.2, valueLabel: "GST + Direct tax, stable", source: "CBDT" },
            { name: "Capex Ratio", weight: 20, unit: "%", value: 22, valueLabel: "22% of total spend (good)", source: "MoF" },
            { name: "Subsidy Load", weight: 15, unit: "$B", value: 48, valueLabel: "$48B food+fuel (FY26)", source: "MoF" },
        ],
    },
    "Current Account": {
        formula: "TradeBalance×0.40 + ServicesExp×0.25 + Remittances×0.20 + FDINet×0.15",
        globalRank: "6 of G20", trendDelta: 4, trendDir: "up",
        components: [
            { name: "Goods Trade Balance", weight: 40, unit: "$B", value: -245, valueLabel: "−$245B annual (FY26)", source: "DPIIT" },
            { name: "Services Exports", weight: 25, unit: "$B", value: 338, valueLabel: "$338B IT/BPO surplus", source: "RBI" },
            { name: "Remittance Inflow", weight: 20, unit: "$B", value: 120, valueLabel: "$120B (world's largest)", source: "World Bank" },
            { name: "Net FDI Inflow", weight: 15, unit: "$B", value: 44, valueLabel: "$44B FY26 provisional", source: "RBI" },
        ],
    },
    // ── Technology domain breakdowns ──────────────────────────────────────────
    "Semiconductor Risk": {
        formula: "ImportDep×0.40 + FabCap×0.25 + USExposure×0.20 + InventoryBuffer×0.15",
        globalRank: "8 of G20", trendDelta: 6, trendDir: "up",
        components: [
            { name: "Import Dependency", weight: 40, unit: "%", value: 78, valueLabel: "78% from Taiwan+China", source: "DPIIT" },
            { name: "Domestic Fab Capacity", weight: 25, unit: "K wafers/mo", value: 0, valueLabel: "0 (Tata fab Q3 2026)", source: "MeitY" },
            { name: "US CHIPS Act Exposure", weight: 20, unit: "index", value: 62, valueLabel: "Secondary sanction risk: 62", source: "USITC" },
            { name: "Inventory Buffer", weight: 15, unit: "weeks", value: 6, valueLabel: "6 weeks critical stock", source: "ICEA" },
        ],
    },
    "AI Readiness": {
        formula: "DataInfra×0.30 + TalentPool×0.30 + PolicyFrm×0.20 + ComputeAccess×0.20",
        globalRank: "3 of G20", trendDelta: 5, trendDir: "up",
        components: [
            { name: "Data Infrastructure", weight: 30, unit: "score", value: 61, valueLabel: "UPI/DPDP Act score: 61", source: "MeitY" },
            { name: "AI Talent Pool", weight: 30, unit: "K engineers", value: 420, valueLabel: "420K AI/ML engineers", source: "NASSCOM" },
            { name: "Policy Framework", weight: 20, unit: "score", value: 55, valueLabel: "DPDP 2023 + AI policy draft", source: "NITI" },
            { name: "Compute Access (GPU)", weight: 20, unit: "index", value: 42, valueLabel: "National AI compute: limited", source: "MeitY" },
        ],
    },
    "Cyber Infrastructure": {
        formula: "CERTResponse×0.30 + CriticalInfra×0.30 + APTExposure×0.25 + CyberBudget×0.15",
        globalRank: "5 of G20", trendDelta: 4, trendDir: "up",
        components: [
            { name: "CERT-In Response Score", weight: 30, unit: "score", value: 68, valueLabel: "68/100 — upgraded 2025", source: "CERT-In" },
            { name: "Critical Infra Hardening", weight: 30, unit: "%", value: 52, valueLabel: "52% grid hardened", source: "MHA" },
            { name: "APT Attack Exposure", weight: 25, unit: "incidents/yr", value: 2400, valueLabel: "2,400+ state-sponsored", source: "CERT-In" },
            { name: "Cyber Defense Budget", weight: 15, unit: "$M", value: 480, valueLabel: "$480M (2.1× FY24)", source: "MoF" },
        ],
    },
    // ── Society domain breakdowns ─────────────────────────────────────────────
    "Social Inequality": {
        formula: "GiniCoeff×0.35 + WealthConc×0.30 + RegionalDisp×0.20 + CasteGap×0.15",
        globalRank: "9 of G20", trendDelta: 2, trendDir: "up",
        components: [
            { name: "Gini Coefficient", weight: 35, unit: "index", value: 0.51, valueLabel: "0.51 — rising since 2020", source: "World Bank" },
            { name: "Wealth Concentration", weight: 30, unit: "%", value: 58, valueLabel: "Top 1% holds 58% wealth", source: "WID" },
            { name: "Regional Disparity Index", weight: 20, unit: "score", value: 72, valueLabel: "Bihar/UP vs Kerala gap: 72", source: "NITI" },
            { name: "Social Mobility Score", weight: 15, unit: "score", value: 48, valueLabel: "48/100 — low inter-gen", source: "ILO" },
        ],
    },
    "Healthcare Access": {
        formula: "PM_JAY×0.30 + DoctorRatio×0.25 + HospBeds×0.25 + HealthSpend×0.20",
        globalRank: "8 of G20", trendDelta: 3, trendDir: "down",
        components: [
            { name: "PM-JAY Coverage", weight: 30, unit: "M people", value: 600, valueLabel: "600M enrolled (FY26)", source: "NHA" },
            { name: "Doctor-to-Patient Ratio", weight: 25, unit: "per 1000", value: 0.7, valueLabel: "0.7 (WHO req: 1.0)", source: "NMC" },
            { name: "Hospital Beds per 1000", weight: 25, unit: "beds", value: 0.5, valueLabel: "0.5 beds — critical gap", source: "MoHFW" },
            { name: "Public Health Spend % GDP", weight: 20, unit: "%", value: 2.1, valueLabel: "2.1% GDP (target: 2.5%)", source: "MoHFW" },
        ],
    },
    "Youth Employment": {
        formula: "UnempRate×0.35 + SkillMatch×0.25 + InformalShare×0.25 + JobCreation×0.15",
        globalRank: "7 of G20", trendDelta: 3, trendDir: "up",
        components: [
            { name: "Youth Unemployment (15–24)", weight: 35, unit: "%", value: 23, valueLabel: "23% — structural concern", source: "CMIE" },
            { name: "Skill-Job Mismatch", weight: 25, unit: "%", value: 68, valueLabel: "68% graduates underqualified", source: "NSSO" },
            { name: "Informal Economy Share", weight: 25, unit: "%", value: 82, valueLabel: "82% workforce informal", source: "ILO" },
            { name: "Formal Job Creation/yr", weight: 15, unit: "M jobs", value: 8, valueLabel: "8M formal jobs FY26", source: "NCS" },
        ],
    },
};

// ─── Heatmap Breakdown Panel ──────────────────────────────────────────────────
export function HeatmapBreakdownPanel({ label, score, onClose }: { label: string; score: number; onClose: () => void }) {
    const breakdown = HEATMAP_BREAKDOWN[label];
    const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    if (!breakdown) return (
        <div className="p-4"><button onClick={onClose} className="text-xs text-gray-400">✕ Close</button><p className="text-xs mt-2 text-gray-500">No breakdown available for {label}.</p></div>
    );

    return (
        <div className="rounded-xl border p-4 mt-2" style={{ background: "#F8FAFC", border: "1px solid #BFDBFE", fontSize: 11 }}>
            <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-xs flex items-center gap-1.5" style={{ color: "#1E293B" }}><Microscope style={{ width: 12, height: 12, display: "inline" }} /> Score Breakdown: {label}</div>
                <button onClick={onClose} className="text-gray-400 text-xs hover:text-gray-700">✕</button>
            </div>
            <div className="mb-2 px-2 py-1 rounded text-xs font-mono" style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: 9 }}>{breakdown.formula}</div>
            <div className="flex items-center gap-3 mb-3 text-xs">
                <span style={{ color: breakdown.trendDir === "up" ? "#EF4444" : "#22C55E" }}>
                    {breakdown.trendDir === "up" ? "↑" : "↓"} +{breakdown.trendDelta} last 30d
                </span>
                <span style={{ color: "#64748B" }}><Trophy style={{ width: 11, height: 11, display: "inline", verticalAlign: "middle", marginRight: 2 }} />Rank: <strong>{breakdown.globalRank}</strong></span>
                <span style={{ color: "#94A3B8" }}>Updated: {now}</span>
            </div>
            <div className="space-y-2">
                {breakdown.components.map((c, i) => (
                    <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                            <div style={{ color: "#374151", fontWeight: 500 }}>{c.name} <span style={{ color: "#94A3B8" }}>({c.weight}%)</span></div>
                            <div className="flex items-center gap-2">
                                <span style={{ color: "#1E293B", fontWeight: 700 }}>{c.valueLabel}</span>
                                <span className="px-1 py-0.5 rounded" style={{ background: "#F1F5F9", color: "#64748B", fontSize: 8 }}>{c.source}</span>
                            </div>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: "#E2E8F0" }}>
                            <div style={{ width: `${c.weight}%`, height: "100%", borderRadius: 2, background: "#3B82F6" }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── News Causal Chain ────────────────────────────────────────────────────────
const CAUSAL_CHAINS: Record<number, { step: string; color: string }[]> = {
    0: [
        { step: "Naval Drills ↑", color: "#EF4444" },
        { step: "Taiwan Strait Tension ↑", color: "#F97316" },
        { step: "LNG Shipping Risk ↑", color: "#EAB308" },
        { step: "Energy Import Cost ↑", color: "#F97316" },
        { step: "India Trade Deficit ↑", color: "#EF4444" },
    ],
    1: [
        { step: "Brent ↑ $88", color: "#F97316" },
        { step: "Import Bill ↑ +$12B", color: "#EAB308" },
        { step: "Trade Deficit ↑", color: "#F97316" },
        { step: "Inflation ↑ 5.8%", color: "#EF4444" },
        { step: "Fiscal Pressure ↑", color: "#B91C1C" },
    ],
    2: [
        { step: "Chip Controls ↑", color: "#7C3AED" },
        { step: "Semiconductor Import ↑", color: "#EF4444" },
        { step: "Electronics Cost ↑", color: "#F97316" },
        { step: "Manufacturing Slowdown", color: "#EAB308" },
        { step: "GDP Growth −0.3%", color: "#EF4444" },
    ],
    3: [
        { step: "Monsoon Deficit −22%", color: "#3B82F6" },
        { step: "Kharif Output −15%", color: "#F97316" },
        { step: "Food Inflation ↑", color: "#EF4444" },
        { step: "Rural Distress ↑", color: "#B91C1C" },
        { step: "PM-KISAN pressure ↑", color: "#EF4444" },
    ],
};

const DOMAIN_TAGS: Record<number, string[]> = {
    0: ["Defense", "Trade", "Energy"], 1: ["Energy", "Trade", "Fiscal"],
    2: ["Technology", "Trade", "Manufacturing"], 3: ["Climate", "Agriculture", "Social"],
};

const SYS_IMPACT: number[] = [82, 74, 68, 61, 55];
const PROPAGATION: ("High" | "Moderate" | "Low")[] = ["High", "Moderate", "High", "Low", "Moderate"];
const PROP_COLORS: Record<string, string> = { "High": "#EF4444", "Moderate": "#F97316", "Low": "#22C55E" };

export function NewsItemEnhancements({ index }: { index: number }) {
    const [showChain, setShowChain] = useState(false);
    const chain = CAUSAL_CHAINS[index % 4] ?? CAUSAL_CHAINS[0];
    const domains = DOMAIN_TAGS[index % 4] ?? ["Trade"];
    const impact = SYS_IMPACT[index % 5];
    const propagation = PROPAGATION[index % 5];

    return (
        <div className="mt-1.5">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: impact >= 75 ? "#FEE2E2" : "#FFEDD5", color: impact >= 75 ? "#B91C1C" : "#C2410C" }}>
                    Systemic Impact: {impact}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: `${PROP_COLORS[propagation]}20`, color: PROP_COLORS[propagation] }}>
                    {propagation} Propagation
                </span>
                {domains.map(d => (
                    <span key={d} className="text-xs px-1 py-0.5 rounded" style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: 9 }}>{d}</span>
                ))}
                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "#F1F5F9", color: "#64748B", fontSize: 9 }}>
                    Priority #{index + 1}
                </span>
            </div>
            <button onClick={() => setShowChain(v => !v)} className="mt-1 text-xs font-medium" style={{ color: "#1E40AF" }}>
                {showChain ? "▲ Hide Causal Chain" : "▼ View Causal Chain"}
            </button>
            {showChain && (
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    {chain.map((s, ci) => (
                        <div key={ci} className="flex items-center gap-1">
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>{s.step}</span>
                            {ci < chain.length - 1 && <span style={{ color: "#94A3B8", fontSize: 10 }}>→</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Relationship Metric Row (with sparkline + trend + rank) ─────────────────
export function RelMetricRow({ label, score, simScore, color, rank, avg, simulated }: {
    label: string; score: number; simScore: number; color: string; rank: string; avg: number; simulated: boolean;
}) {
    const val = simulated ? simScore : score;
    const trendDelta = score - avg;
    const bars = [score - 8, score - 3, score + 2, score - 1, score + 4, score - 2, val].map(v => Math.max(5, Math.min(100, v)));

    return (
        <div className="mb-3">
            <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                    <span style={{ color: "#22C55E", fontSize: 10 }}>✓</span>
                    <span className="text-xs" style={{ color: "#374151" }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color: trendDelta > 0 ? "#EF4444" : "#22C55E" }}>
                        {trendDelta > 0 ? "↑" : "↓"} {Math.abs(trendDelta).toFixed(0)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-end gap-0.5" style={{ height: 14 }}>
                        {bars.map((b, i) => <div key={i} style={{ width: 3, height: `${(b / 100) * 100}%`, background: i === 6 ? color : "#CBD5E1", borderRadius: 1 }} />)}
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#1E293B" }}>{val}%</span>
                    <span className="text-xs" style={{ color: "#94A3B8" }}>•••</span>
                </div>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "#F1F5F9" }}>
                <div style={{ width: `${val}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.8s ease" }} />
            </div>
            <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs" style={{ color: "#94A3B8", fontSize: 9 }}>G20 Avg: {avg}%</span>
                <span className="text-xs" style={{ color: "#94A3B8", fontSize: 9 }}>Rank: {rank}</span>
            </div>
        </div>
    );
}
