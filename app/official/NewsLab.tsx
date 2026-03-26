"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, RadarChart, Radar, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
} from "recharts";
import { DomainKey, DOMAIN_CONFIG, truncate } from "@/lib/utils";
import { Satellite, BarChart2, Trophy, TrendingUp, Brain, History, Factory, Activity, Check, Map, Radio, Landmark, X } from "lucide-react";

interface Article {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
  urlToImage?: string | null;
}

interface TrendGraphData {
  lineData: { year: string; value: number }[];
  barData: { sector: string; exposure: number }[];
  radarData: { dimension: string; score: number }[];
  lineLabel: string;
  summary: string;
  trendDirection: string;
  peakExposureSector: string;
}

const DOMAINS = ["geopolitics", "economics", "defense", "technology", "climate", "society"] as DomainKey[];

// ── Domain colour accents ─────────────────────────────────────────────────────
const DOMAIN_ACCENT: Record<string, string> = {
  geopolitics: "#1E40AF", economics: "#065F46", defense: "#7F1D1D",
  technology: "#5B21B6", climate: "#064E3B", society: "#92400E",
};

// ── Client-side AI call via /api/ai-complete ─────────────────────────────────
async function callAiProxy(
  userPrompt: string,
  system: string,
  opts: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const res = await fetch("/api/ai-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system,
      messages: [{ role: "user", content: userPrompt }],
      temperature: opts.temperature ?? 0.35,
      max_tokens: opts.max_tokens ?? 1400,
    }),
  });
  if (!res.ok) throw new Error(`AI proxy ${res.status}`);
  const data = await res.json();
  return data.content ?? "";
}

// ── Blinking cursor ───────────────────────────────────────────────────────────
function BlinkCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      style={{ display: "inline-block", width: 2, height: "1em", background: "currentColor", marginLeft: 2, verticalAlign: "text-bottom" }}
    />
  );
}

// ── Article Image ─────────────────────────────────────────────────────────────
function ArticleImage({ src, title }: { src?: string | null; title: string }) {
  const [hasError, setHasError] = useState(false);

  const gradients = [
    "linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%)",
    "linear-gradient(135deg,#1A1A2E 0%,#7C3AED 100%)",
    "linear-gradient(135deg,#0D2E1A 0%,#059669 100%)",
    "linear-gradient(135deg,#2D1B00 0%,#D97706 100%)",
    "linear-gradient(135deg,#1A0A0A 0%,#DC2626 100%)",
    "linear-gradient(135deg,#0A1628 0%,#3B82F6 100%)",
  ];
  const idx = title.charCodeAt(0) % gradients.length;

  if (!hasError && src) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <img
          src={src}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: gradients[idx] }}>
      <div className="text-center px-3">
        <div className="text-white/30 mb-1"><Satellite className="w-8 h-8 mx-auto" /></div>
        <div className="text-white/50 text-xs font-medium leading-tight line-clamp-2">{truncate(title, 50)}</div>
      </div>
    </div>
  );
}

