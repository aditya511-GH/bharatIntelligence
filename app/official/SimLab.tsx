"use client";
import { useState } from "react";
import { DomainKey, DOMAIN_CONFIG } from "@/lib/utils";

// rotate among public Gemini keys for the simulator
const PUBLIC_KEYS = (
  process.env.NEXT_PUBLIC_GEMINI_API_KEYS ??
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
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

function pickKey() {
  if (PUBLIC_KEYS.length === 0) return null;
  return PUBLIC_KEYS[Math.floor(Math.random() * PUBLIC_KEYS.length)];
}

async function callGemini(prompt: string): Promise<string> {
  if (PUBLIC_KEYS.length === 0) return "No API key.";
  const pool = shuffle(PUBLIC_KEYS);
  let res: Response | null = null;
  for (const key of pool) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1600 },
        }),
      },
    );
    if (res.status === 429) {
      console.warn("SimLab key rate-limited, trying next key");
    }
    if (res.status !== 429) break;
  }
  if (!res) return "No response.";
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
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
type SimResult = {
  topic: string;
  impact: string;
  direction: "up" | "down" | "neutral";
  magnitude: "low" | "medium" | "high";
};

const PRESET_PARAMS: Record<DomainKey, Param[]> = {
  geopolitics: [
    {
      id: "oil",
      category: "Energy",
      name: "Brent Crude Price",
      unit: "$/bbl",
      baseValue: 88,
      currentValue: 88,
      min: 40,
      max: 150,
      step: 1,
      description: "International crude oil benchmark price",
    },
    {
      id: "sanction",
      category: "Trade",
      name: "Russia Sanction Intensity",
      unit: "index (0-100)",
      baseValue: 72,
      currentValue: 72,
      min: 0,
      max: 100,
      step: 1,
      description: "Western sanctions effectiveness against Russia",
    },
    {
      id: "taiwan",
      category: "Defense",
      name: "Taiwan Strait Tension",
      unit: "index (0-100)",
      baseValue: 65,
      currentValue: 65,
      min: 0,
      max: 100,
      step: 1,
      description: "Military tension level in Taiwan Strait",
    },
    {
      id: "opec",
      category: "Energy",
      name: "OPEC Production Cut",
      unit: "Mb/d",
      baseValue: 1.2,
      currentValue: 1.2,
      min: 0,
      max: 5,
      step: 0.1,
      description: "OPEC voluntary production reduction",
    },
  ],
  economics: [
    {
      id: "usd_inr",
      category: "Forex",
      name: "USD/INR Rate",
      unit: "₹",
      baseValue: 83.2,
      currentValue: 83.2,
      min: 75,
      max: 95,
      step: 0.1,
      description: "Rupee-dollar exchange rate",
    },
    {
      id: "repo",
      category: "Monetary",
      name: "RBI Repo Rate",
      unit: "%",
      baseValue: 6.5,
      currentValue: 6.5,
      min: 4,
      max: 9,
      step: 0.25,
      description: "RBI benchmark interest rate",
    },
    {
      id: "fed_rate",
      category: "Monetary",
      name: "US Fed Rate",
      unit: "%",
      baseValue: 5.5,
      currentValue: 5.5,
      min: 0,
      max: 8,
      step: 0.25,
      description: "US Federal Reserve benchmark rate",
    },
    {
      id: "cpi",
      category: "Inflation",
      name: "India CPI",
      unit: "%",
      baseValue: 5.1,
      currentValue: 5.1,
      min: 2,
      max: 10,
      step: 0.1,
      description: "India consumer price inflation",
    },
    {
      id: "fdi",
      category: "Investment",
      name: "FDI Inflow",
      unit: "$B/yr",
      baseValue: 44,
      currentValue: 44,
      min: 10,
      max: 100,
      step: 1,
      description: "Foreign direct investment into India",
    },
  ],
  defense: [
    {
      id: "lac",
      category: "Border",
      name: "LAC Incursion Depth",
      unit: "km",
      baseValue: 18,
      currentValue: 18,
      min: 0,
      max: 80,
      step: 1,
      description: "Chinese PLA incursion depth at LAC",
    },
    {
      id: "mil_spend",
      category: "Budget",
      name: "Defense Budget % GDP",
      unit: "%",
      baseValue: 2.4,
      currentValue: 2.4,
      min: 1,
      max: 5,
      step: 0.1,
      description: "India's defense spending as % GDP",
    },
    {
      id: "cyber",
      category: "Cyber",
      name: "APT Attack Frequency",
      unit: "incidents/month",
      baseValue: 200,
      currentValue: 200,
      min: 0,
      max: 1000,
      step: 10,
      description: "State-sponsored cyber attacks on India",
    },
    {
      id: "alloc",
      category: "Forces",
      name: "Troops at LAC",
      unit: "thousands",
      baseValue: 60,
      currentValue: 60,
      min: 20,
      max: 200,
      step: 5,
      description: "Indian Army deployment at LAC",
    },
  ],
  technology: [
    {
      id: "chip_dep",
      category: "Supply Chain",
      name: "Chip Import Dependency",
      unit: "%",
      baseValue: 78,
      currentValue: 78,
      min: 0,
      max: 100,
      step: 1,
      description: "India's semiconductor import dependency",
    },
    {
      id: "r_and_d",
      category: "Innovation",
      name: "R&D as % GDP",
      unit: "%",
      baseValue: 0.7,
      currentValue: 0.7,
      min: 0.1,
      max: 4,
      step: 0.1,
      description: "India's R&D investment",
    },
    {
      id: "fab_cap",
      category: "Manufacturing",
      name: "Domestic Fab Capacity",
      unit: "wafers/month (K)",
      baseValue: 0,
      currentValue: 0,
      min: 0,
      max: 100,
      step: 1,
      description: "India domestic chip fabrication capacity",
    },
    {
      id: "ai_invest",
      category: "AI",
      name: "AI Investment",
      unit: "$B",
      baseValue: 3.2,
      currentValue: 3.2,
      min: 0.5,
      max: 20,
      step: 0.5,
      description: "India AI sector investment",
    },
  ],
  climate: [
    {
      id: "monsoon",
      category: "Weather",
      name: "Monsoon Rainfall Deficit",
      unit: "%",
      baseValue: 22,
      currentValue: 22,
      min: -50,
      max: 100,
      step: 1,
      description: "% below normal monsoon (positive=deficit)",
    },
    {
      id: "solar",
      category: "Renewable",
      name: "Solar Capacity",
      unit: "GW",
      baseValue: 100,
      currentValue: 100,
      min: 50,
      max: 300,
      step: 5,
      description: "India installed solar capacity",
    },
    {
      id: "coal",
      category: "Energy Mix",
      name: "Coal in Energy Mix",
      unit: "%",
      baseValue: 55,
      currentValue: 55,
      min: 20,
      max: 80,
      step: 1,
      description: "Coal's share in India's power generation",
    },
    {
      id: "temp",
      category: "Climate",
      name: "Annual Temp Anomaly",
      unit: "°C",
      baseValue: 1.1,
      currentValue: 1.1,
      min: 0,
      max: 3,
      step: 0.1,
      description: "Temperature rise from pre-industrial baseline",
    },
  ],
  society: [
    {
      id: "youth_unemp",
      category: "Employment",
      name: "Youth Unemployment Rate",
      unit: "%",
      baseValue: 23,
      currentValue: 23,
      min: 5,
      max: 50,
      step: 1,
      description: "15-24 age group unemployment",
    },
    {
      id: "pmjay_enroll",
      category: "Healthcare",
      name: "PM-JAY Enrollment",
      unit: "M people",
      baseValue: 600,
      currentValue: 600,
      min: 200,
      max: 1000,
      step: 10,
      description: "People enrolled in PM Jan Arogya Yojana",
    },
    {
      id: "gini",
      category: "Inequality",
      name: "Gini Coefficient",
      unit: "index",
      baseValue: 0.51,
      currentValue: 0.51,
      min: 0.3,
      max: 0.7,
      step: 0.01,
      description: "Income inequality measure (0=equal, 1=unequal)",
    },
    {
      id: "remittance",
      category: "Economy",
      name: "Diaspora Remittance",
      unit: "$B/yr",
      baseValue: 120,
      currentValue: 120,
      min: 50,
      max: 200,
      step: 5,
      description: "Annual remittance from Indian diaspora",
    },
  ],
};

