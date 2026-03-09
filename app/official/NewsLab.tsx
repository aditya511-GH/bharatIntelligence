"use client";
import { useState, useEffect, useCallback } from "react";
import { DomainKey, DOMAIN_CONFIG, truncate } from "@/lib/utils";

interface Article {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
}

// client key rotation for news lab
const PUBLIC_KEYS = (
  process.env.NEXT_PUBLIC_GEMINI_API_KEYS ??
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
  ""
)
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

// helper: Fisher–Yates shuffle (copied from page.tsx)
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
const DOMAINS = [
  "geopolitics",
  "economics",
  "defense",
  "technology",
  "climate",
  "society",
] as DomainKey[];

async function callGemini(prompt: string): Promise<string> {
  if (PUBLIC_KEYS.length === 0) return "No API key configured.";
  // shuffle once per request and try each key sequentially
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
          generationConfig: { temperature: 0.35, maxOutputTokens: 1400 },
        }),
      },
    );
    if (res.status === 429) {
      console.warn("NewsLab key rate-limited, trying next key");
    }
    if (res.status !== 429) break;
  }
  if (!res || !res.ok) throw new Error(`API ${res?.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
}

export default function NewsLab() {
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDomain, setActiveDomain] = useState<DomainKey>("geopolitics");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);
  const [trendArticle, setTrendArticle] = useState<Article | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [view, setView] = useState<"grid" | "compare" | "trend">("grid");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const sources = [
        fetch(`/api/news?domain=${activeDomain}`),
        fetch(`/api/news?domain=economics`),
      ];
      if (activeDomain !== "geopolitics")
        sources.push(fetch(`/api/news?domain=geopolitics`));
      const results = await Promise.all(sources);
      const parsed = await Promise.all(results.map((r) => r.json()));
      const merged: Article[] = [];
      const seen = new Set<string>();
      for (const data of parsed) {
        for (const a of data.articles ?? []) {
          if (!seen.has(a.title)) {
            seen.add(a.title);
            merged.push(a);
          }
        }
      }
      setAllArticles(merged.slice(0, 30));
      setLastUpdate(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch {
      /* fail silently */
    }
    setLoading(false);
  }, [activeDomain]);

  // initial + 30-second auto-refresh
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);
  useEffect(() => {
    const id = setInterval(fetchNews, 30000);
    return () => clearInterval(id);
  }, [fetchNews]);

  const filtered = allArticles.filter(
    (a) =>
      !searchTerm ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggle = (url: string) => {
    setSelected((prev) =>
      prev.includes(url)
        ? prev.filter((u) => u !== url)
        : prev.length < 4
          ? [...prev, url]
          : prev,
    );
  };

  async function analyzeRelationships() {
    const arts = allArticles.filter((a) => selected.includes(a.url));
    if (arts.length < 2) return;
    setAnalyzing(true);
    setAnalysis(null);
    setView("compare");
    const titles = arts
      .map((a, i) => `Article ${i + 1}: "${a.title}" — ${a.description ?? ""}`)
      .join("\n");
    const prompt = `You are India's classified intelligence analyst. Analyze these ${arts.length} news articles for geopolitical relationships and India-specific implications.\n\nArticles:\n${titles}\n\nProvide analysis in this EXACT format:\n\n**RELATIONSHIP MATRIX**\n[For each pair of articles, state the connection: direct/indirect/none, and what connects them]\n\n**COMMON CAUSAL DRIVERS**\n[List 3-5 shared root causes across all articles]\n\n**INDIA IMPACT LAYERS**\n1. Immediate (0-30 days): [specific quantified impacts]\n2. Medium-term (90 days): [impacts]\n3. Strategic (1 year): [impacts]\n\n**INDIA POLICY EXPOSURE**\n[Which Indian government schemes, sectors, or targets are exposed by these combined events]\n\n**RECOMMENDED MONITORING**\n- [3-4 specific indicators to watch]\n\n**CONFIDENCE: [X]%**`;
    try {
      setAnalysis(await callGemini(prompt));
    } catch (e) {
      setAnalysis("Error: " + String(e));
    }
    setAnalyzing(false);
  }

  async function analyzeTrend(article: Article) {
    setTrendArticle(article);
    setTrendAnalysis(null);
    setView("trend");
    setAnalyzing(true);
    const prompt = `You are India's intelligence analyst. Perform deep trend analysis on this news article:\n\nTitle: "${article.title}"\nDescription: ${article.description ?? "N/A"}\nSource: ${article.source.name}\n\nProvide analysis in this EXACT format:\n\n**EXECUTIVE SUMMARY**\n[2-3 sentences: what this means for India specifically]\n\n**HISTORICAL TREND CONTEXT**\n[How does this fit in the last 6-12 months of related events? Give 3+ data points]\n\n**CAUSAL CHAIN FOR INDIA**\n[Event] → [Effect 1] → [Effect 2] → [India policy impact] → [Domestic consequence]\n\n**QUANTIFIED INDIA EXPOSURE**\n- Trade exposure: [$X billion / X%]\n- GDP sensitivity: [±X%]\n- Inflation sensitivity: [±X%]\n- Sector most exposed: [name + exposure]\n\n**RELATED ARTICLES TO MONITOR**\n[3 related topics that would compound this event's impact]\n\n**CONFIDENCE: [X]%** | Sources: [what you'd cite]`;
    try {
      setTrendAnalysis(await callGemini(prompt));
    } catch (e) {
      setTrendAnalysis("Error: " + String(e));
    }
    setAnalyzing(false);
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 flex-wrap p-4 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 4px 24px rgba(30,64,175,0.07)",
        }}
      >
        <div
          className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
        >
          <span>🔍</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search across all articles…"
            className="flex-1 text-xs outline-none bg-transparent"
            style={{ color: "#334155" }}
          />
        </div>
        <div className="flex gap-1">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDomain(d)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background:
                  activeDomain === d ? "#1E40AF" : "rgba(241,245,249,0.8)",
                color: activeDomain === d ? "white" : "#64748B",
              }}
            >
              {DOMAIN_CONFIG[d].icon} {DOMAIN_CONFIG[d].label.slice(0, 4)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${loading ? "animate-pulse bg-orange-400" : "bg-green-400"}`}
          />
          <span className="text-xs" style={{ color: "#64748B" }}>
            {loading ? "Fetching…" : `Updated ${lastUpdate}`}
          </span>
          <button
            onClick={fetchNews}
            className="text-xs px-3 py-1.5 rounded-lg border transition-all"
            style={{
              borderColor: "#BFDBFE",
              color: "#1E40AF",
              background: "white",
            }}
          >
            ↻
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Article Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-xs font-bold" style={{ color: "#1E293B" }}>
              📡 Live Feed — {filtered.length} articles ({selected.length}{" "}
              selected)
            </div>
            <div className="flex gap-2">
              {selected.length >= 2 && (
                <button
                  onClick={analyzeRelationships}
                  className="text-xs px-4 py-1.5 rounded-lg font-bold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg,#1E40AF,#3B82F6)",
                  }}
                >
                  🔗 Compare {selected.length} Articles →
                </button>
              )}
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: "#E2E8F0", color: "#64748B" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {filtered.map((a, i) => {
              const isSelected = selected.includes(a.url);
              const minsAgo = Math.floor(
                (Date.now() - new Date(a.publishedAt).getTime()) / 60000,
              );
              const timeLabel =
                minsAgo < 60
                  ? `${minsAgo}m ago`
                  : minsAgo < 1440
                    ? `${Math.floor(minsAgo / 60)}h ago`
                    : `${Math.floor(minsAgo / 1440)}d ago`;
              return (
                <div
                  key={i}
                  onClick={() => toggle(a.url)}
                  className="rounded-xl p-3 cursor-pointer transition-all"
                  style={{
                    background: isSelected
                      ? "rgba(239,246,255,0.9)"
                      : "rgba(255,255,255,0.8)",
                    border: isSelected
                      ? "2px solid #3B82F6"
                      : "1px solid rgba(226,232,240,0.8)",
                    backdropFilter: "blur(8px)",
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(59,130,246,0.1)"
                      : "none",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                    >
                      {isSelected && (
                        <span className="text-white" style={{ fontSize: 9 }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className="text-xs font-semibold mb-1"
                        style={{ color: "#1E293B" }}
                      >
                        {truncate(a.title, 90)}
                      </div>
                      {a.description && (
                        <div
                          className="text-xs mb-1.5 leading-relaxed"
                          style={{ color: "#64748B" }}
                        >
                          {truncate(a.description, 120)}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: "#EFF6FF", color: "#1E40AF" }}
                        >
                          {a.source.name}
                        </span>
                        <span className="text-xs" style={{ color: "#94A3B8" }}>
                          {timeLabel}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            analyzeTrend(a);
                          }}
                          className="ml-auto text-xs px-2 py-0.5 rounded-lg font-medium"
                          style={{ background: "#F1F5F9", color: "#475569" }}
                        >
                          📈 Trend Analysis
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && filtered.length === 0 && (
              <div
                className="text-center py-12 text-xs"
                style={{ color: "#94A3B8" }}
              >
                No articles found. Try a different domain or search term.
              </div>
            )}
          </div>
        </div>

        {/* Analysis Panel */}
        {(view === "compare" || view === "trend") && (
          <div
            className="w-96 flex-shrink-0 overflow-y-auto rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.6)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(30,64,175,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-sm" style={{ color: "#1E293B" }}>
                {view === "compare"
                  ? "🔗 Cross-Article Intelligence"
                  : "📈 Trend Analysis"}
              </div>
              <button
                onClick={() => setView("grid")}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: "#F1F5F9", color: "#64748B" }}
              >
                ✕ Close
              </button>
            </div>
            {view === "trend" && trendArticle && (
              <div
                className="mb-3 p-3 rounded-xl"
                style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "#1E40AF" }}
                >
                  {truncate(trendArticle.title, 80)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                  {trendArticle.source.name}
                </div>
              </div>
            )}
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div
                  className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"
                  style={{ borderWidth: 3 }}
                />
                <div className="text-xs" style={{ color: "#64748B" }}>
                  ARIA is analyzing…
                </div>
              </div>
            ) : (
              <div
                className="text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: "#334155" }}
              >
                {view === "compare" ? analysis : trendAnalysis}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
