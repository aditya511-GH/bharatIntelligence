"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  DOMAIN_CONFIG,
  DOMAINS,
  DomainKey,
  getRiskLabel,
  truncate,
  formatDate,
} from "@/lib/utils";
import {
  DOMAIN_HEATMAP,
  STATIC_NETWORKS,
  INDIA_RELATIONS,
  INDIA_METRICS,
  IMPACT_CARDS,
  Entity,
  Edge,
} from "./data";
import {
  HeatmapBreakdownPanel,
  NewsItemEnhancements,
  RelMetricRow,
} from "./IntelPanel";
import {
  SimulationControlPanel,
  NationalObjectivesPanel,
  PriorityActionBoard,
  DataCredibilityFooter,
} from "./SimBoard";

// Dynamic imports to avoid SSR issues
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 400,
        borderRadius: 12,
        background: "#DBEAFE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "#64748B",
      }}
    >
      Loading interactive map…
    </div>
  ),
});
const NewsLab = dynamic(() => import("./NewsLab"), { ssr: false });
const SimLab = dynamic(() => import("./SimLab"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────
interface Article {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
}
interface DomainData {
  articles: Article[];
  insights: {
    strategy: string;
    transparency: string;
    nationalAdvantage: string;
  } | null;
  causalChain: string;
  riskScore: number;
}
interface ChartPoint {
  year: string;
  value: number | null;
  secondary?: number | null;
}
interface Scheme {
  name: string;
  description: string;
  url?: string;
}
interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// ─── Risk colours ─────────────────────────────────────────────────────────
function riskColor(s: number) {
  if (s >= 75) return "#EF4444";
  if (s >= 55) return "#F97316";
  if (s >= 35) return "#EAB308";
  return "#22C55E";
}
function riskBg(s: number) {
  if (s >= 75) return { bg: "#FEE2E2", border: "#EF4444", text: "#B91C1C" };
  if (s >= 55) return { bg: "#FFEDD5", border: "#F97316", text: "#C2410C" };
  if (s >= 35) return { bg: "#FEF9C3", border: "#EAB308", text: "#92400E" };
  return { bg: "#DCFCE7", border: "#22C55E", text: "#15803D" };
}

// ─── Mini Sparkline bar for relations ────────────────────────────────────
function Sparkbar({ value }: { value: number }) {
  const bars = [
    Math.max(20, value - 20),
    Math.max(20, value - 10),
    value,
    Math.max(20, value - 5),
    Math.max(20, value - 15),
  ];
  return (
    <div className="flex items-end gap-0.5" style={{ width: 30, height: 16 }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(b / 100) * 100}%`,
            background: i === 2 ? "#1E40AF" : "#BFDBFE",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

// ─── Dynamic Trend Heatmap Sparkline curve ────────────────────────────────
function LineSparkline({
  value,
  color,
  trend,
}: {
  value: number;
  color: string;
  trend: string;
}) {
  let pts: number[] = [];
  const t = trend.toLowerCase();

  // Generate graph points dynamically based on the specific trend
  if (t.includes("rising") || t.includes("escalating")) {
    pts = [
      Math.max(5, value - 45),
      Math.max(10, value - 30),
      Math.max(15, value - 15),
      Math.max(20, value - 5),
      value,
    ];
  } else if (t.includes("declining")) {
    pts = [
      Math.min(95, value + 45),
      Math.min(90, value + 30),
      Math.min(85, value + 15),
      Math.min(80, value + 5),
      value,
    ];
  } else {
    // Stable - wavy but generally flat
    pts = [value - 4, value + 6, value - 5, value + 3, value];
  }

  const min = Math.min(...pts) - 10;
  const max = Math.max(...pts) + 10;
  const range = max - min || 1;
  const w = 100;
  const h = 40;

  // Create smooth bezier curve path
  const points = pts.map(
    (p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - min) / range) * h}`,
  );
  const pathStr = `M 0,${h} L ${points.join(" L ")} L ${w},${h} Z`;
  const cleanColor = color.replace("#", "");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        bottom: 0,
        left: 0,
      }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-${cleanColor}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={pathStr} fill={`url(#grad-${cleanColor})`} />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Chatbot ──────────────────────────────────────────────────────────────

// client-side key rotation: environment variables are baked at build time
const PUBLIC_GEMINI_KEYS = (
  process.env.NEXT_PUBLIC_GEMINI_API_KEYS ??
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
  ""
)
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

// simple Fisher–Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Chatbot({ domain, context }: { domain: DomainKey; context: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!inp.trim() || loading) return;
    const userMsg = inp.trim();
    setInp("");
    setMsgs((p) => [...p, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      console.debug("PUBLIC_GEMINI_KEYS count", PUBLIC_GEMINI_KEYS.length);
      const domainLabel = DOMAIN_CONFIG[domain].label;
      const systemPrompt = `You are ARIA — India's classified strategic intelligence system. Domain: ${domainLabel}. Context: ${context || "National Intelligence Platform"}.

CRITICAL INSTRUCTION: All responses must follow this EXACT structured executive briefing format. No conversational tone. No filler sentences. Output only structured intelligence. Use this format for all responses:

**EXECUTIVE SUMMARY**
[2-3 sentence strategic summary, factual and quantified]

**QUANTIFIED IMPACT**
- GDP: [number]% | Inflation: [number]% | Forex: [₹/$ rate or %] | Trade Balance: [$B]

**DOMAINS AFFECTED**
[Energy □ Trade □ Defense □ Climate □ Technology — mark all that apply with ✓]

**CAUSAL DRIVERS**
1. [Primary driver with % probability]
2. [Secondary driver]
3. [Tertiary driver]

**MONITORING INDICATORS**
- [Indicator 1]: threshold [value]
- [Indicator 2]: threshold [value]

**CONFIDENCE SCORE: [X]%** | Based on: [data sources used]`;
      // cycle through shuffled key pool on 429 responses
      if (PUBLIC_GEMINI_KEYS.length === 0) {
        throw new Error("No public Gemini keys configured");
      }
      const pool = shuffle(PUBLIC_GEMINI_KEYS);
      let res: Response | null = null;
      for (const apiKey of pool) {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: systemPrompt }] },
                {
                  role: "model",
                  parts: [
                    {
                      text: "ARIA intelligence system initialized. Awaiting query.",
                    },
                  ],
                },
                ...msgs.map((m) => ({
                  role: m.role === "assistant" ? "model" : "user",
                  parts: [{ text: m.text }],
                })),
                { role: "user", parts: [{ text: userMsg }] },
              ],
              generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
            }),
          },
        );
        if (res.status === 429) {
          console.warn("key rate-limited, trying next key");
        }
        if (res.status !== 429) break;
      }
      if (!res || !res.ok) throw new Error(`API ${res?.status}`);
      const data = await res.json();
      setMsgs((p) => [
        ...p,
        {
          role: "assistant",
          text:
            data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.",
        },
      ]);
    } catch (err) {
      setMsgs((p) => [
        ...p,
        {
          role: "assistant",
          text: `Error: ${err instanceof Error ? err.message : "Check API key."}`,
        },
      ]);
    }
    setLoading(false);
  }
  const cfg = DOMAIN_CONFIG[domain];
  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        style={{
          background: "linear-gradient(135deg,#1E40AF,#3B82F6)",
          border: "3px solid white",
          zIndex: 9999,
        }}
      >
        <span className="text-xl">{open ? "✕" : "🤖"}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 right-6 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: 360,
              height: 480,
              background: "white",
              border: "1px solid #E2E8F0",
              zIndex: 9999,
            }}
          >
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ background: "linear-gradient(90deg,#1E40AF,#3B82F6)" }}
            >
              <span>🤖</span>
              <div>
                <div className="text-sm font-semibold text-white">
                  ARIA — Strategic Copilot
                </div>
                <div className="text-xs text-blue-200">
                  {cfg.label} domain active
                </div>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2"
              style={{ background: "#F8FAFC" }}
            >
              {!msgs.length && (
                <div
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: "#EFF6FF", color: "#1E40AF" }}
                >
                  Ask me anything about <strong>{cfg.label}</strong>{" "}
                  intelligence.
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                    style={{
                      background: m.role === "user" ? "#1E40AF" : "white",
                      color: m.role === "user" ? "white" : "#1E293B",
                      border:
                        m.role === "assistant" ? "1px solid #E2E8F0" : "none",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className="px-3 py-2 rounded-xl text-xs"
                    style={{
                      background: "white",
                      color: "#64748B",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    ARIA is analyzing…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div
              className="p-3 border-t flex gap-2"
              style={{ borderColor: "#E2E8F0" }}
            >
              <input
                value={inp}
                onChange={(e) => setInp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={`Ask about ${cfg.label}…`}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              />
              <button
                onClick={send}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: "#1E40AF" }}
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export default function OfficialDashboard() {
  // Structural Toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFeedOpen, setIsFeedOpen] = useState(true);

  const [activeDomain, setActiveDomain] = useState<DomainKey>("geopolitics");
  const [domainData, setDomainData] = useState<DomainData | null>(null);
  const [liveHeatmap, setLiveHeatmap] = useState<any[] | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [profileTab, setProfileTab] = useState<
    "Economy" | "Defense" | "Technology" | "Climate"
  >("Economy");
  const [searchQ, setSearchQ] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "feedback" | "mail">(
    "dashboard",
  );
  const [openBreakdown, setOpenBreakdown] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"intelligence" | "newslab" | "simlab">(
    "intelligence",
  );

  const cfg = DOMAIN_CONFIG[activeDomain];
  // Uses real-time fetched data if available, otherwise falls back flawlessly to static
  const heatmap =
    liveHeatmap ?? DOMAIN_HEATMAP[activeDomain] ?? DOMAIN_HEATMAP.geopolitics;
  const network = STATIC_NETWORKS[activeDomain] ?? STATIC_NETWORKS.geopolitics;
  const domainTab =
    activeDomain === "geopolitics" || activeDomain === "economics"
      ? "Economy"
      : activeDomain === "defense"
        ? "Defense"
        : activeDomain === "technology"
          ? "Technology"
          : "Climate";
  const relations =
    INDIA_RELATIONS[activeDomain] ?? INDIA_RELATIONS.geopolitics;
  const metrics = INDIA_METRICS[activeDomain] ?? INDIA_METRICS.geopolitics;
  const impactCards = IMPACT_CARDS[activeDomain] ?? IMPACT_CARDS.geopolitics;

  const fetchData = useCallback(async (domain: DomainKey) => {
    setLoading(true);
    setDomainData(null);
    setChartData([]);
    setSelectedEntity(null);
    setLiveHeatmap(null);
    try {
      const [newsRes, chartRes, schemesRes, heatmapRes] = await Promise.all([
        fetch(`/api/news?domain=${domain}`),
        fetch(`/api/worldbank?domain=${domain}`),
        fetch(
          `/api/schemes?keyword=${DOMAIN_CONFIG[domain].keywords.split(" ")[0]}`,
        ),
        // Safe fetch for real-time heatmap data
        fetch(`/api/heatmap?domain=${domain}`).catch(() => null),
      ]);
      const news = await newsRes.json();
      const chart = await chartRes.json();
      const schemesData = await schemesRes.json();
      const heatmapData = heatmapRes?.ok ? await heatmapRes.json() : null;

      setDomainData({
        articles: news.articles ?? [],
        insights: news.insights ?? null,
        causalChain: news.causalChain ?? "",
        riskScore: news.riskScore ?? 0,
      });
      setChartData(
        (chart.data ?? []).map((d: ChartPoint, i: number) => ({
          ...d,
          secondary: d.value
            ? Math.round(d.value * 0.7 + Math.sin(i) * 5)
            : null,
        })),
      );
      setSchemes((schemesData.schemes ?? []).slice(0, 3));
      if (heatmapData?.data) setLiveHeatmap(heatmapData.data);
    } catch {
      setDomainData({
        articles: [],
        insights: null,
        causalChain: "",
        riskScore: 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(activeDomain);
  }, [activeDomain, fetchData]);
  // Auto-refresh news every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      fetchData(activeDomain);
    }, 30000);
    return () => clearInterval(id);
  }, [activeDomain, fetchData]);

  // Active real-time filter for intelligence feed
  const filteredArticles = (domainData?.articles ?? []).filter(
    (a) =>
      a.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      (a.description &&
        a.description.toLowerCase().includes(searchQ.toLowerCase())),
  );

  const dotColors = [
    "#EF4444",
    "#EAB308",
    "#22C55E",
    "#3B82F6",
    "#8B5CF6",
    "#F97316",
    "#14B8A6",
    "#EC4899",
  ];
  const riskBadge = domainData ? riskBg(domainData.riskScore) : null;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg,#EEF2FF 0%,#F0F9FF 50%,#F0FDF4 100%)",
        color: "#1E293B",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(226,232,240,0.8)",
          boxShadow: "0 2px 12px rgba(30,64,175,0.06)",
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-2.5 border-b"
          style={{ borderColor: "#F1F5F9" }}
        >
          <div className="flex items-center gap-3">
            {mainTab === "intelligence" && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                title="Toggle Sidebar"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            )}
            <span className="text-xl">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="State Emblem of India"
                style={{ width: "24px", height: "auto", objectFit: "contain" }}
              />
            </span>
            <div>
              <div
                className="font-bold text-base"
                style={{
                  color: "#1E40AF",
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                Bharat Intelligence Official Dashboard
              </div>
              <div
                className="text-xs font-semibold"
                style={{ color: "#64748B" }}
              >
                AI-Powered Global Intelligence &amp; Ontology Engine
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-1 border-r pr-4"
              style={{ borderColor: "#E2E8F0" }}
            >
              {(["intelligence", "newslab", "simlab"] as const).map((t, i) => {
                const labels = ["🌐 Intelligence", "📰 News Lab", "⚗️ Sim Lab"];
                return (
                  <button
                    key={t}
                    onClick={() => setMainTab(t)}
                    className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
                    style={{
                      background: mainTab === t ? "#1E40AF" : "transparent",
                      color: mainTab === t ? "white" : "#64748B",
                    }}
                  >
                    {labels[i]}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {[
                ["feedback", "💬 Citizen Feedback"],
                ["mail", "📧 Mail"],
                ["dashboard", "🏠 Dashboard"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() =>
                    setActiveTab(id as "dashboard" | "feedback" | "mail")
                  }
                  className="text-xs px-3 py-1 rounded-full transition-all flex items-center gap-1"
                  style={{
                    background: activeTab === id ? "#EFF6FF" : "#F1F5F9",
                    color: activeTab === id ? "#1E40AF" : "#475569",
                    fontWeight: activeTab === id ? 600 : 400,
                  }}
                >
                  {label}
                  {id === "dashboard" && (
                    <div
                      className="w-3 h-3 rounded-full bg-cover ml-1"
                      style={{
                        backgroundImage:
                          "url('https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/1200px-Flag_of_India.svg.png')",
                      }}
                    />
                  )}
                </button>
              ))}

              {/* Logout Button */}
              <button
                onClick={() => (window.location.href = "/")}
                className="text-xs px-3 py-1 rounded-full transition-all flex items-center gap-1"
                style={{
                  background: "#F1F5F9",
                  color: "#EF4444",
                  fontWeight: 600,
                }}
                title="Logout"
              >
                🚪 Logout
              </button>

              {domainData && (
                <div
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={
                    riskBadge
                      ? {
                          background: riskBadge.bg,
                          color: riskBadge.text,
                          border: `1px solid ${riskBadge.border}`,
                        }
                      : {}
                  }
                >
                  Risk: {getRiskLabel(domainData.riskScore)} (
                  {domainData.riskScore})
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-2">
          {mainTab === "intelligence" && (
            <div
              className="flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5"
              style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <span className="text-sm">🔍</span>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search country, policy, trade route, event, economic indicator…"
                className="flex-1 text-xs outline-none bg-transparent"
                style={{ color: "#334155" }}
              />
            </div>
          )}
          <div
            className={`flex items-center gap-2 flex-shrink-0 ${mainTab !== "intelligence" ? "w-full justify-end" : ""}`}
          >
            {[
              { label: "IMF API Connected", color: "#22C55E", dot: true },
              { label: "World Bank Connected", color: "#22C55E", dot: true },
              { label: "Defense Feed Active", color: "#F97316", dot: true },
              { label: "Trade Delayed", color: "#EF4444", dot: false },
            ].map(({ label, color, dot }) => (
              <div
                key={label}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{
                  background: `${color}15`,
                  color,
                  border: `1px solid ${color}40`,
                }}
              >
                {dot && (
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: color }}
                  />
                )}
                {!dot && <span>⚠</span>}
                {label}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR NAV ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {activeTab === "dashboard" &&
            mainTab === "intelligence" &&
            isSidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="bg-white border-r flex flex-col pt-3 z-10 flex-shrink-0 overflow-hidden"
                style={{ borderColor: "#E2E8F0" }}
              >
                <div className="flex flex-col gap-1 px-2 w-[200px]">
                  {DOMAINS.map((d) => {
                    const c = DOMAIN_CONFIG[d];
                    const isActive = activeDomain === d;
                    return (
                      <button
                        key={d}
                        onClick={() => setActiveDomain(d)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap"
                        style={{
                          background: isActive ? "#F1F5F9" : "transparent",
                          color: isActive ? "#0F172A" : "#64748B",
                          fontWeight: isActive ? 600 : 500,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            style={{ color: isActive ? "#0F172A" : "#94A3B8" }}
                          >
                            {c.icon}
                          </span>
                          {c.label}
                        </div>
                        <span className="text-gray-400">
                          {isActive ? "" : "›"}
                        </span>
                      </button>
                    );
                  })}

                  <hr className="my-2 border-gray-100" />

                  <button
                    onClick={() => setIsFeedOpen(!isFeedOpen)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all text-gray-500 hover:bg-gray-50 font-medium whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <span>🌩️</span> Real-Time Feed
                    </div>
                    <span className="text-xs">{isFeedOpen ? "⌄" : "›"}</span>
                  </button>
                </div>
              </motion.aside>
            )}
        </AnimatePresence>

        {/* ── DASHBOARD TAB CONTENT ─────────────────────────────────────────── */}
        {activeTab === "dashboard" && mainTab === "intelligence" && (
          <div
            className="flex-1 overflow-hidden grid transition-all duration-300 ease-in-out"
            style={{
              gridTemplateColumns: isFeedOpen
                ? "280px 1fr 300px"
                : "0px 1fr 300px",
            }}
          >
            {/* ── LEFT COLUMN (Real-time Feed) ───────────────────────────────── */}
            <div
              className="overflow-y-auto border-r transition-all duration-300"
              style={{
                borderColor: "#E2E8F0",
                background: "white",
                opacity: isFeedOpen ? 1 : 0,
              }}
            >
              <div className="w-[280px]">
                {/* Real-Time Intelligence Feed */}
                <div className="px-4 pt-4 pb-2">
                  <div
                    className="text-xs font-bold mb-3"
                    style={{ color: "#1E293B" }}
                  >
                    📡 Real-Time Intelligence Feed
                  </div>
                  {loading
                    ? [0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="mb-3 h-24 rounded-xl animate-pulse"
                          style={{ background: "#F1F5F9" }}
                        />
                      ))
                    : filteredArticles.slice(0, 5).map((a, i) => {
                        const riskLevels = [
                          "High",
                          "Medium",
                          "High",
                          "Low",
                          "Medium",
                        ];
                        const riskColors = [
                          "#EF4444",
                          "#EAB308",
                          "#EF4444",
                          "#22C55E",
                          "#EAB308",
                        ];
                        const impacts = [
                          "Indo-Pacific stability",
                          "Energy market volatility",
                          "Supply Chain Disruption",
                          "Agricultural output",
                          "Digital economy",
                        ];
                        const minsAgo = [2, 14, 28, 54, 71];
                        const rl = riskColors[i % riskColors.length];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="mb-3 rounded-xl p-3 border"
                            style={{
                              borderColor: "#E2E8F0",
                              borderLeft: `3px solid ${dotColors[i % dotColors.length]}`,
                              background: "#FAFAFA",
                            }}
                          >
                            <div className="flex items-start gap-2 mb-1">
                              <div
                                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                style={{
                                  background: dotColors[i % dotColors.length],
                                }}
                              />
                              <a
                                href={a.url !== "#" ? a.url : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold leading-snug hover:underline flex-1"
                                style={{ color: "#1E293B" }}
                              >
                                {truncate(a.title, 72)}
                              </a>
                            </div>
                            <div className="ml-4 flex flex-wrap gap-1 mb-1">
                              <span
                                className="text-xs"
                                style={{ color: "#64748B" }}
                              >
                                Linked: {cfg.label}, India
                              </span>
                              <span
                                className="text-xs"
                                style={{ color: "#94A3B8" }}
                              >
                                |
                              </span>
                              <span
                                className="text-xs font-semibold"
                                style={{ color: rl }}
                              >
                                Risk Level: {riskLevels[i % riskLevels.length]}
                              </span>
                            </div>
                            <div
                              className="ml-4 text-xs mb-1"
                              style={{ color: "#64748B" }}
                            >
                              Impact:{" "}
                              <span style={{ color: "#374151" }}>
                                {impacts[i % impacts.length]}
                              </span>
                            </div>
                            <NewsItemEnhancements index={i} />
                            <div className="flex items-center gap-1 ml-0 mt-1.5">
                              {["📊", "🔗", "📋", "📤"].map((ic) => (
                                <button
                                  key={ic}
                                  className="text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100"
                                  title="Action"
                                >
                                  {ic}
                                </button>
                              ))}
                              <span
                                className="text-xs ml-1"
                                style={{ color: "#94A3B8" }}
                              >
                                {minsAgo[i % minsAgo.length]}m ago
                              </span>
                              <a
                                href="#"
                                className="text-xs ml-auto font-medium"
                                style={{ color: "#1E40AF" }}
                              >
                                + Add to Analysis
                              </a>
                            </div>
                          </motion.div>
                        );
                      })}
                </div>

                {/* Govt Schemes Exposure */}
                <div className="px-4 pt-2 pb-4">
                  <div
                    className="text-xs font-bold mb-3"
                    style={{ color: "#1E293B" }}
                  >
                    🏛️ Government Schemes Exposure
                  </div>
                  {loading
                    ? [0, 1].map((i) => (
                        <div
                          key={i}
                          className="mb-2 h-20 rounded-xl animate-pulse"
                          style={{ background: "#F1F5F9" }}
                        />
                      ))
                    : (() => {
                        const items =
                          schemes.length > 0
                            ? schemes.slice(0, 2).map((s, i) => ({
                                name: s.name,
                                desc: s.description ?? "",
                                level: i === 0 ? "High" : "Medium",
                                c: i === 0 ? "#EF4444" : "#F97316",
                                bg: i === 0 ? "#FEE2E2" : "#FFEDD5",
                                tags: ["Re: Profile", "Revenue", "Hydrometric"],
                              }))
                            : [
                                {
                                  name: `PM-Kisan Scheme`,
                                  desc: "Extorcial due monsoon delays affecting payouts",
                                  level: "Medium",
                                  c: "#F97316",
                                  bg: "#FFEDD5",
                                  tags: [
                                    "Re: Profile",
                                    "Revenue stable",
                                    "Hydro",
                                  ],
                                },
                                {
                                  name: "Brent Crude Reserves",
                                  desc: "Exposure: High Brent risk | High imports",
                                  level: "High",
                                  c: "#EF4444",
                                  bg: "#FEE2E2",
                                  tags: [
                                    "Strategic",
                                    "32 days cover",
                                    "OPEC risk",
                                  ],
                                },
                              ];
                        return items.map((s, i) => (
                          <div
                            key={i}
                            className="mb-2 rounded-xl p-3 border"
                            style={{
                              borderColor: `${s.c}40`,
                              background: s.bg,
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div
                                className="text-xs font-semibold"
                                style={{ color: "#1E293B" }}
                              >
                                {truncate(s.name, 32)}:{" "}
                                <span style={{ color: s.c }}>{s.level}</span>
                              </div>
                              <span style={{ color: "#64748B", fontSize: 14 }}>
                                ›
                              </span>
                            </div>
                            <div
                              className="text-xs mb-1.5"
                              style={{ color: "#64748B" }}
                            >
                              {truncate(s.desc, 65)}
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {s.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    background: "rgba(0,0,0,0.06)",
                                    color: "#475569",
                                  }}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                </div>
              </div>
            </div>

            {/* ── CENTER COLUMN ─────────────────────────────────────────────── */}
            <div className="overflow-y-auto p-4 space-y-4">
              {/* Strategic Heatmap Updated UI */}
              <div className="bg-transparent mb-2 relative z-30">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    Strategic Heatmap Overview
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchData(activeDomain)}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-white border rounded shadow-sm hover:bg-gray-50 text-gray-700"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {heatmap.map((m) => {
                    const rel = Math.round(
                      simulated ? Math.max(10, m.score - 8) : m.score,
                    );
                    const sparkColor =
                      rel >= 75
                        ? "#EF4444"
                        : rel >= 55
                          ? "#F97316"
                          : rel >= 35
                            ? "#EAB308"
                            : "#22C55E";
                    const isOpen = openBreakdown === m.label;
                    return (
                      <div
                        key={m.label}
                        className="relative bg-white rounded-xl shadow-sm border flex flex-col"
                        style={{ borderColor: "#E2E8F0", height: 120 }}
                      >
                        <div
                          style={{
                            height: 4,
                            width: "100%",
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            backgroundColor: sparkColor,
                          }}
                        />
                        <div className="p-3 pb-1 flex flex-col flex-1 relative z-10">
                          <div className="flex items-center justify-between">
                            <div
                              className="text-sm font-bold"
                              style={{ color: "#1E293B" }}
                            >
                              {m.label}
                            </div>
                            <button
                              onClick={() =>
                                setOpenBreakdown(isOpen ? null : m.label)
                              }
                              className="text-gray-400 hover:text-gray-700 text-lg leading-none cursor-pointer p-1 rounded hover:bg-gray-100"
                              title="View Breakdown"
                            >
                              ⋮
                            </button>
                          </div>

                          <div className="flex flex-col mt-1">
                            <span className="text-[10px] text-gray-500 font-medium">
                              Risk Score: {rel}
                            </span>
                            <div
                              className="text-xs font-semibold flex items-center gap-1 mt-0.5"
                              style={{ color: sparkColor }}
                            >
                              {simulated
                                ? "↘ Improving"
                                : rel >= 70
                                  ? "↗ " + m.trend
                                  : rel >= 50
                                    ? "→ " + m.trend
                                    : "↘ " + m.trend}
                            </div>
                          </div>
                        </div>

                        <div className="w-full flex-1 relative overflow-hidden rounded-b-xl opacity-90">
                          <LineSparkline
                            value={rel}
                            color={sparkColor}
                            trend={m.trend}
                          />
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow opacity-0 hover:opacity-100 transition-opacity cursor-default whitespace-nowrap z-20">
                            Trend Graph
                          </div>
                        </div>

                        {isOpen && (
                          <div className="absolute top-full left-0 mt-2 z-50 w-[240px] shadow-lg">
                            <HeatmapBreakdownPanel
                              label={m.label}
                              score={rel}
                              onClose={() => setOpenBreakdown(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {domainData?.causalChain && (
                  <div
                    className="mt-3 px-3 py-2 rounded-lg text-xs leading-relaxed"
                    style={{
                      background: "#EFF6FF",
                      color: "#1E40AF",
                      borderLeft: "3px solid #3B82F6",
                    }}
                  >
                    <span className="font-semibold">Causal Chain: </span>
                    {domainData.causalChain}
                  </div>
                )}
              </div>

              {/* Geographic Causal Flow Map */}
              <div
                className="bg-white rounded-2xl p-4 shadow-sm border relative z-10"
                style={{ borderColor: "#E2E8F0" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    Causal Flow Map
                  </div>
                  <div className="flex items-center gap-3">
                    {[
                      "Conflict / Sanction",
                      "Alliance / Support",
                      "Trade / Dependency",
                    ].map((t, i) => (
                      <div
                        key={t}
                        className="flex items-center gap-1.5 text-xs text-gray-500"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              i === 0
                                ? "#EF4444"
                                : i === 1
                                  ? "#3B82F6"
                                  : "#22C55E",
                          }}
                        />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <MapView domain={activeDomain} simulated={simulated} />
                {/* Simulation toggle */}
                <div
                  className="mt-3 flex items-center justify-between rounded-xl p-3"
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                >
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSimulated(false)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{
                        background: !simulated ? "#1E40AF" : "#F1F5F9",
                        color: !simulated ? "white" : "#64748B",
                      }}
                    >
                      📊 Current Reality
                    </button>
                    <button
                      onClick={() => setSimulated(true)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{
                        background: simulated ? "#7C3AED" : "#F1F5F9",
                        color: simulated ? "white" : "#64748B",
                      }}
                    >
                      ⚡ Simulated Impact
                    </button>
                  </div>
                  <a
                    href="#"
                    className="text-xs font-medium"
                    style={{ color: "#1E40AF" }}
                  >
                    View Detailed Analysis →
                  </a>
                </div>
                <SimulationControlPanel
                  domain={activeDomain}
                  visible={simulated}
                />
              </div>

              {/* Insights strip */}
              {domainData?.insights && (
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      [
                        "strategy",
                        "🎯 Strategy",
                        "#EFF6FF",
                        "#BFDBFE",
                        "#1E40AF",
                      ],
                      [
                        "transparency",
                        "🔍 Transparency",
                        "#ECFDF5",
                        "#A7F3D0",
                        "#065F46",
                      ],
                      [
                        "nationalAdvantage",
                        "🇮🇳 National Advantage",
                        "#FFFBEB",
                        "#FDE68A",
                        "#92400E",
                      ],
                    ] as [
                      keyof typeof domainData.insights,
                      string,
                      string,
                      string,
                      string,
                    ][]
                  ).map(([key, label, bg, border, col]) => (
                    <div
                      key={key}
                      className="rounded-xl p-3"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <div
                        className="text-xs font-semibold mb-1"
                        style={{ color: col }}
                      >
                        {label}
                      </div>
                      <div
                        className="text-xs leading-relaxed"
                        style={{ color: "#374151" }}
                      >
                        {domainData.insights![key]}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Impact Cards + Objectives + Actions + Footer */}
              <div>
                <div
                  className="text-xs font-bold mb-2"
                  style={{ color: "#1E293B" }}
                >
                  📌 Strategic Impact Assessment
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {impactCards.map((card, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 border"
                      style={{ background: "white", borderColor: "#E2E8F0" }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{card.icon}</span>
                        <div
                          className="font-semibold text-xs"
                          style={{ color: "#1E293B" }}
                        >
                          {card.title}
                        </div>
                        {card.tag && (
                          <span
                            className="ml-auto text-xs px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              background: card.tagColor ?? "#1E40AF",
                              color: "white",
                              fontSize: 9,
                            }}
                          >
                            {card.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: "#64748B" }}>
                        {card.line1}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: "#94A3B8" }}
                      >
                        {card.line2}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right">
                  <a
                    href="#"
                    className="text-xs font-medium"
                    style={{ color: "#1E40AF" }}
                  >
                    View Full Impact Assessment →
                  </a>
                </div>
                <NationalObjectivesPanel />
                <PriorityActionBoard domain={activeDomain} />
                <DataCredibilityFooter />
              </div>
            </div>

            {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
            <div
              className="overflow-y-auto border-l p-4 space-y-4 bg-white"
              style={{ borderColor: "#E2E8F0" }}
            >
              {/* Entity Profile India */}
              <div
                className="rounded-2xl border p-4 shadow-sm"
                style={{ borderColor: "#E2E8F0" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    Entity Profile:{" "}
                    <span style={{ color: "#1E40AF" }}>India</span>
                  </div>
                  <button style={{ color: "#94A3B8" }}>•••</button>
                </div>
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "#64748B" }}
                >
                  Top Bilateral Relations:
                </div>
                <div className="space-y-2.5">
                  {relations.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: dotColors[i] }}
                        />
                        <div className="text-xs">
                          <span
                            className="font-semibold"
                            style={{ color: "#1E293B" }}
                          >
                            {r.country}
                          </span>
                          <span style={{ color: "#64748B" }}>
                            {" "}
                            — {r.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkbar value={r.share} />
                        <span
                          className="text-xs font-bold"
                          style={{ color: "#1E293B" }}
                        >
                          {r.share}%
                        </span>
                        {r.badge && (
                          <span
                            className="text-xs px-1 py-0.5 rounded font-medium"
                            style={{
                              background: "#EFF6FF",
                              color: "#1E40AF",
                              fontSize: 8,
                            }}
                          >
                            {r.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade Deficit Trend */}
              <div
                className="rounded-2xl border p-4 shadow-sm"
                style={{ borderColor: "#E2E8F0" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    Trade Deficit Trend
                  </div>
                  <button className="text-gray-400">•••</button>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  India's trade balance from 2018-2024
                </div>
                {loading ? (
                  <div
                    className="h-32 rounded-xl animate-pulse"
                    style={{ background: "#F1F5F9" }}
                  />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#F97316"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#F97316"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#F1F5F9"
                      />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: "#94A3B8", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#94A3B8", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "white",
                          border: "1px solid #E2E8F0",
                          borderRadius: 8,
                          fontSize: 10,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#F97316"
                        strokeWidth={2}
                        fill="url(#g1)"
                        dot={{
                          fill: "#F97316",
                          r: 3,
                          strokeWidth: 2,
                          stroke: "white",
                        }}
                        name="Trade Volume"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className="h-32 flex items-center justify-center text-xs"
                    style={{ color: "#94A3B8" }}
                  >
                    Fetching indicator data…
                  </div>
                )}
              </div>

              {/* Relationship Overview */}
              <div
                className="rounded-2xl border p-4 shadow-sm"
                style={{ borderColor: "#E2E8F0" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    Relationship Overview
                  </div>
                  <button className="text-gray-400">•••</button>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  India's global influence, or systemic risk, and external
                  dependencies.
                </div>

                <div className="space-y-4">
                  {metrics.slice(1).map((m, i) => {
                    const val = simulated ? m.simScore : m.score;
                    const iconColors = ["#EF4444", "#F97316", "#22C55E"];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] p-1 rounded"
                              style={{
                                backgroundColor: `${iconColors[i]}15`,
                                color: iconColors[i],
                              }}
                            >
                              {i === 0 ? "🌐" : i === 1 ? "⚡" : "🌿"}
                            </span>
                            <div
                              className="text-xs font-medium"
                              style={{ color: "#334155" }}
                            >
                              {m.label}
                            </div>
                          </div>
                          <span
                            className="text-sm font-bold"
                            style={{ color: "#1E293B" }}
                          >
                            {val}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 4,
                            borderRadius: 2,
                            background: "#F1F5F9",
                          }}
                        >
                          <div
                            style={{
                              width: `${val}%`,
                              height: "100%",
                              borderRadius: 2,
                              background: iconColors[i],
                              transition: "width 0.8s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500">
                    Simulated Impact
                  </span>
                  <button
                    onClick={() => setSimulated((v) => !v)}
                    className="relative w-8 h-4 rounded-full transition-all"
                    style={{ background: simulated ? "#7C3AED" : "#CBD5E1" }}
                  >
                    <div
                      className="absolute top-[2px] w-3 h-3 bg-white rounded-full shadow transition-all"
                      style={{ left: simulated ? "calc(100% - 14px)" : "2px" }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── OTHER TABS (NEWS/SIM/FEEDBACK/MAIL) ────────────────────────── */}
        {activeTab === "dashboard" && mainTab === "newslab" && (
          <div className="flex-1 overflow-hidden p-4">
            <NewsLab />
          </div>
        )}
        {activeTab === "dashboard" && mainTab === "simlab" && (
          <div className="flex-1 overflow-hidden p-4">
            <SimLab domain={activeDomain} />
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className="bg-white rounded-2xl p-8 shadow-sm border max-w-2xl mx-auto"
              style={{ borderColor: "#E2E8F0" }}
            >
              <div className="text-4xl mb-4">💬</div>
              <div
                className="font-semibold text-lg mb-2"
                style={{ color: "#1E293B" }}
              >
                Citizen Feedback Stream
              </div>
              <div className="text-sm mb-6" style={{ color: "#64748B" }}>
                Real-time insights from citizen complaints processed by AI.
              </div>
              <div className="space-y-2">
                {[
                  "Infrastructure issues trending in Maharashtra",
                  "Healthcare complaints up 12% this week",
                  "Education scheme interest spiking in UP",
                ].map((item) => (
                  <div
                    key={item}
                    className="px-4 py-3 rounded-xl border text-sm flex items-center gap-2"
                    style={{
                      background: "#F8FAFC",
                      borderColor: "#E2E8F0",
                      color: "#374151",
                    }}
                  >
                    <span style={{ color: "#10B981" }}>◉</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "mail" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className="bg-white rounded-2xl p-8 shadow-sm border text-center max-w-lg mx-auto"
              style={{ borderColor: "#E2E8F0" }}
            >
              <div className="text-4xl mb-3">📭</div>
              <div className="text-sm" style={{ color: "#64748B" }}>
                No complaints yet. Citizen complaint emails will appear here.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chatbot */}
      {activeTab === "dashboard" && (
        <Chatbot
          domain={activeDomain}
          context={domainData?.causalChain ?? ""}
        />
      )}
    </div>
  );
}
