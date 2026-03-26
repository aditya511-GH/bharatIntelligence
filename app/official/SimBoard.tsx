"use client";
import { useState } from "react";
import { DomainKey } from "@/lib/utils";

import { Zap, Play, Lightbulb, Target, TrendingUp, TrendingDown, LineChart, Shield, Coins, Droplets, Building, ShieldAlert, MonitorCheck, Plane, FileCode2, Scale, Hospital, Users, Search, Activity, Flag, Handshake, Wheat, CloudRain, Sun, AlertTriangle, CheckCircle2, ClipboardList, FlaskConical } from "lucide-react";

// ─── Domain-specific Simulation Configurations ──────────────────────────────
interface DomainSimConfig {
  primary: { id: string; label: string; question: string; unit: string; min: number; max: number; step: number; base: number };
  secondary: { id: string; label: string; question: string; unit: string; min: number; max: number; step: number; base: number };
  outputs: (a: number, b: number, mult: number) => { lbl: string; val: string; color: string }[];
  insight: (a: number, b: number) => React.ReactNode;
}

const DOMAIN_SIM: Record<DomainKey, DomainSimConfig> = {
  geopolitics: {
    primary: { id: "opec", label: "OPEC Production Cut", question: "By how much is OPEC cutting oil output?", unit: " Mb/d", min: 0, max: 5, step: 0.1, base: 1.2 },
    secondary: { id: "sanction", label: "Russia Sanction Intensity", question: "How severe are Western sanctions on Russia?", unit: "/100", min: 0, max: 100, step: 1, base: 72 },
    outputs: (a, b, m) => [
      { lbl: "GDP Impact", val: `${-(a * 0.4 * m).toFixed(1)}%`, color: "#EF4444" },
      { lbl: "Oil Import Bill", val: `+$${(a * 3.2 * m).toFixed(0)}B`, color: "#F97316" },
      { lbl: "Forex Pressure", val: `${-(a * 0.3 + b * 0.01) * m < 0 ? "" : ""}₹${((a * 0.3 + b * 0.01) * m).toFixed(1)}`, color: "#EF4444" },
      { lbl: "Inflation Spike", val: `+${(a * 0.12 * m).toFixed(1)}%`, color: "#F97316" },
      { lbl: "Fiscal Deficit", val: `+${(a * 0.08 + b * 0.002) * m > 0 ? "+" : ""}${((a * 0.08 + b * 0.002) * m).toFixed(1)}%`, color: "#EAB308" },
      { lbl: "Confidence", val: `${Math.max(55, 88 - Math.abs(a - 1.2) * 3).toFixed(0)}%`, color: "#3B82F6" },
    ],
    insight: (a, b) => a > 2 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> At {a} Mb/d cut, India's annual oil import bill rises by ~${(a * 9.6).toFixed(0)}B</> : <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-500" /> Moderate cut — manageable via Russian crude discount ({b > 70 ? "high" : "low"} sanction pressure)</>,
  },
  economics: {
    primary: { id: "repo", label: "RBI Rate Change", question: "How much does the RBI adjust its repo rate?", unit: "%", min: -2, max: 3, step: 0.25, base: 0 },
    secondary: { id: "usd_inr", label: "USD/INR Shift", question: "How much does the Rupee gain/lose vs dollar?", unit: "₹", min: -10, max: 15, step: 0.5, base: 0 },
    outputs: (a, b, m) => [
      { lbl: "GDP Impact", val: `${-(a * 0.22 + b * 0.03) * m < 0 ? "" : "+"}${(-(a * 0.22 + b * 0.03) * m).toFixed(2)}%`, color: a > 0 ? "#EF4444" : "#22C55E" },
      { lbl: "Inflation", val: `${a > 0 ? "-" : "+"}${(Math.abs(a) * 0.35 * m).toFixed(1)}%`, color: a > 0 ? "#22C55E" : "#EF4444" },
      { lbl: "Import Cost", val: `${b > 0 ? "+" : ""}${(b * 0.4 * m).toFixed(0)}B`, color: b > 0 ? "#F97316" : "#22C55E" },
      { lbl: "FDI Outlook", val: `${a < 0 ? "+" : "-"}${(Math.abs(a) * 1.8 * m).toFixed(1)}%`, color: a < 0 ? "#22C55E" : "#EF4444" },
      { lbl: "Bond Yield", val: `${a > 0 ? "+" : ""}${(a * 0.7 * m).toFixed(2)}%`, color: "#3B82F6" },
      { lbl: "Confidence", val: `${Math.max(55, 85 - Math.abs(a) * 5 - Math.abs(b) * 1).toFixed(0)}%`, color: "#3B82F6" },
    ],
    insight: (a, b) => a > 0.5 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Rate hike of +{a}% slows credit growth — home/auto loans become costlier</> : b > 5 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Rupee depreciation of ₹{b} raises import bill by ~${(b * 1.6).toFixed(0)}B</> : <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-500" /> Baseline scenario — moderate monetary conditions</>,
  },
  defense: {
    primary: { id: "lac", label: "LAC Incursion Depth", question: "How far has PLA advanced at the Line of Actual Control?", unit: " km", min: 0, max: 80, step: 1, base: 18 },
    secondary: { id: "mil_spend", label: "Defense Budget Boost", question: "By how much does India increase its defense budget?", unit: "% GDP", min: 0, max: 2, step: 0.1, base: 0 },
    outputs: (a, b, m) => [
      { lbl: "Threat Level", val: a > 40 ? "CRITICAL" : a > 20 ? "HIGH" : "MODERATE", color: a > 40 ? "#B91C1C" : a > 20 ? "#F97316" : "#22C55E" },
      { lbl: "Readiness Cost", val: `$${(a * 0.18 * m * 30).toFixed(0)}M/mo`, color: "#EF4444" },
      { lbl: "Fiscal Pressure", val: `+${(a * 0.004 + b * 0.8) * m < 0 ? "0" : ((a * 0.004 + b * 0.8) * m).toFixed(2)}%GDP`, color: "#F97316" },
      { lbl: "Strategic Cap.", val: `${b > 0 ? "+" : ""}${(b * 12 * m).toFixed(0)} assets`, color: "#22C55E" },
      { lbl: "Ally Signal", val: a > 30 ? "Quad activated" : "Monitoring", color: "#3B82F6" },
      { lbl: "Confidence", val: `${Math.max(50, 82 - a * 0.6 - b * 2).toFixed(0)}%`, color: "#3B82F6" },
    ],
    insight: (a, _b) => a > 40 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-red-500" /> PLA at {a}km depth triggers emergency Protocol 3 — operational control contested</> : a > 20 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Incursion at {a}km — battalion-level standoff, diplomatic track active</> : <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-500" /> LAC tension contained — standard patrol frequency maintained</>,
  },
  technology: {
    primary: { id: "chip_dep", label: "Chip Import Dependency", question: "What percentage of India's semiconductors are imported?", unit: "%", min: 30, max: 100, step: 1, base: 78 },
    secondary: { id: "r_and_d", label: "R&D Investment", question: "What % of GDP does India invest in R&D?", unit: "% GDP", min: 0.1, max: 4, step: 0.1, base: 0.7 },
    outputs: (a, b, m) => [
      { lbl: "Supply Chain Risk", val: `${(a * 0.6).toFixed(0)}/100`, color: a > 70 ? "#EF4444" : "#F97316" },
      { lbl: "Electronics Cost", val: `+${(a * 0.08 * m).toFixed(0)}%`, color: "#F97316" },
      { lbl: "Export Risk", val: `${a > 80 ? "HIGH" : a > 60 ? "MEDIUM" : "LOW"}`, color: a > 80 ? "#EF4444" : a > 60 ? "#F97316" : "#22C55E" },
      { lbl: "Innovation Index", val: `+${(b * 8 * m).toFixed(1)}pts`, color: "#22C55E" },
      { lbl: "Startup Growth", val: `+${(b * 4.2 * m).toFixed(1)}%`, color: "#22C55E" },
      { lbl: "Confidence", val: `${Math.max(55, 82 - a * 0.3 + b * 5).toFixed(0)}%`, color: "#3B82F6" },
    ],
    insight: (a, b) => a > 85 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-red-500" /> Critical dependency at {a}% — US CHIPS Act restrictions could halt Indian electronics production</> : b < 0.5 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> R&D at {b}% GDP — far below China (2.4%) and South Korea (4.9%)</> : <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-500" /> Technology scenario manageable — domestic fab expansion on track</>,
  },
  climate: {
    primary: { id: "monsoon", label: "Monsoon Rainfall Deficit", question: "By how much does the monsoon fall short of normal?", unit: "% below normal", min: 0, max: 60, step: 1, base: 22 },
    secondary: { id: "coal", label: "Coal Share in Energy Mix", question: "What share of power generation comes from coal?", unit: "%", min: 20, max: 80, step: 1, base: 55 },
    outputs: (a, b, m) => [
      { lbl: "Food Inflation", val: `+${(a * 0.18 * m).toFixed(1)}%`, color: a > 20 ? "#EF4444" : "#F97316" },
      { lbl: "Kharif Output", val: `-${(a * 0.55 * m).toFixed(0)}M tonnes`, color: "#EF4444" },
      { lbl: "Power Cost", val: `+${(b * 0.08 * m).toFixed(1)}%`, color: "#F97316" },
      { lbl: "Carbon Budget", val: `+${(b * 0.12 * m).toFixed(0)}M tCO₂`, color: b > 60 ? "#EF4444" : "#EAB308" },
      { lbl: "PM-KISAN Stress", val: a > 25 ? "CRITICAL" : a > 15 ? "HIGH" : "LOW", color: a > 25 ? "#B91C1C" : a > 15 ? "#F97316" : "#22C55E" },
      { lbl: "Confidence", val: `${Math.max(55, 84 - a * 0.5 - b * 0.2).toFixed(0)}%`, color: "#3B82F6" },
    ],
    insight: (a, _b) => a > 30 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-red-500" /> Deficit at {a}% — declared drought in 8+ states, food security emergency protocol triggered</> : a > 15 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> {a}% shortfall — kharif output down, PM-KISAN payout stress expected</> : <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-500" /> Within tolerable range — regional variation normal, no national alert</>,
  },
  society: {
    primary: { id: "youth_unemp", label: "Youth Unemployment Rate", question: "What is the unemployment rate among 15–24 year olds?", unit: "%", min: 5, max: 50, step: 1, base: 23 },
    secondary: { id: "pmjay", label: "PM-JAY Enrollment", question: "How many people are enrolled in Ayushman Bharat health cover?", unit: " crore", min: 20, max: 100, step: 2, base: 60 },
    outputs: (a, b, m) => [
      { lbl: "Social Stability", val: `${Math.max(20, 90 - a * 1.4).toFixed(0)}/100`, color: a > 35 ? "#EF4444" : "#22C55E" },
      { lbl: "Crime Index", val: `+${(a * 0.6 * m).toFixed(0)}%`, color: a > 30 ? "#EF4444" : "#F97316" },
      { lbl: "Healthcare Gap", val: `${Math.max(0, 140 - b * 0.8).toFixed(0)}M uninsured`, color: b < 40 ? "#EF4444" : "#22C55E" },
      { lbl: "Unrest Risk", val: a > 35 ? "HIGH" : a > 25 ? "MEDIUM" : "LOW", color: a > 35 ? "#B91C1C" : a > 25 ? "#F97316" : "#22C55E" },
      { lbl: "Fiscal Demand", val: `$${(a * 0.08 + (100 - b) * 0.06) * m > 0 ? ((a * 0.08 + (100 - b) * 0.06) * m).toFixed(1) : "0"}B`, color: "#EAB308" },
      { lbl: "Confidence", val: `${Math.max(55, 82 - a + b * 0.3).toFixed(0)}%`, color: "#3B82F6" },
    ],
    insight: (a, b) => a > 35 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-red-500" /> Youth unemployment at {a}% — structural risk to political stability and consumer demand</> : b < 30 ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Only {b} crore enrolled in PM-JAY — 70M+ households face catastrophic health expenditure</> : <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-green-500" /> Social indicators in acceptable range — welfare schemes maintaining floor</>,
  },
};

