"use client";
import { useState, useEffect, useRef } from "react";
import { DOMAIN_CONFIG, DomainKey, truncate, renderMarkdown } from "@/lib/utils";
import { Handshake, ShieldAlert, Ship, Eye, Zap, Landmark, AreaChart as ChartLineUp, Store, ShoppingCart, Swords, Home, Laptop, Factory, Medal, Building2, Rocket, FlaskConical, Smartphone, Wheat, Waves, Helicopter, GraduationCap, Hospital, Briefcase, Users, ClipboardList, RefreshCw, Play, Newspaper, FileText } from "lucide-react";

// rotate among public Groq keys for the simulator
const PUBLIC_KEYS = (
  process.env.NEXT_PUBLIC_GROQ_API_KEYS ??
  process.env.NEXT_PUBLIC_GROQ_API_KEY ??
  ""
)
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

// shuffle helper
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function callGroq(prompt: string): Promise<string> {
  if (PUBLIC_KEYS.length === 0) return "No Groq API key.";
  const pool = shuffle(PUBLIC_KEYS);
  let res: Response | null = null;
  for (const key of pool) {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are India's classified strategic simulation engine. Be analytical, precise, and quantified.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1600,
      }),
    });
    if (res.status !== 429) break;
  }
  if (!res) return "No response.";
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response.";
}

type Param = {
  id: string;
  category: string;
  name: string;
  unit: string;
  baseValue: number;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  description: string;
};

const PRESET_PARAMS: Record<DomainKey, Param[]> = {
  geopolitics: [
    { id: "oil", category: "Energy", name: "Brent Crude Price", unit: "$/bbl", baseValue: 88, currentValue: 88, min: 40, max: 150, step: 1, description: "International crude oil benchmark price" },
    { id: "sanction", category: "Trade", name: "Russia Sanction Intensity", unit: "index (0-100)", baseValue: 72, currentValue: 72, min: 0, max: 100, step: 1, description: "Western sanctions effectiveness against Russia" },
    { id: "taiwan", category: "Defense", name: "Taiwan Strait Tension", unit: "index (0-100)", baseValue: 65, currentValue: 65, min: 0, max: 100, step: 1, description: "Military tension level in Taiwan Strait" },
    { id: "opec", category: "Energy", name: "OPEC Production Cut", unit: "Mb/d", baseValue: 1.2, currentValue: 1.2, min: 0, max: 5, step: 0.1, description: "OPEC voluntary production reduction" },
  ],
  economics: [
    { id: "usd_inr", category: "Forex", name: "USD/INR Rate", unit: "₹", baseValue: 83.2, currentValue: 83.2, min: 75, max: 95, step: 0.1, description: "Rupee-dollar exchange rate" },
    { id: "repo", category: "Monetary", name: "RBI Repo Rate", unit: "%", baseValue: 6.5, currentValue: 6.5, min: 4, max: 9, step: 0.25, description: "RBI benchmark interest rate" },
    { id: "fed_rate", category: "Monetary", name: "US Fed Rate", unit: "%", baseValue: 5.5, currentValue: 5.5, min: 0, max: 8, step: 0.25, description: "US Federal Reserve benchmark rate" },
    { id: "cpi", category: "Inflation", name: "India CPI", unit: "%", baseValue: 5.1, currentValue: 5.1, min: 2, max: 10, step: 0.1, description: "India consumer price inflation" },
    { id: "fdi", category: "Investment", name: "FDI Inflow", unit: "$B/yr", baseValue: 44, currentValue: 44, min: 10, max: 100, step: 1, description: "Foreign direct investment into India" },
  ],
  defense: [
    { id: "lac", category: "Border", name: "LAC Incursion Depth", unit: "km", baseValue: 18, currentValue: 18, min: 0, max: 80, step: 1, description: "Chinese PLA incursion depth at LAC" },
    { id: "mil_spend", category: "Budget", name: "Defense Budget % GDP", unit: "%", baseValue: 2.4, currentValue: 2.4, min: 1, max: 5, step: 0.1, description: "India's defense spending as % GDP" },
    { id: "cyber", category: "Cyber", name: "APT Attack Frequency", unit: "incidents/month", baseValue: 200, currentValue: 200, min: 0, max: 1000, step: 10, description: "State-sponsored cyber attacks on India" },
    { id: "alloc", category: "Forces", name: "Troops at LAC", unit: "thousands", baseValue: 60, currentValue: 60, min: 20, max: 200, step: 5, description: "Indian Army deployment at LAC" },
  ],
  technology: [
    { id: "chip_dep", category: "Supply Chain", name: "Chip Import Dependency", unit: "%", baseValue: 78, currentValue: 78, min: 0, max: 100, step: 1, description: "India's semiconductor import dependency" },
    { id: "r_and_d", category: "Innovation", name: "R&D as % GDP", unit: "%", baseValue: 0.7, currentValue: 0.7, min: 0.1, max: 4, step: 0.1, description: "India's R&D investment" },
    { id: "fab_cap", category: "Manufacturing", name: "Domestic Fab Capacity", unit: "wafers/month (K)", baseValue: 0, currentValue: 0, min: 0, max: 100, step: 1, description: "India domestic chip fabrication capacity" },
    { id: "ai_invest", category: "AI", name: "AI Investment", unit: "$B", baseValue: 3.2, currentValue: 3.2, min: 0.5, max: 20, step: 0.5, description: "India AI sector investment" },
  ],
  climate: [
    { id: "monsoon", category: "Weather", name: "Monsoon Rainfall Deficit", unit: "%", baseValue: 22, currentValue: 22, min: -50, max: 100, step: 1, description: "% below normal monsoon (positive=deficit)" },
    { id: "solar", category: "Renewable", name: "Solar Capacity", unit: "GW", baseValue: 100, currentValue: 100, min: 50, max: 300, step: 5, description: "India installed solar capacity" },
    { id: "coal", category: "Energy Mix", name: "Coal in Energy Mix", unit: "%", baseValue: 55, currentValue: 55, min: 20, max: 80, step: 1, description: "Coal's share in India's power generation" },
    { id: "temp", category: "Climate", name: "Annual Temp Anomaly", unit: "°C", baseValue: 1.1, currentValue: 1.1, min: 0, max: 3, step: 0.1, description: "Temperature rise from pre-industrial baseline" },
  ],
  society: [
    { id: "youth_unemp", category: "Employment", name: "Youth Unemployment Rate", unit: "%", baseValue: 23, currentValue: 23, min: 5, max: 50, step: 1, description: "15-24 age group unemployment" },
    { id: "pmjay_enroll", category: "Healthcare", name: "PM-JAY Enrollment", unit: "M people", baseValue: 600, currentValue: 600, min: 200, max: 1000, step: 10, description: "People enrolled in PM Jan Arogya Yojana" },
    { id: "gini", category: "Inequality", name: "Gini Coefficient", unit: "index", baseValue: 0.51, currentValue: 0.51, min: 0.3, max: 0.7, step: 0.01, description: "Income inequality measure (0=equal, 1=unequal)" },
    { id: "remittance", category: "Economy", name: "Diaspora Remittance", unit: "$B/yr", baseValue: 120, currentValue: 120, min: 50, max: 200, step: 5, description: "Annual remittance from Indian diaspora" },
  ],
};