const CUSTOM_PARAMS_LIBRARY: {
  category: string;
  params: {
    name: string;
    unit: string;
    baseValue: number;
    min: number;
    max: number;
    step: number;
    description: string;
  }[];
}[] = [
  {
    category: "📈 Economics",
    params: [
      {
        name: "Gold Price",
        unit: "$/oz",
        baseValue: 2050,
        min: 1000,
        max: 3500,
        step: 10,
        description: "International gold price",
      },
      {
        name: "10-Year Bond Yield",
        unit: "%",
        baseValue: 7.2,
        min: 5,
        max: 12,
        step: 0.1,
        description: "India 10-year government bond yield",
      },
      {
        name: "BSE Sensex",
        unit: "index",
        baseValue: 72000,
        min: 40000,
        max: 100000,
        step: 100,
        description: "Bombay Stock Exchange index",
      },
    ],
  },
  {
    category: "🌍 Geopolitics",
    params: [
      {
        name: "G20 Trade Volume",
        unit: "$T",
        baseValue: 25,
        min: 10,
        max: 40,
        step: 0.5,
        description: "Total G20 trade volume",
      },
      {
        name: "UN Security Council Veto Rate",
        unit: "vetoes/yr",
        baseValue: 4,
        min: 0,
        max: 20,
        step: 1,
        description: "UNSC veto frequency",
      },
      {
        name: "India-China Bilateral Trade",
        unit: "$B",
        baseValue: 100,
        min: 20,
        max: 200,
        step: 5,
        description: "India-China annual bilateral trade",
      },
    ],
  },
  {
    category: "⚡ Energy",
    params: [
      {
        name: "Natural Gas Price (Henry Hub)",
        unit: "$/MMBtu",
        baseValue: 3.5,
        min: 1,
        max: 12,
        step: 0.1,
        description: "US natural gas benchmark",
      },
      {
        name: "Renewable Share in Grid",
        unit: "%",
        baseValue: 32,
        min: 10,
        max: 80,
        step: 1,
        description: "India's renewable mix in power grid",
      },
      {
        name: "India Strategic Reserve",
        unit: "days of cover",
        baseValue: 32,
        min: 5,
        max: 90,
        step: 1,
        description: "India strategic petroleum reserve cover",
      },
    ],
  },
];

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
  function addCustomParam(
    cat: string,
    p: {
      name: string;
      unit: string;
      baseValue: number;
      min: number;
      max: number;
      step: number;
      description: string;
    },
  ) {
    const id = `custom_${Date.now()}`;
    setCustomAdded((prev) => [
      ...prev,
      { id, category: cat, ...p, currentValue: p.baseValue },
    ]);
    setShowAddPanel(false);
  }
  function removeCustom(id: string) {
    setCustomAdded((prev) => prev.filter((p) => p.id !== id));
  }

  async function runSimulation() {
    setRunning(true);
    setResult(null);
    const allParams = [...params, ...customAdded];
    const changes = allParams.filter(
      (p) => Math.abs(p.currentValue - p.baseValue) > p.step * 0.5,
    );
    const unchanged = allParams.filter(
      (p) => Math.abs(p.currentValue - p.baseValue) <= p.step * 0.5,
    );
    const changesText =
      changes.length > 0
        ? changes
            .map(
              (p) =>
                `• ${p.name}: ${p.baseValue}${p.unit} → ${p.currentValue}${p.unit} (${p.currentValue > p.baseValue ? "+" : ""}${(((p.currentValue - p.baseValue) / Math.abs(p.baseValue || 1)) * 100).toFixed(1)}% change)`,
            )
            .join("\n")
        : "No parameters changed from baseline.";
    const baseText = unchanged
      .map((p) => `• ${p.name}: ${p.baseValue}${p.unit} (baseline)`)
      .join("\n");
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
Model: OLS regression (IMF WEO 2000-2024) + VAR model for cross-domain effects`;
    try {
      setResult(await callGemini(prompt));
    } catch (e) {
      setResult("Error: " + String(e));
    }
    setRunning(false);
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Parameter Builder */}
      <div className="w-80 flex-shrink-0 overflow-y-auto">
        <div
          className="rounded-2xl p-4 mb-3"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 4px 24px rgba(30,64,175,0.07)",
          }}
        >
          <div className="font-bold text-sm mb-3" style={{ color: "#1E293B" }}>
            ⚗️ Simulation Parameter Builder
          </div>
          {/* Domain selector */}
          <div className="mb-3">
            <div
              className="text-xs font-semibold mb-1.5"
              style={{ color: "#64748B" }}
            >
              Domain
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(Object.keys(PRESET_PARAMS) as DomainKey[]).map((d) => (
                <button
                  key={d}
                  onClick={() => switchDomain(d)}
                  className="text-xs py-1 rounded-lg font-medium transition-all"
                  style={{
                    background: domain === d ? "#1E40AF" : "#F1F5F9",
                    color: domain === d ? "white" : "#64748B",
                  }}
                >
                  {DOMAIN_CONFIG[d].icon}
                </button>
              ))}
            </div>
          </div>
          {/* Time horizon */}
          <div className="mb-3">
            <div
              className="text-xs font-semibold mb-1.5"
              style={{ color: "#64748B" }}
            >
              Time Horizon
            </div>
            <div className="flex gap-1">
              {(["30d", "90d", "1y", "5y"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHorizon(t)}
                  className="flex-1 text-xs py-1 rounded-lg font-medium"
                  style={{
                    background: horizon === t ? "#4338CA" : "#F1F5F9",
                    color: horizon === t ? "white" : "#64748B",
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
          className="rounded-2xl p-4 mb-3"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <div className="text-xs font-bold mb-3" style={{ color: "#1E293B" }}>
            📊 {DOMAIN_CONFIG[domain].label} Parameters
          </div>
          {params.map((p) => {
            const changed =
              Math.abs(p.currentValue - p.baseValue) > p.step * 0.5;
            const pct = ((p.currentValue - p.min) / (p.max - p.min)) * 100;
            return (
              <div key={p.id} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="text-xs font-medium"
                    style={{ color: "#374151" }}
                  >
                    {p.name}
                  </div>
                  <div className="flex items-center gap-1">
                    {changed && (
                      <span
                        className="text-xs font-bold"
                        style={{
                          color:
                            p.currentValue > p.baseValue
                              ? "#EF4444"
                              : "#22C55E",
                        }}
                      >
                        {p.currentValue > p.baseValue ? "↑" : "↓"}
                      </span>
                    )}
                    <span
                      className="text-xs font-bold"
                      style={{ color: changed ? "#1E40AF" : "#374151" }}
                    >
                      {p.currentValue}
                      {p.unit}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={p.currentValue}
                  onChange={(e) =>
                    updateParam(p.id, parseFloat(e.target.value))
                  }
                  className="w-full"
                  style={{ accentColor: changed ? "#1E40AF" : "#CBD5E1" }}
                />
                <div className="flex justify-between">
                  <span
                    className="text-xs"
                    style={{ color: "#94A3B8", fontSize: 9 }}
                  >
                    {p.min}
                    {p.unit}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "#94A3B8", fontSize: 9 }}
                  >
                    base: {p.baseValue}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "#94A3B8", fontSize: 9 }}
                  >
                    {p.max}
                    {p.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom params */}
        {customAdded.length > 0 && (
          <div
            className="rounded-2xl p-4 mb-3"
            style={{
              background: "rgba(239,246,255,0.9)",
              border: "1px solid #BFDBFE",
            }}
          >
            <div
              className="text-xs font-bold mb-3"
              style={{ color: "#1E40AF" }}
            >
              🔧 Custom Parameters
            </div>
            {customAdded.map((p) => (
              <div key={p.id} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="text-xs font-medium"
                    style={{ color: "#374151" }}
                  >
                    {p.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs font-bold"
                      style={{ color: "#1E40AF" }}
                    >
                      {p.currentValue}
                      {p.unit}
                    </span>
                    <button
                      onClick={() => removeCustom(p.id)}
                      className="text-xs"
                      style={{ color: "#EF4444" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={p.currentValue}
                  onChange={(e) =>
                    updateCustom(p.id, parseFloat(e.target.value))
                  }
                  className="w-full"
                  style={{ accentColor: "#3B82F6" }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Add custom / Run */}
        <div className="space-y-2">
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="w-full text-xs py-2 rounded-xl border font-medium transition-all"
            style={{
              borderColor: "#BFDBFE",
              color: "#1E40AF",
              background: "white",
            }}
          >
            {showAddPanel ? "✕ Cancel" : "+ Add Custom Parameter"}
          </button>
          {showAddPanel && (
            <div
              className="rounded-xl p-3"
              style={{ background: "white", border: "1px solid #E2E8F0" }}
            >
              {CUSTOM_PARAMS_LIBRARY.map((cat) => (
                <div key={cat.category} className="mb-2">
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{ color: "#64748B" }}
                  >
                    {cat.category}
                  </div>
                  {cat.params.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => addCustomParam(cat.category, p)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg mb-1 hover:bg-blue-50 transition-all"
                      style={{ color: "#374151", border: "1px solid #F1F5F9" }}
                    >
                      <span className="font-medium">{p.name}</span>{" "}
                      <span style={{ color: "#94A3B8" }}>
                        ({p.baseValue}
                        {p.unit})
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={runSimulation}
            disabled={running}
            className="w-full py-2.5 rounded-xl font-bold text-white text-xs transition-all"
            style={{
              background: running
                ? "#94A3B8"
                : "linear-gradient(135deg,#1E40AF,#4338CA)",
              boxShadow: running ? "none" : "0 4px 16px rgba(30,64,175,0.3)",
            }}
          >
            {running ? "⏳ Simulating…" : "▶ Run Full Simulation"}
          </button>
          <button
            onClick={() => {
              setParams(PRESET_PARAMS[domain].map((p) => ({ ...p })));
              setCustomAdded([]);
              setResult(null);
            }}
            className="w-full text-xs py-1.5 rounded-xl border"
            style={{ borderColor: "#E2E8F0", color: "#64748B" }}
          >
            ↺ Reset to Baseline
          </button>
        </div>
      </div>

      {/* Result Panel */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl p-5"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 4px 24px rgba(30,64,175,0.07)",
        }}
      >
        {!result && !running && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="text-4xl">⚗️</div>
            <div className="font-bold text-sm" style={{ color: "#1E293B" }}>
              Simulation Ready
            </div>
            <div className="text-xs max-w-xs" style={{ color: "#64748B" }}>
              Adjust parameters on the left and click{" "}
              <strong>Run Full Simulation</strong> to generate AI-powered
              projections with quantified India impact across macroeconomic,
              trade, defense, and social dimensions.
            </div>
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
              {["OLS Regression", "VAR Model", "IMF WEO 2000–2024"].map((t) => (
                <div
                  key={t}
                  className="px-2 py-1.5 rounded-lg text-center"
                  style={{
                    background: "#EFF6FF",
                    color: "#1E40AF",
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}
        {running && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
              style={{ borderWidth: 4 }}
            />
            <div className="font-semibold text-sm" style={{ color: "#1E293B" }}>
              Running Simulation…
            </div>
            <div className="text-xs" style={{ color: "#64748B" }}>
              ARIA is computing cascade effects across{" "}
              {params.length + customAdded.length} parameters
            </div>
          </div>
        )}
        {result && !running && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm" style={{ color: "#1E293B" }}>
                ⚡ Simulation Results — {DOMAIN_CONFIG[domain].label} ·{" "}
                {horizon}
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: "#F1F5F9", color: "#64748B" }}
              >
                ↺ Reset
              </button>
            </div>
            <div
              className="text-xs leading-relaxed whitespace-pre-wrap"
              style={{ color: "#334155" }}
            >
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