// ── Evaluation Graphs ─────────────────────────────────────────────────────────
function EvaluationGraphs({ articles, scores }: { articles: Article[]; scores: Record<string, number> }) {
  const barData = articles.map((a, i) => ({
    name: truncate(a.title, 28),
    score: scores[`article${i}`] ?? 65,
  }));
  const COLORS = ["#059669", "#7C3AED", "#1E40AF", "#F97316"];
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-4 space-y-4">
      <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#1E293B" }}><BarChart2 className="w-3.5 h-3.5" /> Evaluation Results</div>
      <motion.div initial={{ opacity: 0, scaleX: 0.8 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
        className="rounded-xl p-4 transition-all duration-300 hover:shadow-lg bg-white/70 backdrop-blur-xl" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#64748B" }}><Trophy className="w-3.5 h-3.5 text-amber-500" /> India Impact Scores (0–100)</div>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={barData} barSize={24}>
            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} formatter={(v) => [`${v}/100`, "Impact"]} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
        className="rounded-xl p-4 transition-all duration-300 hover:shadow-lg bg-white/70 backdrop-blur-xl" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#64748B" }}><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Strategic Impact Trajectory</div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={[
            { t: "Now", v: 0 },
            { t: "30D", v: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(scores).length) * 0.4) },
            { t: "90D", v: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(scores).length) * 0.7) },
            { t: "6M", v: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(scores).length) * 0.9) },
            { t: "1Y", v: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(scores).length)) },
          ]}>
            <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1E40AF" stopOpacity={0.3} /><stop offset="95%" stopColor="#1E40AF" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="t" tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} />
            <Area type="monotone" dataKey="v" stroke="#1E40AF" strokeWidth={2} fill="url(#eg)" dot={{ fill: "#1E40AF", r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}

// ── AI Executive Summary after Cabinet Compare ────────────────────────────────
function CompareExecutiveSummary({ articles, groqText, anthropicText, openaiText }: {
  articles: Article[]; groqText: string; anthropicText: string; openaiText: string;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setLoading(true);
    const titles = articles.map(a => `"${a.title}"`).join(", ");
    callAiProxy(
      `You have just reviewed ${articles.length} articles (${titles}) through three analytical lenses:\n\nADVOCATE VIEW:\n${groqText.slice(0, 400)}\n\nCOUNTER VIEW:\n${anthropicText.slice(0, 400)}\n\nEVALUATOR VIEW:\n${openaiText.slice(0, 400)}\n\nNow write a 3-sentence Executive Intelligence Summary for an Indian policy official:\n1. The dominant strategic theme across all articles\n2. The highest-risk implication for India specifically\n3. The single most urgent recommended action\n\nBe direct, quantified, and India-focused. No hedging.`,
      "You are India's senior intelligence analyst synthesizing cabinet debate into actionable executive insight.",
      { temperature: 0.3, max_tokens: 300 },
    ).then(t => { setSummary(t); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4">
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #BFDBFE", background: "linear-gradient(135deg,#EFF6FF,#F0FDF4)" }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "#BFDBFE" }}>
          <Brain className="w-4 h-4 text-blue-600" />
          <div className="text-xs font-bold" style={{ color: "#1E40AF" }}>AI Executive Summary</div>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto font-semibold" style={{ background: "#DBEAFE", color: "#1E40AF" }}>Synthesised</span>
        </div>
        <div className="px-4 py-3">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              <span className="text-xs" style={{ color: "#64748B" }}>Synthesising perspectives…</span>
            </div>
          ) : summary ? (
            <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#1E293B" }}>{summary}</div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ── Trend Analysis 3-Graph Panel ──────────────────────────────────────────────
function TrendGraphsPanel({ data }: { data: TrendGraphData }) {
  const [tab, setTab] = useState<0 | 1 | 2>(0);
  const SECTOR_COLORS = ["#1E40AF", "#7C3AED", "#059669", "#F97316", "#EF4444", "#14B8A6"];

  const TAB_SUMMARIES = [
    `${data.summary} Historical trajectory shows ${data.trendDirection === "rising" ? "escalating" : data.trendDirection === "declining" ? "easing" : "stable"} risk from 2020 to 2025.`,
    `Sector with highest India exposure: ${data.peakExposureSector}. Diversification away from peak-exposure sectors reduces compounded risk.`,
    `Multi-dimensional profile across ${data.radarData.length} risk dimensions. Scores above 70 indicate critical exposure requiring immediate policy attention.`,
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-3">
      <div className="flex gap-1">
        {[[<History key="h" className="w-3.5 h-3.5" />, "Historical"], [<Factory key="f" className="w-3.5 h-3.5" />, "Sectors"], [<Activity key="a" className="w-3.5 h-3.5" />, "Risk Radar"]].map(([icon, label], i) => (
          <button key={i} onClick={() => setTab(i as 0 | 1 | 2)}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: tab === i ? "#1E40AF" : "rgba(241,245,249,0.8)", color: tab === i ? "white" : "#64748B" }}>
            <span className="flex items-center gap-1.5">{icon} {label as string}</span>
          </button>
        ))}
      </div>
      {/* Per-tab contextual explanation */}
      <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF" }}>
        <span className="font-semibold">Analysis: </span>{TAB_SUMMARIES[tab]}
      </div>
      <AnimatePresence mode="wait">
        {tab === 0 && (
          <motion.div key="line" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.3 }}
            className="rounded-xl p-4 transition-all duration-300 hover:shadow-lg bg-white/70 backdrop-blur-xl" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
            <div className="text-xs font-semibold mb-1" style={{ color: "#64748B" }}>{data.lineLabel}</div>
            <div className="text-xs mb-2" style={{ color: "#94A3B8" }}>Trend: <span style={{ color: data.trendDirection === "rising" ? "#EF4444" : "#22C55E", fontWeight: 600 }}>{data.trendDirection === "rising" ? "↗ Rising" : data.trendDirection === "declining" ? "↘ Declining" : "→ Stable"}</span></div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.lineData}>
                <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="year" tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} formatter={(v) => [`${v}`, "Risk Score"]} />
                <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2.5} fill="url(#lg)" dot={{ fill: "#EF4444", r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
        {tab === 1 && (
          <motion.div key="bar" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.3 }}
            className="rounded-xl p-4 transition-all duration-300 hover:shadow-lg bg-white/70 backdrop-blur-xl" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
            <div className="text-xs font-semibold mb-1" style={{ color: "#64748B" }}>India Sector Exposure (%)</div>
            <div className="text-xs mb-2" style={{ color: "#94A3B8" }}>Peak: <span style={{ color: "#1E40AF", fontWeight: 600 }}>{data.peakExposureSector}</span></div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.barData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fill: "#64748B", fontSize: 9 }} axisLine={false} tickLine={false} width={68} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} formatter={(v) => [`${v}%`, "Exposure"]} />
                <Bar dataKey="exposure" radius={[0, 4, 4, 0]}>
                  {data.barData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
        {tab === 2 && (
          <motion.div key="radar" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.3 }}
            className="rounded-xl p-4 transition-all duration-300 hover:shadow-lg bg-white/70 backdrop-blur-xl" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
            <div className="text-xs font-semibold mb-1" style={{ color: "#64748B" }}>Multi-Dimension Risk Profile</div>
            <ResponsiveContainer width="100%" height={190}>
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "#64748B", fontSize: 9 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} />
                <Radar name="Risk" dataKey="score" stroke="#1E40AF" fill="#1E40AF" fillOpacity={0.25} strokeWidth={2} dot={{ fill: "#1E40AF", r: 3 }} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Cabinet Speaker Config ────────────────────────────────────────────────────
const SPEAKERS = [
  { id: "groq", name: "ARIA-G", role: "Advocate", model: "Groq · Llama-3.3", color: "#059669", bg: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", border: "#6EE7B7", avatarColor: "#059669", tag: "1ST PERSON" },
  { id: "anthropic", name: "ARIA-A", role: "Counter", model: "Mixtral-8x7B", color: "#7C3AED", bg: "linear-gradient(135deg,#F5F3FF,#EDE9FE)", border: "#C4B5FD", avatarColor: "#7C3AED", tag: "COUNTER" },
  { id: "openai", name: "ARIA-O", role: "Evaluator", model: "Llama-3.3 · NIM", color: "#1E40AF", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", border: "#93C5FD", avatarColor: "#1E40AF", tag: "EVALUATOR" },
];

type ComparePhase = "idle" | "groq" | "anthropic" | "openai" | "done";

// ── Individual Article Card — Symmetric Square ────────────────────────────────
function ArticleCard({
  article, index, isSelected, onToggle, onTrend, onMap,
}: {
  article: Article; index: number; isSelected: boolean;
  onToggle: () => void; onTrend: () => void; onMap: () => void;
}) {
  const minsAgo = Math.floor((Date.now() - new Date(article.publishedAt).getTime()) / 60000);
  const timeLabel = minsAgo < 60 ? `${minsAgo}m` : minsAgo < 1440 ? `${Math.floor(minsAgo / 60)}h` : `${Math.floor(minsAgo / 1440)}d`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(30,64,175,0.15)] bg-white/70 backdrop-blur-xl"
      onClick={onToggle}
      style={{
        border: isSelected ? "2px solid #3B82F6" : "1px solid rgba(255,255,255,0.6)",
        boxShadow: isSelected ? "0 0 0 4px rgba(59,130,246,0.12), 0 8px 32px rgba(30,64,175,0.1)" : "0 4px 20px rgba(0,0,0,0.04)",
        height: 220,
      }}
    >
      {/* Image — top half */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: 108 }}>
        <ArticleImage src={article.urlToImage} title={article.title} />
        {/* Checkbox */}
        <div className="absolute top-2 left-2 w-4 h-4 rounded flex items-center justify-center"
          style={{ background: isSelected ? "#2563EB" : "rgba(255,255,255,0.9)", border: isSelected ? "2px solid #2563EB" : "2px solid rgba(255,255,255,0.7)" }}>
          {isSelected && <Check style={{ color: "white", width: 9, height: 9 }} />}
        </div>
        {/* Time */}
        <div className="absolute top-2 right-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.9)" }}>{timeLabel}</span>
        </div>
        {/* Source */}
        <div className="absolute bottom-1.5 left-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.55)", color: "white" }}>{truncate(article.source.name, 18)}</span>
        </div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.07),transparent)" }} />
      </div>

      {/* Content — bottom half */}
      <div className="flex flex-col flex-1 p-2.5" style={{ minHeight: 0 }}>
        <h3 className="text-[10px] font-bold leading-snug line-clamp-2 mb-1" style={{ color: "#0F172A" }}>
          {article.title}
        </h3>
        {article.description && (
          <p className="text-[9px] leading-relaxed line-clamp-2 flex-1" style={{ color: "#64748B" }}>
            {article.description}
          </p>
        )}
        <div className="flex gap-1 mt-auto" onClick={(e) => e.stopPropagation()}>
          <button onClick={onTrend}
            className="flex-1 text-[9px] py-1 rounded-lg font-medium bg-slate-100/60 hover:bg-slate-100 transition-all flex items-center justify-center gap-1"
            style={{ color: "#475569", border: "1px solid rgba(255,255,255,0.5)" }}>
            <TrendingUp className="w-2.5 h-2.5" /> Trend
          </button>
          <button onClick={onMap}
            className="flex-1 text-[9px] py-1 rounded-lg font-medium bg-blue-50/60 hover:bg-blue-50 transition-all flex items-center justify-center gap-1"
            style={{ color: "#1E40AF", border: "1px solid rgba(191,219,254,0.6)" }}>
            <Map className="w-2.5 h-2.5" /> Map
          </button>
        </div>
      </div>

      {isSelected && (
        <motion.div layoutId="selected-border" className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: "2px solid #3B82F6", boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.3)" }} />
      )}
    </motion.div>
  );
}