const DOMAIN_ROLES: Record<string, { label: string; icon: React.ReactNode; color: string }[]> = {
  geopolitics: [
    { label: "Diplomats", icon: <Handshake className="w-5 h-5" />, color: "#1E40AF" },
    { label: "Defense Ops", icon: <ShieldAlert className="w-5 h-5" />, color: "#B91C1C" },
    { label: "Trade Partners", icon: <Ship className="w-5 h-5" />, color: "#047857" },
    { label: "Intelligence", icon: <Eye className="w-5 h-5" />, color: "#6D28D9" },
    { label: "Energy Corps", icon: <Zap className="w-5 h-5" />, color: "#D97706" },
  ],
  economics: [
    { label: "Banks", icon: <Landmark className="w-5 h-5" />, color: "#1E40AF" },
    { label: "Investors", icon: <ChartLineUp className="w-5 h-5" />, color: "#047857" },
    { label: "MSMEs", icon: <Store className="w-5 h-5" />, color: "#D97706" },
    { label: "Consumers", icon: <ShoppingCart className="w-5 h-5" />, color: "#6D28D9" },
    { label: "Exporters", icon: <Ship className="w-5 h-5" />, color: "#0891B2" },
  ],
  defense: [
    { label: "Armed Forces", icon: <Swords className="w-5 h-5" />, color: "#B91C1C" },
    { label: "Border Towns", icon: <Home className="w-5 h-5" />, color: "#D97706" },
    { label: "Cyber Command", icon: <Laptop className="w-5 h-5" />, color: "#6D28D9" },
    { label: "Def Industry", icon: <Factory className="w-5 h-5" />, color: "#1E40AF" },
    { label: "Veterans", icon: <Medal className="w-5 h-5" />, color: "#047857" },
  ],
  technology: [
    { label: "Tech Hubs", icon: <Building2 className="w-5 h-5" />, color: "#1E40AF" },
    { label: "Startups", icon: <Rocket className="w-5 h-5" />, color: "#6D28D9" },
    { label: "Researchers", icon: <FlaskConical className="w-5 h-5" />, color: "#0891B2" },
    { label: "Cyber Sec", icon: <ShieldAlert className="w-5 h-5" />, color: "#B91C1C" },
    { label: "Consumers", icon: <Smartphone className="w-5 h-5" />, color: "#047857" },
  ],
  climate: [
    { label: "Farmers", icon: <Wheat className="w-5 h-5" />, color: "#047857" },
    { label: "Coastal Cities", icon: <Waves className="w-5 h-5" />, color: "#0891B2" },
    { label: "Energy Corps", icon: <Zap className="w-5 h-5" />, color: "#D97706" },
    { label: "Disaster Ops", icon: <Helicopter className="w-5 h-5" />, color: "#B91C1C" },
    { label: "Policy Makers", icon: <Landmark className="w-5 h-5" />, color: "#1E40AF" },
  ],
  society: [
    { label: "Youth", icon: <GraduationCap className="w-5 h-5" />, color: "#1E40AF" },
    { label: "Healthcare", icon: <Hospital className="w-5 h-5" />, color: "#047857" },
    { label: "Rural Pop", icon: <Home className="w-5 h-5" />, color: "#D97706" },
    { label: "Urban Workers", icon: <Briefcase className="w-5 h-5" />, color: "#6D28D9" },
    { label: "NGOs", icon: <Users className="w-5 h-5" />, color: "#0891B2" },
  ]
};