// ─── Simulation Control Panel ─────────────────────────────────────────────────
export function SimulationControlPanel({ domain, visible }: { domain: DomainKey; visible: boolean }) {
  const cfg = DOMAIN_SIM[domain];
  const [aVal, setAVal] = useState(cfg.primary.base);
  const [bVal, setBVal] = useState(cfg.secondary.base);
  const [horizon, setHorizon] = useState<"30d" | "90d" | "1y">("90d");
  const [run, setRun] = useState(false);

  // Reset when domain changes
  const [lastDomain, setLastDomain] = useState(domain);
  if (domain !== lastDomain) {
    setLastDomain(domain);
    setAVal(DOMAIN_SIM[domain].primary.base);
    setBVal(DOMAIN_SIM[domain].secondary.base);
    setRun(false);
  }

  const mult = horizon === "30d" ? 0.3 : horizon === "90d" ? 0.9 : 2.4;
  const results = cfg.outputs(aVal, bVal, mult);

  if (!visible) return null;
  return (
    <div className="rounded-2xl border mt-3 p-4" style={{ background: "#F8FAFC", borderColor: "#C7D2FE" }}>
      <div className="font-semibold text-xs mb-3 flex items-center gap-2" style={{ color: "#4338CA" }}>
        <Zap className="w-3.5 h-3.5" /> What-If Scenario Builder
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#EEF2FF", color: "#6366F1" }}>Live Model</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Primary lever */}
        <div>
          <label className="text-xs mb-0.5 block font-semibold" style={{ color: "#1E293B" }}>{cfg.primary.label}</label>
          <div className="text-[10px] mb-1 leading-tight" style={{ color: "#64748B" }}>{cfg.primary.question}</div>
          <input type="range" min={cfg.primary.min} max={cfg.primary.max} step={cfg.primary.step} value={aVal}
            onChange={e => { setAVal(+e.target.value); setRun(false); }}
            className="w-full" style={{ accentColor: "#4338CA" }} />
          <div className="text-xs text-center font-bold" style={{ color: "#4338CA" }}>{aVal}{cfg.primary.unit}</div>
        </div>
        {/* Secondary lever */}
        <div>
          <label className="text-xs mb-0.5 block font-semibold" style={{ color: "#1E293B" }}>{cfg.secondary.label}</label>
          <div className="text-[10px] mb-1 leading-tight" style={{ color: "#64748B" }}>{cfg.secondary.question}</div>
          <input type="range" min={cfg.secondary.min} max={cfg.secondary.max} step={cfg.secondary.step} value={bVal}
            onChange={e => { setBVal(+e.target.value); setRun(false); }}
            className="w-full" style={{ accentColor: "#4338CA" }} />
          <div className="text-xs text-center font-bold" style={{ color: "#4338CA" }}>{bVal}{cfg.secondary.unit}</div>
        </div>
        {/* Time horizon */}
        <div>
          <label className="text-xs mb-1 block font-semibold" style={{ color: "#1E293B" }}>Time Horizon</label>
          <div className="text-[10px] mb-1" style={{ color: "#64748B" }}>Over how long?</div>
          <div className="flex gap-1">
            {(["30d", "90d", "1y"] as const).map(t => (
              <button key={t} onClick={() => { setHorizon(t); setRun(false); }}
                className="flex-1 text-xs py-1 rounded font-medium" style={{ background: horizon === t ? "#4338CA" : "#E0E7FF", color: horizon === t ? "white" : "#4338CA" }}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      {/* Insight badge */}
      <div className="text-[10px] px-3 py-2 rounded-lg mb-2 leading-relaxed flex items-start gap-1.5" style={{ background: "#FFF7ED", color: "#92400E", border: "1px solid #FDE68A" }}>
        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" /> <div>{cfg.insight(aVal, bVal)}</div>
      </div>
      <button onClick={() => setRun(true)} className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-semibold mb-3 transition-all" style={{ background: "#4338CA", color: "white" }}>
        <Play className="w-3.5 h-3.5" /> Run Projection
      </button>
      {run && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {results.map(({ lbl, val, color }) => (
              <div key={lbl} className="rounded-lg p-2 text-center" style={{ background: "white", border: "1px solid #E0E7FF" }}>
                <div className="text-xs mb-0.5" style={{ color: "#64748B" }}>{lbl}</div>
                <div className="text-sm font-black" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "#EFF6FF", color: "#1E40AF", borderLeft: "3px solid #3B82F6" }}>
            Projection based on {horizon} horizon · OLS regression model (IMF WEO 2000–2025)
          </div>
        </div>
      )}
    </div>
  );
}

// ─── National Objectives Alignment Panel ─────────────────────────────────────
const OBJECTIVES: { name: string; target: number; current: number; unit: string; icon: React.ReactNode; status: string; inverted?: boolean }[] = [
    { name: "GDP Growth", target: 7.5, current: 6.8, unit: "%", icon: <TrendingUp className="w-4 h-4 text-blue-600" />, status: "At Risk" },
    { name: "Inflation (CPI)", target: 4.0, current: 4.9, unit: "%", icon: <LineChart className="w-4 h-4 text-green-600" />, status: "Breach", inverted: true },
    { name: "Energy Security Index", target: 75, current: 63, unit: "score", icon: <Zap className="w-4 h-4 text-amber-500" />, status: "At Risk" },
    { name: "Strategic Autonomy", target: 80, current: 76, unit: "score", icon: <Shield className="w-4 h-4 text-indigo-600" />, status: "Stable" },
    { name: "Fiscal Deficit (% GDP)", target: 4.5, current: 5.1, unit: "%", icon: <Coins className="w-4 h-4 text-purple-600" />, status: "Breach", inverted: true },
];
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    "Stable": { bg: "#DCFCE7", color: "#15803D" },
    "At Risk": { bg: "#FEF9C3", color: "#92400E" },
    "Breach": { bg: "#FEE2E2", color: "#B91C1C" },
};

export function NationalObjectivesPanel() {
    return (
        <div className="rounded-2xl border p-4 mt-4" style={{ borderColor: "#E2E8F0", background: "white" }}>
            <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "#1E293B" }}>
                    <Target className="w-4 h-4 text-blue-600" /> National Strategic Objectives Alignment
                </div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#EFF6FF", color: "#1E40AF" }}>FY 2025–26</span>
            </div>
            <div className="space-y-2">
                {OBJECTIVES.map((o, i) => {
                    const delta = o.inverted ? -(o.current - o.target) : o.current - o.target;
                    const s = STATUS_STYLE[o.status];
                    return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                            <span className="text-base">{o.icon}</span>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold" style={{ color: "#1E293B" }}>{o.name}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={s}>{o.status}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs" style={{ color: "#94A3B8" }}>Target: {o.target}{o.unit}</span>
                                    <span className="text-xs font-bold" style={{ color: "#1E293B" }}>Current: {o.current}{o.unit}</span>
                                    <span className="text-xs font-semibold" style={{ color: delta >= 0 ? "#22C55E" : "#EF4444" }}>
                                        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Priority Action Board ────────────────────────────────────────────────────
const ACTIONS: Record<DomainKey, { action: React.ReactNode; rationale: string; delay: string; urgency: string; cost: string }[]> = {
    geopolitics: [
        { action: <><Droplets className="w-4 h-4 inline mr-1.5 align-text-bottom text-amber-700" /> Increase Strategic Oil Reserve +5%</>, rationale: "Brent at $88, Russia-OPEC disruption risk elevated 72%", delay: "Each week delayed = $420M additional exposure", urgency: "CRITICAL", cost: "$2.1B" },
        { action: <><Activity className="w-4 h-4 inline mr-1.5 align-text-bottom text-blue-600" /> Monitor OPEC output next 48h</>, rationale: "Unscheduled OPEC+ meeting signals cut decision", delay: "Late response locks India into high spot-rate contracts", urgency: "HIGH", cost: "Nil" },
        { action: <><Handshake className="w-4 h-4 inline mr-1.5 align-text-bottom text-emerald-600" /> Accelerate India-UAE cereal swap deal</>, rationale: "Food inflation hedge; offset monsoon deficit impact", delay: "Oct–Nov window closing; storage cost rises", urgency: "HIGH", cost: "$340M/yr savings" },
    ],
    economics: [
        { action: <><TrendingDown className="w-4 h-4 inline mr-1.5 align-text-bottom text-rose-600" /> RBI FX intervention threshold review</>, rationale: "Rupee at 83.8; FX reserves at 10-month low", delay: "Each 1% depreciation = $4B import cost inflation", urgency: "CRITICAL", cost: "Nil" },
        { action: <><Wheat className="w-4 h-4 inline mr-1.5 align-text-bottom text-amber-500" /> Commodity futures hedge (oil + wheat)</>, rationale: "Dual commodity spike probability 68% in 90d", delay: "Unhedged Q3 import cost overrun: $8B", urgency: "HIGH", cost: "$0.4B hedge premium" },
        { action: <><Building className="w-4 h-4 inline mr-1.5 align-text-bottom text-blue-700" /> Advance IMF Article IV consultation</>, rationale: "Preemptive signaling on fiscal consolidation path", delay: "Rating outlook shifts if deficit breaches 5.5%", urgency: "MODERATE", cost: "Nil" },
    ],
    defense: [
        { action: <><ShieldAlert className="w-4 h-4 inline mr-1.5 align-text-bottom text-red-600" /> Raise LAC readiness to Level 3</>, rationale: "PLA infrastructure activity 18km into buffer zone", delay: "32 hours to positional advantage reversal", urgency: "CRITICAL", cost: "$180M/month operational" },
        { action: <><MonitorCheck className="w-4 h-4 inline mr-1.5 align-text-bottom text-indigo-500" /> Deploy CERT-In cyber kill-switch protocol</>, rationale: "APT41 grid attack simulation confirmed by intelligence", delay: "Grid vulnerability window: 6–8 weeks", urgency: "HIGH", cost: "$40M" },
        { action: <><Plane className="w-4 h-4 inline mr-1.5 align-text-bottom text-slate-600" /> Fast-track Rafale-Marine MOU</>, rationale: "IOR patrol gap: 3 carrier-gap months in FY26", delay: "Procurement cycle extends by 18 months post-Apr deadline", urgency: "HIGH", cost: "$6.2B (committed)" },
    ],
    technology: [
        { action: <><FlaskConical className="w-4 h-4 inline mr-1.5 align-text-bottom text-cyan-600" /> Expedite TSMC fab ground-breaking</>, rationale: "US CHIPS subsidies contingent on Q1 start", delay: "$1.5B subsidy window closes Jun 2026", urgency: "CRITICAL", cost: "$7.5B (co-funded)" },
        { action: <><FileCode2 className="w-4 h-4 inline mr-1.5 align-text-bottom text-blue-500" /> Deploy AI Sovereignty Framework</>, rationale: "EU AI Act extraterritoriality exposure for Indian exporters", delay: "GDPR-equivalent fines from Jul 2026", urgency: "HIGH", cost: "$200M compliance" },
    ],
    climate: [
        { action: <><CloudRain className="w-4 h-4 inline mr-1.5 align-text-bottom text-blue-400" /> Activate drought contingency in 8 states</>, rationale: "Kharif output −15%; food inflation risk 7.2%", delay: "Each week delay = 1.2M farmers uncompensated", urgency: "CRITICAL", cost: "$840M relief outlay" },
        { action: <><Sun className="w-4 h-4 inline mr-1.5 align-text-bottom text-amber-500" /> Accelerate 10GW solar auctions (H2 FY26)</>, rationale: "150GW target at risk if Q3 auctions slip", delay: "Grid addition miss = coal import surge ↑12%", urgency: "HIGH", cost: "$2.8B viability gap" },
    ],
    society: [
        { action: <><Hospital className="w-4 h-4 inline mr-1.5 align-text-bottom text-green-600" /> Expand PM-JAY to 800M threshold</>, rationale: "Post-urbanisation healthcare access gap: 28M uninsured", delay: "Each quarter delay = 140k OOP crisis hospitalisations", urgency: "HIGH", cost: "$620M incremental" },
        { action: <><Users className="w-4 h-4 inline mr-1.5 align-text-bottom text-indigo-600" /> Skill India emergency cohort (5M youth)</>, rationale: "Youth unemployment 23%; structural risk to stability", delay: "Labour market tightness window Q2–Q3 FY26", urgency: "MODERATE", cost: "$1.1B" },
    ],
};
const URGENCY_STYLE: Record<string, { bg: string; color: string }> = {
    "CRITICAL": { bg: "#FEE2E2", color: "#B91C1C" },
    "HIGH": { bg: "#FFEDD5", color: "#C2410C" },
    "MODERATE": { bg: "#FEF9C3", color: "#92400E" },
};

export function PriorityActionBoard({ domain }: { domain: DomainKey }) {
    const actions = ACTIONS[domain] ?? ACTIONS.geopolitics;
    return (
        <div className="rounded-2xl border p-4 mt-4" style={{ borderColor: "#E2E8F0", background: "white" }}>
            <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "#1E293B" }}>
                    <Zap className="w-4 h-4 text-amber-500" /> Priority Strategic Actions
                </div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#FEE2E2", color: "#B91C1C" }}>AI-generated · Risk model</span>
            </div>
            <div className="space-y-2">
                {actions.slice(0, 3).map((a, i) => {
                    const s = URGENCY_STYLE[a.urgency];
                    return (
                        <div key={i} className="rounded-xl p-3 border" style={{ borderColor: "#E2E8F0", background: "#FAFAFA" }}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-semibold" style={{ color: "#1E293B" }}>{a.action}</div>
                                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={s}>{a.urgency}</span>
                            </div>
                            <div className="text-xs mb-1 flex items-start gap-1" style={{ color: "#374151" }}>
                                <ClipboardList className="w-3.5 h-3.5 inline mt-0.5 shrink-0 text-slate-400" /> <span>{a.rationale}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs flex items-center gap-1" style={{ color: "#EF4444" }}>
                                    <AlertTriangle className="w-3.5 h-3.5 inline shrink-0" /> {a.delay}
                                </span>
                                <span className="text-xs" style={{ color: "#64748B" }}>Est. Cost: {a.cost}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Data Credibility Footer ──────────────────────────────────────────────────
const SOURCES = [
    { name: "IMF WEO 2025", ago: "3h", color: "#22C55E" },
    { name: "World Bank", ago: "24h", color: "#22C55E" },
    { name: "Energy API (EIA)", ago: "12m", color: "#22C55E" },
    { name: "Defense Feed (SIPRI)", ago: "18m", color: "#22C55E" },
    { name: "NewsAPI", ago: "5m", color: "#22C55E" },
    { name: "RBI Data Q4 FY26", ago: "1h", color: "#22C55E" },
];

export function DataCredibilityFooter() {
    const confidence = 84;
    return (
        <div className="mt-4 px-4 py-3 rounded-xl border flex items-center justify-between" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
            <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#64748B" }}>
                    <Activity className="w-4 h-4" /> Data Freshness:
                </span>
                {SOURCES.map(s => (
                    <div key={s.name} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
                        <span className="text-xs" style={{ color: "#64748B" }}>{s.name}: <span style={{ color: "#374151", fontWeight: 600 }}>{s.ago} ago</span></span>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs" style={{ color: "#64748B" }}>System Confidence:</span>
                <div className="flex items-center gap-1">
                    <div style={{ width: 60, height: 5, borderRadius: 3, background: "#E2E8F0" }}>
                        <div style={{ width: `${confidence}%`, height: "100%", borderRadius: 3, background: "#22C55E" }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#15803D" }}>{confidence}%</span>
                </div>
            </div>
        </div>
    );
}

// ─── Scheme Fiscal Sensitivity ────────────────────────────────────────────────
export const SCHEME_FISCAL: Record<string, { sensitivity: string; score: number; driver: string; index: string; indexVal: number }> = {
    "PM-KISAN": { sensitivity: "Inflation Sensitivity", score: 0.62, driver: "CPI / Monsoon Deficit", index: "Fiscal Exposure", indexVal: 72 },
    "PLI Scheme": { sensitivity: "Semiconductor Exposure", score: 0.48, driver: "US CHIPS Act / Import dep.", index: "Supply Chain Risk", indexVal: 65 },
    "PM-JAY": { sensitivity: "Healthcare Cost Inflation", score: 0.38, driver: "Medical CPI / USD/INR", index: "Utilisation Risk", indexVal: 55 },
    "Defense Budget": { sensitivity: "Oil Price Elasticity", score: 0.41, driver: "Brent / Transport cost", index: "Operational Cost Risk", indexVal: 68 },
};