// ── Main NewsLab Component ────────────────────────────────────────────────────
export default function NewsLab({ onArticleMap }: { onArticleMap?: (a: { title: string; description: string | null; domain: string }) => void }) {
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDomain, setActiveDomain] = useState<DomainKey>("geopolitics");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [view, setView] = useState<"grid" | "compare" | "trend">("grid");

  // Cabinet state
  const [comparePhase, setComparePhase] = useState<ComparePhase>("idle");
  const [groqText, setGroqText] = useState("");
  const [anthropicText, setAnthropicText] = useState("");
  const [openaiText, setOpenaiText] = useState("");
  const [compareScores, setCompareScores] = useState<Record<string, number>>({});

  // Trend state
  const [trendArticle, setTrendArticle] = useState<Article | null>(null);
  const [trendGraphData, setTrendGraphData] = useState<TrendGraphData | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendText, setTrendText] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const sources = [fetch(`/api/news?domain=${activeDomain}`), fetch(`/api/news?domain=economics`)];
      if (activeDomain !== "geopolitics") sources.push(fetch(`/api/news?domain=geopolitics`));
      const results = await Promise.all(sources);
      const parsed = await Promise.all(results.map((r) => r.json()));
      const merged: Article[] = [];
      const seen = new Set<string>();
      for (const data of parsed) {
        for (const a of data.articles ?? []) {
          if (!seen.has(a.title)) { seen.add(a.title); merged.push(a); }
        }
      }
      setAllArticles(merged.slice(0, 30));
      setLastUpdate(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch { /* silent */ }
    setLoading(false);
  }, [activeDomain]);

  useEffect(() => { fetchNews(); }, [fetchNews]);
  useEffect(() => { const id = setInterval(fetchNews, 150000); return () => clearInterval(id); }, [fetchNews]);

  const filtered = allArticles.filter(
    (a) => !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleSelect = (url: string) =>
    setSelected((prev) => prev.includes(url) ? prev.filter((u) => u !== url) : prev.length < 4 ? [...prev, url] : prev);

  // ── Cabinet comparison ─────────────────────────────────────────────────────
  async function startCabinetComparison() {
    const arts = allArticles.filter((a) => selected.includes(a.url));
    if (arts.length < 2) return;
    setView("compare"); setComparePhase("groq");
    setGroqText(""); setAnthropicText(""); setOpenaiText(""); setCompareScores({});
    try {
      const res = await fetch("/api/compare-articles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles: arts.map((a) => ({ title: a.title, description: a.description })) }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.phase === "groq" && ev.token) setGroqText((p) => p + ev.token);
            if (ev.phase === "groq_done") setComparePhase("anthropic");
            if (ev.phase === "anthropic" && ev.token) setAnthropicText((p) => p + ev.token);
            if (ev.phase === "anthropic_done") setComparePhase("openai");
            if (ev.phase === "openai" && ev.token) setOpenaiText((p) => p + ev.token);
            if (ev.phase === "openai_done") setComparePhase("done");
            if (ev.phase === "done") setCompareScores(ev.scores ?? {});
          } catch { /* skip */ }
        }
      }
      setComparePhase("done");
    } catch (e) {
      setGroqText((p) => p || `Error: ${e instanceof Error ? e.message : "Unknown"}`);
      setComparePhase("done");
    }
  }

  // ── Trend analysis ─────────────────────────────────────────────────────────
  async function analyzeTrend(article: Article) {
    setTrendArticle(article); setTrendGraphData(null); setTrendText(null);
    setView("trend"); setTrendLoading(true);
    const [graphRes] = await Promise.all([
      fetch("/api/trend-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: article.title, description: article.description, source: article.source.name }),
      }),
      callAiProxy(
        `Perform deep trend analysis on this news article:\nTitle: "${article.title}"\nDescription: ${article.description ?? "N/A"}\nSource: ${article.source.name}\n\nProvide:\n**EXECUTIVE SUMMARY**\n[2-3 sentences: India-specific implications]\n\n**CAUSAL CHAIN**\n[Event] → [Effect] → [India policy impact]\n\n**QUANTIFIED INDIA EXPOSURE**\n- Trade exposure: [$X billion / X%]\n- GDP sensitivity: [±X%]\n- Sector most exposed: [name + exposure]\n\n**CONFIDENCE: [X]%`,
        "You are India's intelligence analyst. Be specific, quantified, and India-focused.",
        { temperature: 0.35, max_tokens: 1200 },
      ).then((t) => setTrendText(t)).catch(() => setTrendText("Analysis unavailable.")),
    ]);
    if (graphRes.ok) setTrendGraphData(await graphRes.json());
    setTrendLoading(false);
  }

  const selectedArticles = allArticles.filter((a) => selected.includes(a.url));
  const accent = DOMAIN_ACCENT[activeDomain] ?? "#1E40AF";

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap p-3.5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 24px rgba(30,64,175,0.07)" }}>
        <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search articles…" className="flex-1 text-xs outline-none bg-transparent" style={{ color: "#334155" }} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {DOMAINS.map((d) => (
            <button key={d} onClick={() => setActiveDomain(d)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{ background: activeDomain === d ? DOMAIN_ACCENT[d] : "rgba(241,245,249,0.8)", color: activeDomain === d ? "white" : "#64748B" }}>
              {(DOMAIN_CONFIG as Record<string, { icon: string; label: string }>)[d].icon}{" "}
              {(DOMAIN_CONFIG as Record<string, { icon: string; label: string }>)[d].label.slice(0, 4)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${loading ? "animate-pulse bg-orange-400" : "bg-green-400"}`} />
          <span className="text-xs" style={{ color: "#64748B" }}>{loading ? "Fetching…" : lastUpdate}</span>
          <button onClick={fetchNews} className="text-xs px-3 py-1.5 rounded-lg border transition-all"
            style={{ borderColor: "#BFDBFE", color: accent, background: "white" }}>↻</button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* ── Article Card Grid ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {/* Header + action bar */}
          <div className="flex items-center justify-between mb-3 px-0.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: "#1E293B" }}>
                <span className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /> Live Feed — <span style={{ color: accent }}>{filtered.length}</span> articles</span>
              </span>
              {selected.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${accent}18`, color: accent }}>
                  {selected.length} selected
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {selected.length >= 2 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={startCabinetComparison}
                  className="text-xs px-4 py-2 rounded-xl font-bold text-white shadow-lg transition-all"
                  style={{ background: `linear-gradient(135deg,${accent},${accent}CC)`, boxShadow: `0 4px 16px ${accent}40` }}>
                  <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" /> Cabinet Compare {selected.length} Articles →</span>
                </motion.button>
              )}
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="text-xs px-3 py-2 rounded-xl border"
                  style={{ borderColor: "#E2E8F0", color: "#64748B", background: "white" }}>Clear</button>
              )}
            </div>
          </div>

          {/* Card grid — 3 symmetric columns */}
          {loading && allArticles.length === 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "rgba(241,245,249,0.8)", height: 220 }}>
                  <div style={{ height: 108, background: "rgba(226,232,240,0.7)" }} />
                  <div className="p-2.5 space-y-2">
                    <div className="h-2.5 rounded-full" style={{ background: "rgba(226,232,240,0.8)", width: "90%" }} />
                    <div className="h-2.5 rounded-full" style={{ background: "rgba(226,232,240,0.6)", width: "70%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 pb-2">
              {filtered.map((a, i) => (
                <ArticleCard
                  key={i}
                  article={a}
                  index={i}
                  isSelected={selected.includes(a.url)}
                  onToggle={() => toggleSelect(a.url)}
                  onTrend={() => analyzeTrend(a)}
                  onMap={() => onArticleMap?.({ title: a.title, description: a.description, domain: activeDomain })}
                />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-3 text-center py-16 text-xs" style={{ color: "#94A3B8" }}>
                  No articles found. Try a different domain or search term.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Analysis Panel (cabinet / trend) ──────────────────────────── */}
        <AnimatePresence>
          {(view === "compare" || view === "trend") && (
            <motion.div
              initial={{ opacity: 0, x: 32, width: 0 }}
              animate={{ opacity: 1, x: 0, width: view === "compare" ? 680 : 420 }}
              exit={{ opacity: 0, x: 32, width: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-shrink-0 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <div className="h-full overflow-y-auto rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.6)",
                  backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(30,64,175,0.08)",
                  width: view === "compare" ? 680 : 420,
                }}>
                {/* Panel header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-sm" style={{ color: "#1E293B" }}>
                    <span className="flex items-center gap-1.5">{view === "compare" ? <><Landmark className="w-4 h-4" /> Cabinet Intelligence Session</> : <><TrendingUp className="w-4 h-4" /> Trend Analysis</>}</span>
                  </div>
                  <button onClick={() => setView("grid")} className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: "#F1F5F9", color: "#64748B" }}><span className="flex items-center gap-1"><X className="w-3 h-3" /> Close</span></button>
                </div>

                {/* ── CABINET COMPARE ──────────────────────────────── */}
                {view === "compare" && (
                  <div>
                    {/* Phase progress */}
                    <div className="flex items-center gap-2 mb-4 px-0.5 flex-wrap">
                      {SPEAKERS.map((s, i) => {
                        const isActive = comparePhase === s.id;
                        const isDone = comparePhase === "done" ||
                          (comparePhase === "anthropic" && i === 0) ||
                          (comparePhase === "openai" && i <= 1);
                        return (
                          <div key={s.id} className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                              style={{ background: isActive ? s.color : isDone ? `${s.color}20` : "#F1F5F9", color: isActive ? "white" : isDone ? s.color : "#94A3B8" }}>
                              {isActive && <motion.div className="w-1.5 h-1.5 rounded-full bg-white" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />}
                              {isDone && !isActive && <Check className="w-3 h-3" />}
                              {s.tag}
                            </div>
                            {i < 2 && <div style={{ color: "#CBD5E1", fontSize: 10 }}>→</div>}
                          </div>
                        );
                      })}
                    </div>

                    {/* 3-Column Cabinet */}
                    <div className="grid grid-cols-3 gap-3">
                      {SPEAKERS.map((s) => {
                        const textMap: Record<string, string> = { groq: groqText, anthropic: anthropicText, openai: openaiText };
                        const text = textMap[s.id] ?? "";
                        const isActive = comparePhase === s.id;
                        const isWaiting = !text && comparePhase !== "done" &&
                          ((s.id === "anthropic" && comparePhase === "groq") ||
                            (s.id === "openai" && (comparePhase === "groq" || comparePhase === "anthropic")));
                        return (
                          <div key={s.id} className="rounded-2xl overflow-hidden flex flex-col"
                            style={{
                              background: s.bg, border: `1.5px solid ${isActive ? s.color : s.border}`,
                              boxShadow: isActive ? `0 0 0 3px ${s.color}20, 0 4px 16px ${s.color}15` : "none",
                              minHeight: 320, transition: "box-shadow 0.3s, border-color 0.3s",
                            }}>
                            {/* Speaker header */}
                            <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${s.border}` }}>
                              <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: s.avatarColor }}><span className="w-2 h-2 rounded-full bg-white" /></span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate" style={{ color: s.color }}>{s.name}</div>
                                <div className="text-xs truncate" style={{ color: `${s.color}99` }}>{s.role} · {s.model}</div>
                              </div>
                              {isActive && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 rounded-full" style={{ background: s.color }} />}
                            </div>
                            {/* Content */}
                            <div className="p-3 flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
                              {isWaiting ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                                  <div className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }}
                                        animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                                    ))}
                                  </div>
                                  <div className="text-xs" style={{ color: `${s.color}80` }}>Waiting…</div>
                                </div>
                              ) : text ? (
                                <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#334155" }}>
                                  {text}{isActive && <BlinkCursor />}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: s.avatarColor + "20", border: `1px solid ${s.avatarColor}` }}><span className="w-3 h-3 rounded-full" style={{ background: s.avatarColor }} /></div>
                                  <div className="text-xs text-center" style={{ color: `${s.color}80` }}>{s.role}<br />will speak when called</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {comparePhase === "done" && Object.keys(compareScores).length > 0 && (
                      <EvaluationGraphs articles={selectedArticles} scores={compareScores} />
                    )}
                    {comparePhase === "done" && (
                      <CompareExecutiveSummary
                        articles={selectedArticles}
                        groqText={groqText}
                        anthropicText={anthropicText}
                        openaiText={openaiText}
                      />
                    )}
                  </div>
                )}

                {/* ── TREND VIEW ─────────────────────────────────────── */}
                {view === "trend" && trendArticle && (
                  <div>
                    <div className="mb-3 p-3 rounded-xl" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
                      <div className="text-xs font-semibold" style={{ color: accent }}>{truncate(trendArticle.title, 80)}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{trendArticle.source.name}</div>
                    </div>
                    {trendLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-8 h-8 rounded-full border-t-transparent animate-spin" style={{ border: `3px solid ${accent}`, borderTopColor: "transparent" }} />
                        <div className="text-xs" style={{ color: "#64748B" }}>ARIA generating trend analysis…</div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {trendText && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="text-xs leading-relaxed whitespace-pre-wrap rounded-xl p-3"
                            style={{ color: "#334155", background: "rgba(248,250,252,0.8)", border: "1px solid #E2E8F0" }}>
                            {trendText}
                          </motion.div>
                        )}
                        {trendGraphData && <TrendGraphsPanel data={trendGraphData} />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