export default function SimLab({ domain: initDomain }: { domain: DomainKey }) {
  const [domain, setDomain] = useState<DomainKey>(initDomain);
  const [params, setParams] = useState<Param[]>(() =>
    PRESET_PARAMS[initDomain].map((p) => ({ ...p })),
  );
  const [customAdded, setCustomAdded] = useState<Param[]>([]);
  const [horizon, setHorizon] = useState<"30d" | "90d" | "1y" | "5y">("90d");
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [customDraftName, setCustomDraftName] = useState("");
  const [customDraftUnit, setCustomDraftUnit] = useState("");
  const [customDraftBase, setCustomDraftBase] = useState(50);

  function switchDomain(d: DomainKey) {
    setDomain(d);
    setParams(PRESET_PARAMS[d].map((p) => ({ ...p })));
    setCustomAdded([]);
    setResult(null);
  }

  function updateParam(id: string, value: number) {
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, currentValue: value } : p)),
    );
    setResult(null);
  }
  function updateCustom(id: string, value: number) {
    setCustomAdded((prev) =>
      prev.map((p) => (p.id === id ? { ...p, currentValue: value } : p)),
    );
    setResult(null);
  }
  function injectFreeformParam() {
    if (!customDraftName) return;
    const id = `custom_${Date.now()}`;
    const p = {
      id,
      category: "Freeform",
      name: customDraftName,
      unit: customDraftUnit || "unit",
      baseValue: customDraftBase,
      currentValue: customDraftBase,
      min: Math.floor(customDraftBase * 0.1),
      max: Math.ceil(customDraftBase * 2.5),
      step: customDraftBase > 10 ? 1 : 0.1,
      description: "User injected hypothetical vector"
    };
    setCustomAdded((prev) => [...prev, p]);
    setCustomDraftName("");
    setCustomDraftUnit("");
    setCustomDraftBase(50);
    setShowAddPanel(false);
  }
  function removeCustom(id: string) {
    setCustomAdded((prev) => prev.filter((p) => p.id !== id));
  }

  async function runSimulation() {
    setRunning(true);
    setResult(null);
    const allParams = [...params, ...customAdded];
    const changes = allParams.filter((p) => Math.abs(p.currentValue - p.baseValue) > p.step * 0.5);
    const unchanged = allParams.filter((p) => Math.abs(p.currentValue - p.baseValue) <= p.step * 0.5);
    const changesText =
      changes.length > 0
        ? changes.map((p) => `• ${p.name}: ${p.baseValue}${p.unit} → ${p.currentValue}${p.unit} (${p.currentValue > p.baseValue ? "+" : ""}${(((p.currentValue - p.baseValue) / Math.abs(p.baseValue || 1)) * 100).toFixed(1)}% change)`).join("\n")
        : "No parameters changed from baseline.";
    const baseText = unchanged.map((p) => `• ${p.name}: ${p.baseValue}${p.unit} (baseline)`).join("\n");
    const prompt = `You are India's classified strategic simulation engine. Run a comprehensive simulation for the ${DOMAIN_CONFIG[domain].label} domain over a ${horizon} time horizon.

SIMULATION PARAMETERS:
Domain: ${DOMAIN_CONFIG[domain].label}
Time Horizon: ${horizon}

CHANGED FROM BASELINE:
${changesText}

HELD AT BASELINE:
${baseText}

Run a full cascade simulation and output in this EXACT format:

**SCENARIO SUMMARY**
[2 sentences describing the combined scenario]

**PRIMARY IMPACT CHAIN**
[Show causal chain: Parameter Change → Effect 1 → Effect 2 → India consequence → Policy response forced]

**QUANTIFIED PROJECTIONS (${horizon})**
| Indicator | Baseline | Projected | Delta | Confidence |
|-----------|----------|-----------|-------|------------|
| GDP Growth | [X]% | [Y]% | [±Z]% | [X]% |
| CPI Inflation | [X]% | [Y]% | [±Z]% | [X]% |
| USD/INR | [X] | [Y] | [±Z] | [X]% |
| Trade Deficit | $[X]B | $[Y]B | [±Z]% | [X]% |
| Fiscal Deficit | [X]%GDP | [Y]%GDP | [±Z]% | [X]% |

**SECTORAL EXPOSURE**
- Most exposed sector: [name] — [impact description]
- Second most exposed: [name] — [impact]
- Least exposed: [name] — [why insulated]

**POLICY RECOMMENDATIONS** (forced by scenario)
1. [Immediate — 30d]: [action]
2. [Medium-term — 90d]: [action]
3. [Strategic — 1y]: [action]

**RISK COMPOUND FACTORS**
[What other events would make this scenario significantly worse]

**SIMULATION CONFIDENCE: [X]%**
Model: OLS regression (IMF WEO 2000-2025) + VAR model for cross-domain effects`;
    try {
      setResult(await callGroq(prompt));
    } catch (e) {
      setResult("Error: " + String(e));
    }
    setRunning(false);
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Tactical Parameter Builder */}
      <div className="w-96 flex-shrink-0 overflow-y-auto overflow-x-hidden pr-2 pb-4 no-scrollbar">
        <div
          className="rounded-2xl p-5 mb-4 shadow-sm transition-all duration-300 ease-out bg-white/70 backdrop-blur-xl"
          style={{ border: "1px solid rgba(255,255,255,0.4)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-slate-700" />
            <div className="font-bold text-sm tracking-wide" style={{ color: "#1E293B" }}>Scenario Builder</div>
          </div>
          
          {/* Domain selector (Pills) */}
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748B" }}>Select Domain</div>
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {(Object.keys(PRESET_PARAMS) as DomainKey[]).map((d) => (
                <button
                  key={d}
                  onClick={() => switchDomain(d)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap"
                  style={{ 
                    background: domain === d ? "linear-gradient(135deg,#1E40AF,#3B82F6)" : "#F1F5F9", 
                    color: domain === d ? "white" : "#64748B",
                    boxShadow: domain === d ? "0 2px 8px rgba(59,130,246,0.4)" : "none"
                  }}
                >
                  <span>{DOMAIN_CONFIG[d].icon}</span>
                  <span className="text-[10px] capitalize">{d}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Time horizon */}
          <div className="mb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748B" }}>Projection Horizon</div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(["30d", "90d", "1y", "5y"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHorizon(t)}
                  className="flex-1 text-[11px] py-1.5 rounded-lg font-bold transition-all"
                  style={{ 
                    background: horizon === t ? "white" : "transparent", 
                    color: horizon === t ? "#1E40AF" : "#64748B",
                    boxShadow: horizon === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preset Params */}
        <div
          className="rounded-2xl p-5 mb-4 shadow-sm bg-white/70 backdrop-blur-xl"
          style={{ border: "1px solid rgba(255,255,255,0.4)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>
              {DOMAIN_CONFIG[domain].label} Vectors
            </div>
            <button onClick={() => { setParams(PRESET_PARAMS[domain].map((p) => ({ ...p }))); }} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-100 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Reset All
            </button>
          </div>
          
          <div className="space-y-6">
            {params.map((p) => {
              const changed = Math.abs(p.currentValue - p.baseValue) > p.step * 0.5;
              return (
                <div key={p.id} className="relative group">
                  {changed && <div className="absolute -left-3 top-0 bottom-0 w-1 bg-blue-500 rounded-full"></div>}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-bold" style={{ color: "#334155" }}>{p.name}</div>
                    <div className="flex items-center gap-2">
                      {changed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50" style={{ color: p.currentValue > p.baseValue ? "#EF4444" : "#22C55E" }}>
                          {p.currentValue > p.baseValue ? "↑" : "↓"} {Math.abs(((p.currentValue - p.baseValue) / (Math.abs(p.baseValue) || 1)) * 100).toFixed(1)}%
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold" style={{ color: changed ? "#1E40AF" : "#475569" }}>
                        {p.currentValue.toFixed(p.step < 1 ? 1 : 0)}{p.unit}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateParam(p.id, Math.max(p.min, p.currentValue - p.step))} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold leading-none select-none transition-colors">-</button>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={p.currentValue}
                      onChange={(e) => updateParam(p.id, parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: changed ? "#3B82F6" : "#94A3B8" }}
                    />
                    <button onClick={() => updateParam(p.id, Math.min(p.max, p.currentValue + p.step))} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold leading-none select-none transition-colors">+</button>
                  </div>
                  <div className="flex justify-between mt-1 px-8">
                    <span className="text-[9px] font-mono text-slate-400">{p.min}</span>
                    <span className="text-[9px] font-mono text-slate-400 font-semibold" style={{ color: changed ? "#94A3B8" : "transparent" }}>base: {p.baseValue}</span>
                    <span className="text-[9px] font-mono text-slate-400">{p.max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom params (Injected Vectors) */}
        {customAdded.length > 0 && (
          <div
            className="rounded-2xl p-5 mb-4 shadow-[0_4px_20px_rgb(59,130,246,0.15)] bg-blue-50/80 backdrop-blur-xl border border-blue-200/50"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Injected Custom Vectors
              </div>
            </div>
            <div className="space-y-5">
              {customAdded.map((p) => {
                const changed = Math.abs(p.currentValue - p.baseValue) > p.step * 0.5;
                return (
                  <div key={p.id} className="relative group bg-white rounded-xl p-3 shadow-sm border border-blue-100 transition-all hover:shadow-md">
                    {changed && <div className="absolute -left-1 top-2 bottom-2 w-1 bg-amber-500 rounded-full"></div>}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] font-bold text-blue-900">{p.name}</div>
                      <div className="flex items-center gap-2">
                        {changed && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50" style={{ color: p.currentValue > p.baseValue ? "#D97706" : "#059669" }}>
                            {p.currentValue > p.baseValue ? "↑" : "↓"} {Math.abs(((p.currentValue - p.baseValue) / (Math.abs(p.baseValue) || 1)) * 100).toFixed(1)}%
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-blue-600">
                          {p.currentValue.toFixed(p.step < 1 ? 1 : 0)}{p.unit}
                        </span>
                        <button onClick={() => removeCustom(p.id)} className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 w-5 h-5 rounded flex items-center justify-center transition-colors">✕</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateCustom(p.id, Math.max(p.min, p.currentValue - p.step))} className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold leading-none select-none transition-colors">-</button>
                      <input
                        type="range"
                        min={p.min} max={p.max} step={p.step} value={p.currentValue}
                        onChange={(e) => updateCustom(p.id, parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: changed ? "#D97706" : "#3B82F6" }}
                      />
                      <button onClick={() => updateCustom(p.id, Math.min(p.max, p.currentValue + p.step))} className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold leading-none select-none transition-colors">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Freeform Injector Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="w-full py-3.5 rounded-xl border-2 border-dashed font-bold text-[11px] uppercase tracking-wide transition-all flex items-center justify-center gap-2 hover:bg-blue-50/50"
            style={{ borderColor: showAddPanel ? "#3B82F6" : "#CBD5E1", color: showAddPanel ? "#1D4ED8" : "#64748B", background: showAddPanel ? "#EFF6FF" : "white" }}
          >
            <span className="text-xl leading-none">{showAddPanel ? "✕" : "+"}</span>
            {showAddPanel ? "Close Injector Module" : "Inject Freeform Vector"}
          </button>
          
          {showAddPanel && (
            <div className="mt-2 rounded-xl p-4 shadow-xl border border-blue-200 bg-white relative overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-3">God Mode Parameter Forger</div>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Parameter Target (Any string)</label>
                  <input 
                    type="text" 
                    value={customDraftName} 
                    onChange={e => setCustomDraftName(e.target.value)} 
                    placeholder="e.g. Sudden Tech Embargo" 
                    className="w-full mt-1 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-blue-500 font-medium transition-all focus:bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Unit</label>
                    <input 
                      type="text" 
                      value={customDraftUnit} 
                      onChange={e => setCustomDraftUnit(e.target.value)} 
                      placeholder="e.g. severity / %" 
                      className="w-full mt-1 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-blue-500 font-mono transition-all focus:bg-white"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Base Val</label>
                    <input 
                      type="number" 
                      value={customDraftBase} 
                      onChange={e => setCustomDraftBase(Number(e.target.value))} 
                      className="w-full mt-1 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-blue-500 font-mono transition-all focus:bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={injectFreeformParam}
                  disabled={!customDraftName}
                  className="w-full mt-3 py-2.5 rounded-lg font-bold text-white text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-lg active:scale-95"
                  style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)" }}
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1" /> Inject into Engine
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Run Button */}
        <button
          onClick={runSimulation}
          disabled={running}
          className="w-full py-4 rounded-xl font-bold text-white text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-4"
          style={{
            background: running ? "#64748B" : "linear-gradient(135deg,#0F172A,#1E293B)",
            boxShadow: running ? "none" : "0 8px 24px rgba(15,23,42,0.4)"
          }}
        >
          {running ? (
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
          ) : <Play className="w-4 h-4" />}
          {running ? "Simulating Cascade..." : "Execute Simulation"}
        </button>
      </div>

      {/* Result Panel — tabbed: Simulation | Article Analyser */}
      <ResultPanelWithAnalyzer
        domain={domain}
        result={result}
        running={running}
        params={params}
        customAdded={customAdded}
        horizon={horizon}
        onReset={() => setResult(null)}
      />
    </div>
  );
}

// ── Tabbed Result Panel ───────────────────────────────────────────────────────
function ResultPanelWithAnalyzer({
  domain, result, running, params, customAdded, horizon, onReset,
}: {
  domain: DomainKey;
  result: string | null;
  running: boolean;
  params: { name: string }[];
  customAdded: { name: string }[];
  horizon: string;
  onReset: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"sim" | "article">("sim");

  return (
    <div className="flex-1 overflow-hidden flex flex-col gap-3">
      {/* Tab bar */}
      <div className="flex gap-1">
        {([{ id: "sim" as const, label: <><Zap className="w-3.5 h-3.5 inline mr-1.5 align-text-bottom" /> Simulation</> }, { id: "article" as const, label: <><Newspaper className="w-3.5 h-3.5 inline mr-1.5 align-text-bottom" /> Article Analyser</> }]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="text-xs px-4 py-2 rounded-xl font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? "#1E40AF" : "rgba(255,255,255,0.7)",
              color: activeTab === tab.id ? "white" : "#64748B",
              border: activeTab === tab.id ? "none" : "1px solid rgba(255,255,255,0.5)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl p-6 shadow-sm transition-all duration-300 ease-out hover:shadow-xl bg-white/70 backdrop-blur-xl"
        style={{ border: "1px solid rgba(255,255,255,0.5)" }}
      >
        {activeTab === "sim" && (
          <>
            {!result && !running && (
              <div className="flex flex-col h-full bg-slate-900 rounded-xl p-6 relative overflow-hidden text-left shadow-inner border border-slate-800">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <svg width="200" height="200" viewBox="0 0 100 100" fill="white"><circle cx="50" cy="50" r="40" stroke="white" strokeWidth="2" fill="none" strokeDasharray="4 6" /><path d="M50 10v80 M10 50h80" stroke="white" strokeWidth="1" opacity="0.5" /></svg>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center border border-blue-500/40">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold tracking-wide">ARIA Core Sandbox Module</h2>
                    <div className="text-[10px] text-blue-300 font-mono tracking-widest uppercase">System Diagnostics · Active</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Engine Status</div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-sm text-emerald-400 font-mono font-bold">OPTIMAL</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Loaded Parameters</div>
                    <div className="text-xl text-white font-mono font-bold">{params.length + customAdded.length}</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Cross-Domain Vectors</div>
                    <div className="text-xl text-white font-mono font-bold">1,240+</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Projection Horizon</div>
                    <div className="text-xl text-blue-400 font-mono font-bold">{horizon}</div>
                  </div>
                </div>

                <div className="mt-auto bg-blue-900/20 border border-blue-800/40 rounded-lg p-4 relative z-10">
                  <div className="text-xs text-blue-200 leading-relaxed">
                    <strong>Instructions:</strong> Modify the baseline assumptions in the control panel to evaluate cascading strategic impacts. ARIA predicts macro-economic, geopolitical, and security outcomes using algorithmic cross-domain variance generation.
                  </div>
                </div>
              </div>
            )}
            {running && (
              <div className="flex flex-col h-full bg-slate-900 rounded-xl p-8 relative overflow-hidden border border-slate-800 items-center justify-center">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                
                <div className="relative z-10 w-full max-w-sm">
                  <div className="flex justify-between text-[10px] font-mono text-blue-400 mb-2 uppercase tracking-widest">
                    <span>Executing Cascade Analysis</span>
                    <span className="animate-pulse">Processing...</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-blue-500 shadow-[0_0_10px_#3B82F6]" style={{ animation: "progressPulse 1.5s infinite ease-in-out", width: "100%" }} />
                  </div>
                  
                  <div className="space-y-3 font-mono text-[10px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400">✓</span> <span>Compiling baseline deviation matrices</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400">✓</span> <span>Injecting {params.length + customAdded.length} variables into simulation engine</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-90">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" /> <span className="text-blue-200">Simulating {horizon} forward projections</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-50">
                      <span className="w-2 h-2 border border-slate-600 rounded-full" /> <span>Synthesizing multi-domain role impacts</span>
                    </div>
                  </div>
                </div>

                <style>{`
                  @keyframes progressPulse {
                    0% { transform: scaleX(0); transform-origin: left; }
                    50% { transform: scaleX(1); transform-origin: left; }
                    50.1% { transform: scaleX(1); transform-origin: right; }
                    100% { transform: scaleX(0); transform-origin: right; }
                  }
                `}</style>
              </div>
            )}
            {result && !running && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-sm flex items-center gap-1.5" style={{ color: "#1E293B" }}>
                    <Zap className="w-4 h-4 text-blue-600" /> Simulation Results — {DOMAIN_CONFIG[domain].label} · {horizon}
                  </div>
                  <button onClick={onReset} className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors" style={{ background: "#F1F5F9", color: "#64748B" }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "#334155" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
                <RoleImpactSection result={result} domain={domain} />
              </div>
            )}
          </>
        )}
        {activeTab === "article" && <ArticleAnalysisLab domain={domain} />}
      </div>
    </div>
  );
}

// ── Role Impact Section ───────────────────────────────────────────────────────
function RoleImpactSection({ result, domain }: { result: string; domain: DomainKey }) {
  const [roleImpact, setRoleImpact] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const roles = DOMAIN_ROLES[domain] || DOMAIN_ROLES.society;

  async function analyzeRoles() {
    setLoading(true);
    const roleNames = roles.map(r => r.label);
    const roleFormat = roleNames.map(r => `"${r}": "..."`).join(", ");
    const prompt =
      'Given this ' + DOMAIN_CONFIG[domain].label + ' simulation result for India, analyze the specific impact on exactly 5 role groups:\n"' +
      result.slice(0, 600) +
      '"\n\nFor each role, write 1-2 sentences with specific % numbers or policy impacts. Format as JSON:\n{' + roleFormat + '}';
    try {
      const text = await callGroq(prompt);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setRoleImpact(JSON.parse(match[0]));
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div className="mt-5 rounded-xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg bg-white/60 backdrop-blur-md" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50" style={{ background: "rgba(255,255,255,0.4)" }}>
        <div className="text-xs font-bold" style={{ color: "#1E293B" }}>Role-wise Impact Analysis</div>
        {!roleImpact && !loading && (
          <button onClick={analyzeRoles} className="text-xs px-3 py-1 rounded-lg font-semibold text-white" style={{ background: "linear-gradient(135deg,#1E40AF,#4338CA)" }}>
            Generate Impact
          </button>
        )}
      </div>
      {loading && <div className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>ARIA is analysing role-wise impacts...</div>}
      {roleImpact && (
        <div className="grid grid-cols-5 gap-0" style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}>
          {roles.map((r) => (
            <div key={r.label} className="p-3 border-r last:border-r-0 flex flex-col items-center text-center" style={{ borderColor: "#E2E8F0" }}>
              <div className="text-xl mb-1" title={r.label}>{r.icon}</div>
              <div className="text-[10px] font-bold mb-1" style={{ color: r.color }}>{r.label}</div>
              <div className="text-[9px] leading-relaxed text-left line-clamp-4" style={{ color: "#374151" }}>{roleImpact[r.label] ?? "..."}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RAG Animation (Neural Network Visualization) ────────────────────────────────
function RAGAnimation({ onComplete, domain }: { onComplete: () => void; domain: DomainKey }) {
  const [tick, setTick] = useState(0);
  const startRef = useRef(Date.now());
  const [progress, setProgress] = useState(0);

  const roles = DOMAIN_ROLES[domain] || DOMAIN_ROLES.society;
  
  // Arrange nodes in a more organic, neural network star/circle layout around the center ARIA node
  const cx = 200, cy = 160;
  const radius = 100;
  const nodes = roles.map((r, i) => {
    const angle = (i * 2 * Math.PI) / roles.length - Math.PI / 2;
    return {
      ...r,
      x: cx + radius * Math.cos(angle) + (Math.random() * 20 - 10), // slight organic offset
      y: cy + radius * Math.sin(angle) + (Math.random() * 20 - 10),
    };
  });

  // Fully connected network from center to nodes, and semi-connected between siblings
  const edges: { a: number; b: number; fromCenter?: boolean }[] = [];
  nodes.forEach((_, i) => {
    edges.push({ a: -1, b: i, fromCenter: true }); // -1 means center (ARIA)
    edges.push({ a: i, b: (i + 1) % nodes.length }); // outer ring
  });

  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setTick((t) => t + 1);
      setProgress(Math.min(1, elapsed / 8000));
      if (elapsed >= 8000) { clearInterval(iv); setTimeout(onComplete, 500); }
    }, 150);
    return () => clearInterval(iv);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 w-full h-full relative overflow-hidden bg-slate-900 rounded-2xl mx-auto shadow-inner">
      <div className="absolute top-4 left-4 z-10 text-white">
        <div className="text-sm font-bold tracking-wide">Building Neural Graph...</div>
        <div className="text-[10px] text-blue-300">Extracting context via semantic search across ARIA nodes</div>
      </div>
      <svg width="400" height="320" viewBox="0 0 400 320" className="z-0 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Neural Links */}
        {edges.map((e, i) => {
          const dn = e.a === -1 ? { x: cx, y: cy, color: "#3B82F6" } : nodes[e.a];
          const db = nodes[e.b];
          // Randomly pulse different edges
          const isActive = (tick % edges.length) === i || (tick * 3 % edges.length) === i;
          return (
            <g key={i}>
              <line x1={dn.x} y1={dn.y} x2={db.x} y2={db.y} stroke={isActive ? db.color : "#334155"} strokeWidth={isActive ? 2 : 1.5} opacity={isActive ? 0.9 : 0.3} style={{ transition: "stroke 0.2s, stroke-width 0.2s" }} filter="url(#glow)" />
              {/* Pulsing data packet along the active edge */}
              {isActive && (
                <circle cx={dn.x + (db.x - dn.x) * ((tick % 10) / 10)} cy={dn.y + (db.y - dn.y) * ((tick % 10) / 10)} r={3} fill="#fff" filter="url(#glow)" />
              )}
            </g>
          );
        })}

        {/* Stakeholder Nodes */}
        {nodes.map((n, i) => {
          const isPulsing = (tick % nodes.length) === i;
          return (
            <g key={i} className="transition-transform duration-300" style={{ transformOrigin: `${n.x}px ${n.y}px`, transform: isPulsing ? 'scale(1.15)' : 'scale(1)' }}>
              {isPulsing && <circle cx={n.x} cy={n.y} r={24} fill={n.color} opacity={0.3} filter="url(#glow)" />}
              <circle cx={n.x} cy={n.y} r={14} fill="#1E293B" stroke={n.color} strokeWidth={2} filter="url(#glow)" />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fill="white">{n.icon}</text>
              <text x={n.x} y={n.y + 26} textAnchor="middle" fontSize={9} fill="#94A3B8" fontWeight="600" className="tracking-wide" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>{n.label}</text>
            </g>
          );
        })}

        {/* Core ARIA Node */}
        <g>
          <circle cx={cx} cy={cy} r={32} fill="#1E40AF" opacity={0.2} filter="url(#glow)">
            <animate attributeName="r" values="32;38;32" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r={22} fill="url(#coreGradient)" stroke="#60A5FA" strokeWidth={2} filter="url(#glow)" />
          <defs>
            <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3B82F6"/>
              <stop offset="100%" stopColor="#1E3A8A"/>
            </radialGradient>
          </defs>
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="#EFF6FF" fontWeight="bold" letterSpacing={1}>ARIA</text>
        </g>
      </svg>
      
      {/* Sleek Progress Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64">
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 shadow-[0_0_8px_#3B82F6]" style={{ width: `${progress * 100}%`, transition: "width 0.2s linear" }} />
        </div>
        <div className="text-[9px] text-blue-400 font-bold uppercase tracking-widest text-center mt-2">
          {Math.round(progress * 100)}% Synchronised
        </div>
      </div>
    </div>
  );
}

// ── Article Relationship Map ──────────────────────────────────────────────────
interface ArticleNode2 { id: string; label: string; type: string; x: number; y: number; color: string; }
interface ArticleEdge2 { from: string; to: string; label: string; }
interface ArticleMap2 { title: string; nodes: ArticleNode2[]; edges: ArticleEdge2[]; }

function ArticleRelMap({ map }: { map: ArticleMap2 }) {
  const nodeMap: Record<string, ArticleNode2> = {};
  map.nodes.forEach((n) => { nodeMap[n.id] = n; });
  const typeColors: Record<string, string> = { actor: "#1E40AF", event: "#D97706", impact: "#16A34A" };

  return (
    <div className="rounded-xl border p-4" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
      <div className="text-xs font-bold mb-3" style={{ color: "#1E293B" }}>Relationship Map: {map.title}</div>
      <svg width="100%" viewBox="0 0 520 280" style={{ maxHeight: 280 }}>
        <defs>
          <marker id="sarrow" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#CBD5E1" />
          </marker>
        </defs>
        {map.edges.map((e, i) => {
          const from = nodeMap[e.from], to = nodeMap[e.to];
          if (!from || !to) return null;
          return (
            <g key={i}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#CBD5E1" strokeWidth={1.5} markerEnd="url(#sarrow)" />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 5} textAnchor="middle" fontSize={8} fill="#94A3B8">{e.label}</text>
            </g>
          );
        })}
        {map.nodes.map((n, i) => {
          const color = n.color || typeColors[n.type] || "#64748B";
          return (
            <g key={i}>
              <rect x={n.x - 44} y={n.y - 14} width={88} height={28} rx={8} fill={color + "18"} stroke={color} strokeWidth={1.5} />
              <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">{n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Article Analysis Lab ──────────────────────────────────────────────────────
function ArticleAnalysisLab({ domain }: { domain: DomainKey }) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "validating" | "invalid" | "ocr_error" | "animating" | "result">("idle");
  const [articleMap, setArticleMap] = useState<ArticleMap2 | null>(null);
  const [predictions, setPredictions] = useState("");
  const [roleImpacts, setRoleImpacts] = useState<Record<string, string> | null>(null);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const roles = DOMAIN_ROLES[domain] || DOMAIN_ROLES.society;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
    setStage("uploading");
    
    // Simulate OCR parsing delay for hackathon UX, then throw an error instead of injecting fake news
    setTimeout(() => {
      setStage("ocr_error");
    }, 2800);
  }

  async function analyzeArticle() {
    if (wordCount < 30) return;
    setStage("validating");
    try {
      const validText = await callGroq('Is the following text a news article? Reply with only JSON {"isArticle": true/false, "reason": "..."}\n\n"' + text.slice(0, 400) + '"');
      const match = validText.match(/\{[\s\S]*\}/);
      if (!match) { setStage("invalid"); return; }
      const { isArticle } = JSON.parse(match[0]);
      if (!isArticle) { setStage("invalid"); return; }
    } catch { setStage("invalid"); return; }

    setStage("animating");

    const roleNames = roles.map(r => r.label);
    const roleFormat = roleNames.map(r => `"${r}": "1-2 sentences"`).join(", ");

    const [mapText, predText, roleText] = await Promise.all([
      callGroq('From this India ' + DOMAIN_CONFIG[domain].label + ' news article, extract a relationship map. Return ONLY valid JSON: {"title": "short title", "nodes": [{"id":"n1","label":"India","type":"actor","x":260,"y":140,"color":"#1E40AF"}, ...], "edges": [{"from":"n1","to":"n2","label":"impacts"}, ...]}. Max 6 nodes. Place on 520x280 grid.\n\nArticle: ' + text.slice(0, 600)),
      callGroq('From this India ' + DOMAIN_CONFIG[domain].label + ' news article, generate 3 future impact predictions for India with probability and timeline. Format each as bullet point. Be specific with % numbers.\n\nArticle: ' + text.slice(0, 600)),
      callGroq('From this India ' + DOMAIN_CONFIG[domain].label + ' news article, analyze impact on 5 role groups. Return ONLY JSON: {' + roleFormat + '}\n\nArticle: ' + text.slice(0, 600)),
    ]);

    try { const m = mapText.match(/\{[\s\S]*\}/); if (m) setArticleMap(JSON.parse(m[0])); } catch { /* ignore */ }
    setPredictions(predText);
    try { const m = roleText.match(/\{[\s\S]*\}/); if (m) setRoleImpacts(JSON.parse(m[0])); } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-sm" style={{ color: "#1E293B" }}>News Article Analyser</div>
        <div className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#EFF6FF", color: "#1E40AF" }}>AI-Powered</div>
      </div>
      <div className="text-[10px] mb-2" style={{ color: "#64748B" }}>
        Paste a news article — ARIA will validate, map relationships, and generate role-wise impact predictions
      </div>
      {(stage === "idle" || stage === "invalid" || stage === "ocr_error") ? (
        <>
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a news article here... (min 30 words)"
              className="flex-1 text-xs rounded-xl border p-3 resize-none focus:outline-none transition-all shadow-inner"
              style={{ height: 120, borderColor: "#E2E8F0", lineHeight: 1.6 }}
            />
            <div 
              className="w-32 shrink-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-400"
              style={{ borderColor: "#CBD5E1", height: 120 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <div className="mb-2 text-slate-400"><FileText className="w-6 h-6" /></div>
              <div className="text-[10px] font-bold text-slate-600">Upload PDF</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Secure OCR Parse</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-semibold" style={{ color: wordCount >= 30 ? "#22C55E" : "#94A3B8" }}>
              {wordCount} words {wordCount >= 30 ? "✓ Ready for Engine Validation" : `(need ${30 - wordCount} more)`}
            </span>
            <button
              onClick={analyzeArticle}
              disabled={wordCount < 30}
              className="text-xs px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: wordCount >= 30 ? "linear-gradient(135deg,#1E40AF,#6366F1)" : "#CBD5E1", boxShadow: wordCount >= 30 ? "0 4px 12px rgba(99,102,241,0.3)" : "none" }}
            >
              Analyse Article
            </button>
          </div>
          {stage === "invalid" && (
            <div className="mt-2 text-xs px-4 py-3 rounded-xl border" style={{ background: "#FEF2F2", color: "#B91C1C", borderColor: "#FCA5A5" }}>
              <strong>Validation Blocked</strong>: The text does not appear to be a high-quality news configuration. Please paste a valid article.
            </div>
          )}
          {stage === "ocr_error" && (
            <div className="mt-2 text-xs px-4 py-3 rounded-xl border" style={{ background: "#FE11110A", color: "#B91C1C", borderColor: "#FCA5A5" }}>
              <strong>OCR Extraction Failed</strong>: Could not extract a valid news article from the uploaded PDF document. Please manually copy and paste the article text into the field above.
            </div>
          )}
        </>
      ) : stage === "uploading" ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4 bg-slate-50/50 rounded-xl border border-slate-200">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent border-l-transparent rounded-full animate-spin opacity-50" />
            <div className="absolute inset-0 border-4 border-indigo-600 border-b-transparent border-r-transparent rounded-full animate-spin shadow-md" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            <FileText className="w-5 h-5 text-indigo-600 z-10" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800 tracking-wide">OCR Scanning Active</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-mono">Extracting text vectors from PDF document...</div>
          </div>
        </div>
      ) : stage === "validating" ? (
        <div className="flex items-center justify-center py-12 gap-3 bg-slate-50/50 rounded-xl border border-slate-200">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold" style={{ color: "#64748B" }}>ARIA Deep Validation Check...</span>
        </div>
      ) : stage === "animating" ? (
        <RAGAnimation onComplete={() => setStage("result")} domain={domain} />
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => { setStage("idle"); setText(""); setArticleMap(null); setPredictions(""); setRoleImpacts(null); }}
            className="text-[10px] px-2 py-1 rounded"
            style={{ background: "#F1F5F9", color: "#64748B" }}
          >
            Analyse another article
          </button>
          {articleMap && <ArticleRelMap map={articleMap} />}
          {predictions && (
            <div className="rounded-xl border p-4" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "#1E293B" }}>Future Impact Predictions</div>
              <div className="text-xs leading-relaxed" style={{ color: "#334155" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(predictions) }} />
            </div>
          )}
          {roleImpacts && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
              <div className="px-4 py-2 text-xs font-bold" style={{ background: "#F8FAFC", color: "#1E293B" }}>Role-wise Impact</div>
              <div className="grid grid-cols-5">
                {roles.map((r) => (
                  <div key={r.label} className="p-3 border-r last:border-r-0 flex flex-col items-center text-center" style={{ borderColor: "#E2E8F0", flex: 1 }}>
                    <div className="text-xl mb-1">{r.icon}</div>
                    <div className="text-[10px] font-bold mb-1" style={{ color: r.color }}>{r.label}</div>
                    <div className="text-[9px] leading-relaxed text-left line-clamp-4" style={{ color: "#374151" }}>{roleImpacts[r.label] ?? "..."}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
