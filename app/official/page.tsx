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
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  DOMAIN_CONFIG,
  DOMAINS,
  DomainKey,
  getRiskLabel,
  truncate,
  formatDate,
  renderMarkdown,
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
import CitizenReportsPanel from "./CitizenReportsPanel";
import { Link as LinkIcon, Bot, Globe, Newspaper, FlaskConical, Users, LayoutDashboard as DashboardIcon, LogOut, Search, CheckCircle2, AlertTriangle, Circle, Map, CloudLightning, Radio, Landmark, BarChart2, ClipboardList, Share2, Target, Brain, Zap, X, Check, MapPin, Leaf } from "lucide-react";

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
  name?: string;
  title?: string;
  description?: string;
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

// ─── Markdown renderer moved to lib/utils.ts ────────────────────────


// ─── Sidebar info explanations per domain+panel ───────────────────────────
const SIDEBAR_EXPLANATIONS: Record<string, Record<string, string>> = {
  geopolitics: {
    entity: "Shows India's top bilateral relations by geopolitical weight. A higher share means greater strategic interdependence — useful for identifying leverage points and vulnerability.",
    trade: "Tracks India's trade volume with key partners over time. Rising values signal increasing integration; sudden drops may indicate sanctions pressure or supply chain shifts.",
    relations: "Quantifies India's systemic risk exposure, escalation potential, and external dependency. Higher scores demand immediate policy attention.",
  },
  economics: {
    entity: "India's primary trade and investment partners by share of economic activity. Russia and China together account for over 50% of energy and goods dependency.",
    trade: "India's trade balance trajectory. A widening deficit at high speed signals forex pressure and potential rupee weakening ahead of RBI intervention.",
    relations: "Key macro resilience metrics. Fiscal vulnerability above 55 with low FX buffers signals pre-crisis conditions requiring pre-emptive monetary action.",
  },
  defense: {
    entity: "India's arms import dependency by source country. Russia at 45% represents significant strategic risk if sanctions tighten further.",
    trade: "Defense spending trend as % of GDP. Sustained increase signals escalating threat environment; decline may indicate budget constraints despite active threats.",
    relations: "Force readiness vs active threat index. The gap between Force Readiness (68) and Threat Index (78) represents current vulnerability window.",
  },
  technology: {
    entity: "India's tech supply chain dependency by source. 78% chip import dependency from USA/Taiwan creates critical vulnerability in electronics manufacturing.",
    trade: "R&D investment flow and innovation output. Low R&D spend relative to GDP limits breakthrough potential despite a large engineering talent pool.",
    relations: "Cyberattack frequency (80) vs AI readiness (55) creates an asymmetric vulnerability — India is a bigger target than it is prepared to defend.",
  },
  climate: {
    entity: "Climate finance and clean tech partnerships. EU and USA are primary funders; losing their support would delay India's 500 GW renewable target.",
    trade: "Renewable capacity addition trend. The steeper the growth curve, the faster India reduces fossil fuel import dependency and carbon liability.",
    relations: "Climate vulnerability vs renewable progress. High vulnerability (77) with improving renewable progress (55→62) shows the race between damage and mitigation.",
  },
  society: {
    entity: "Indian diaspora and migration patterns. USA-based diaspora of 4.5M contributes $35B+ in annual remittances — a key forex stabilizer.",
    trade: "Social development spending trajectory. PM-JAY and income support programs have direct impact on inequality reduction and rural stability.",
    relations: "Social cohesion vs inequality dynamic. Rising youth unemployment (72) against widening inequality (70) creates conditions for social unrest as the primary risk.",
  },
};

// ─── Domain-specific Causal Chain Data ───────────────────────────────────
const CAUSAL_CHAIN_DATA: Record<string, {
  summary: string;
  sections: { title: string; explanation: string; chartType: string; data: Record<string, number | string>[] }[];
}> = {
  geopolitics: {
    summary: "Russia-Ukraine war → oil price surge → India's trade deficit widens → Rupee depreciates → RBI forced to intervene, impacting growth prospects",
    sections: [
      {
        title: "Oil Price vs ₹/$ Exchange Rate",
        chartType: "line",
        explanation: "As Brent crude rises, India's oil import bill surges, pressuring the Rupee. Every $10/bbl rise in oil typically weakens INR by ₹1.2–1.5. This relationship shows India's structural energy vulnerability.",
        data: [
          { month: "Jan'24", oil: 78, inr: 82 }, { month: "Mar'24", oil: 84, inr: 83 },
          { month: "Jun'24", oil: 88, inr: 83.5 }, { month: "Sep'24", oil: 91, inr: 84 },
          { month: "Dec'24", oil: 85, inr: 84.5 }, { month: "Mar'25", oil: 88, inr: 85 },
          { month: "Jun'25", oil: 92, inr: 85.8 }, { month: "Mar'26", oil: 87, inr: 86.5 },
        ],
      },
      {
        title: "India-Russia Trade Volume ($B)",
        chartType: "bar",
        explanation: "India-Russia trade surged post-2022 sanctions as India bought discounted Russian oil. This shows the strategic pivot — creating dependency risk if India-Russia ties deteriorate or secondary sanctions tighten.",
        data: [
          { year: "2020", value: 9 }, { year: "2021", value: 13 }, { year: "2022", value: 35 },
          { year: "2023", value: 66 }, { year: "2024", value: 72 }, { year: "2025", value: 68 }, { year: "2026E", value: 65 },
        ],
      },
      {
        title: "Quad Alliance Strategic Weight",
        chartType: "radar",
        explanation: "The Quad (India-USA-Australia-Japan) alliance spans naval, tech, and supply chain domains. India's weakest score is in defense interoperability — the biggest gap to close for deterrence against China.",
        data: [
          { subject: "Naval", A: 72 }, { subject: "Tech", A: 65 }, { subject: "Trade", A: 58 },
          { subject: "Intel", A: 80 }, { subject: "Interop", A: 45 }, { subject: "Cyber", A: 55 },
        ],
      },
    ],
  },
  economics: {
    summary: "High inflation + RBI rate hold → slowing credit growth → FDI caution → trade deficit persisting → rupee under pressure — a self-reinforcing economic squeeze on India's growth",
    sections: [
      {
        title: "CPI Inflation vs RBI Repo Rate (%)",
        chartType: "line",
        explanation: "The gap between inflation and the repo rate shows real interest rate pressure. When CPI exceeds or equals repo rate, monetary policy loses effectiveness and businesses defer expansion — directly hurting job creation.",
        data: [
          { month: "Jan'24", cpi: 5.7, repo: 6.5 }, { month: "Apr'24", cpi: 4.8, repo: 6.5 },
          { month: "Jul'24", cpi: 5.1, repo: 6.5 }, { month: "Oct'24", cpi: 6.2, repo: 6.5 },
          { month: "Jan'25", cpi: 5.4, repo: 6.25 }, { month: "Jul'25", cpi: 4.9, repo: 6.0 },
          { month: "Jan'26", cpi: 5.1, repo: 6.0 }, { month: "Mar'26", cpi: 4.7, repo: 5.75 },
        ],
      },
      {
        title: "FDI Inflow into India ($B/yr)",
        chartType: "area",
        explanation: "FDI into India plateaued after 2022 peak, signaling investor concerns over regulatory uncertainty and global risk-off sentiment. Recovery in 2025–26 links to PLI scheme success and tech sector investment.",
        data: [
          { year: "2019", value: 51 }, { year: "2020", value: 64 }, { year: "2021", value: 84 },
          { year: "2022", value: 78 }, { year: "2023", value: 71 }, { year: "2024", value: 60 },
          { year: "2025", value: 67 }, { year: "2026E", value: 74 },
        ],
      },
      {
        title: "Trade Deficit by Category ($B)",
        chartType: "bar",
        explanation: "Oil and gold are the two largest deficit drivers. Non-oil, non-gold trade is actually in surplus — meaning India's trade problem is energy dependency and store-of-value imports, not industrial weakness.",
        data: [
          { category: "Oil", value: 112 }, { category: "Gold", value: 45 },
          { category: "Electronics", value: 38 }, { category: "Machinery", value: 22 },
          { category: "Chemicals", value: 18 }, { category: "Others", value: 30 },
        ],
      },
    ],
  },
  defense: {
    summary: "China's LAC infrastructure buildup → Indian Army deployment surge → defense budget pressure → delayed indigenisation → foreign arms dependency sustained — creating a vulnerability cycle",
    sections: [
      {
        title: "LAC Incursions vs Defense Spend",
        chartType: "line",
        explanation: "Rising Chinese incursion events correlate directly with India's defense budget increases. India is in a reactive spending posture — each LAC escalation forces unplanned capital reallocation away from welfare spending.",
        data: [
          { year: "2020", incursions: 35, spend: 2.1 }, { year: "2021", incursions: 42, spend: 2.2 },
          { year: "2022", incursions: 55, spend: 2.3 }, { year: "2023", incursions: 63, spend: 2.4 },
          { year: "2024", incursions: 70, spend: 2.4 }, { year: "2025", incursions: 78, spend: 2.5 },
          { year: "2026E", incursions: 72, spend: 2.6 },
        ],
      },
      {
        title: "Arms Import Sources (% share)",
        chartType: "pie",
        explanation: "Russia still dominates India's arms imports at 45%. Post-sanctions diversification is underway (France, USA) but takes 5–10 years for platform integration — leaving India strategically exposed in the short term.",
        data: [
          { name: "Russia", value: 45 }, { name: "France", value: 18 },
          { name: "USA", value: 15 }, { name: "Israel", value: 10 },
          { name: "Other", value: 12 },
        ],
      },
      {
        title: "Cyber Incidents on India (per 1000/yr)",
        chartType: "area",
        explanation: "State-sponsored cyber attacks on Indian infrastructure are accelerating. The 2024–26 spike aligns with increased AI-powered APT capabilities from China and Pakistan. CERT-In response capacity is outpaced.",
        data: [
          { year: "2020", value: 95 }, { year: "2021", value: 145 }, { year: "2022", value: 200 },
          { year: "2023", value: 270 }, { year: "2024", value: 380 }, { year: "2025", value: 490 },
          { year: "2026E", value: 520 },
        ],
      },
    ],
  },
  technology: {
    summary: "US chip export controls → India's 78% import dependency exposed → semiconductor fab delayed → AI stack constrained → digital public infrastructure stalls → tech competitiveness gap widens vs China",
    sections: [
      {
        title: "Chip Import Dependency Reduction Roadmap",
        chartType: "bar",
        explanation: "India's chip import dependency is projected to decline from 78% only after domestic fabs (Gujarat, Assam) scale up post-2027. Until then, every US-China tech war escalation directly disrupts Indian electronics manufacturing.",
        data: [
          { year: "2023", value: 82 }, { year: "2024", value: 80 }, { year: "2025", value: 78 },
          { year: "2026E", value: 76 }, { year: "2027E", value: 71 }, { year: "2028E", value: 62 }, { year: "2030E", value: 48 },
        ],
      },
      {
        title: "R&D Spend vs AI Startup Count",
        chartType: "scatter",
        explanation: "India's AI startup ecosystem is growing faster than R&D investment — indicating capital-efficient innovation but also fragility. Without government R&D support reaching 2%+ of GDP, deep-tech breakthroughs remain unlikely.",
        data: [
          { x: 0.6, y: 180, year: "2020" }, { x: 0.65, y: 320, year: "2021" },
          { x: 0.68, y: 580, year: "2022" }, { x: 0.7, y: 890, year: "2023" },
          { x: 0.72, y: 1200, year: "2024" }, { x: 0.73, y: 1580, year: "2025" },
          { x: 0.75, y: 1900, year: "2026E" },
        ],
      },
      {
        title: "Cyberthreat Index vs AI Readiness",
        chartType: "line",
        explanation: "The diverging gap — rising cyber threats (now 80) against lagging AI defense readiness (55) — is India's most dangerous asymmetry. Each point of difference represents unprotected critical infrastructure exposure.",
        data: [
          { year: "2021", threat: 55, readiness: 40 }, { year: "2022", threat: 62, readiness: 44 },
          { year: "2023", threat: 70, readiness: 48 }, { year: "2024", threat: 75, readiness: 51 },
          { year: "2025", threat: 80, readiness: 55 }, { year: "2026E", threat: 84, readiness: 60 },
        ],
      },
    ],
  },
  climate: {
    summary: "Monsoon deficit → Kharif food crop shock → food inflation spike → RBI dilemma → rural distress → PM-KISAN fiscal pressure — all while India races to meet its 500 GW renewable target by 2030",
    sections: [
      {
        title: "Monsoon Deficit Trend (% below normal)",
        chartType: "area",
        explanation: "The monsoon has shown increasing deficit frequency since 2020 — directly correlating with El Niño intensification. A deficit above 20% triggers significant agricultural distress in NW India where 60% of wheat is grown.",
        data: [
          { year: "2019", value: 10 }, { year: "2020", value: 4 }, { year: "2021", value: -2 },
          { year: "2022", value: 8 }, { year: "2023", value: 18 }, { year: "2024", value: 16 },
          { year: "2025", value: 22 }, { year: "2026E", value: 14 },
        ],
      },
      {
        title: "Solar Capacity Addition (GW/year)",
        chartType: "bar",
        explanation: "Solar installation pace is the single best indicator of India's energy transition velocity. The 2025–26 surge is driven by PM-SuryaGhar scheme and state-level RPO mandates — but grid integration remains a bottleneck.",
        data: [
          { year: "2020", value: 8.5 }, { year: "2021", value: 10.2 }, { year: "2022", value: 14.8 },
          { year: "2023", value: 18.8 }, { year: "2024", value: 24.3 }, { year: "2025", value: 28.1 },
          { year: "2026E", value: 32 },
        ],
      },
      {
        title: "Air Quality Index — Major Cities",
        chartType: "bar",
        explanation: "India's 6 most polluted cities exceed WHO safe limits by 10–20x. The AQI trend shows seasonal worsening (Oct–Feb) linked to stubble burning and thermal inversions — imposing $95B annual health costs.",
        data: [
          { city: "Delhi", value: 185 }, { city: "Kolkata", value: 142 },
          { city: "Mumbai", value: 98 }, { city: "Patna", value: 168 },
          { city: "Lucknow", value: 155 }, { city: "Bengaluru", value: 72 },
        ],
      },
    ],
  },
  society: {
    summary: "Youth unemployment at 23% + widening Gini coefficient → urban-rural inequality escalation → PM-JAY enrollment under pressure → social cohesion risk rising — a convergence of structural pressures on India's social contract",
    sections: [
      {
        title: "Youth Unemployment Rate (%)",
        chartType: "area",
        explanation: "India's 15–24 age group unemployment at 23% masks a deeper crisis: 45%+ of graduates are underemployed. This demographic dividend is turning into a liability unless 8–10M jobs are created annually by 2030.",
        data: [
          { year: "2019", value: 18 }, { year: "2020", value: 27 }, { year: "2021", value: 32 },
          { year: "2022", value: 28 }, { year: "2023", value: 24 }, { year: "2024", value: 23 },
          { year: "2025", value: 23 }, { year: "2026E", value: 21 },
        ],
      },
      {
        title: "Gini Coefficient (Income Inequality)",
        chartType: "line",
        explanation: "India's Gini coefficient rose steadily through the pandemic era. A reading above 0.50 puts India in the 'high inequality' band — above the threshold where inequality begins to directly reduce economic growth through demand suppression.",
        data: [
          { year: "2018", value: 0.47 }, { year: "2020", value: 0.49 }, { year: "2021", value: 0.52 },
          { year: "2022", value: 0.51 }, { year: "2023", value: 0.51 }, { year: "2024", value: 0.51 },
          { year: "2025", value: 0.50 }, { year: "2026E", value: 0.49 },
        ],
      },
      {
        title: "PM-JAY Enrollment (Million beneficiaries)",
        chartType: "bar",
        explanation: "PM-JAY's enrollment growth signals expanding healthcare access for India's bottom 40%. Stagnation in utilization (vs enrollment) reveals a gap — people are enrolled but not accessing care due to supply-side hospital shortages in Tier 2/3 cities.",
        data: [
          { year: "2020", value: 420 }, { year: "2021", value: 480 }, { year: "2022", value: 520 },
          { year: "2023", value: 560 }, { year: "2024", value: 580 }, { year: "2025", value: 600 },
          { year: "2026E", value: 630 },
        ],
      },
    ],
  },
};

// ─── Causal Chain Card Component ──────────────────────────────────────────
const PIE_COLORS = ["#3B82F6", "#F97316", "#EF4444", "#22C55E", "#8B5CF6"];

function CausalChainCard({ domain, causalChain }: { domain: DomainKey; causalChain: string }) {
  const [expanded, setExpanded] = useState(false);
  const data = CAUSAL_CHAIN_DATA[domain];
  if (!data) return null;

  const summaryText = causalChain && causalChain.length > 20 ? causalChain : data.summary;

  function renderChart(section: typeof data.sections[0]) {
    const chartData = section.data;
    switch (section.chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
              <XAxis dataKey={Object.keys(chartData[0]).find(k => typeof chartData[0][k] === "string") ?? "month"} tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} />
              {Object.keys(chartData[0]).filter(k => typeof chartData[0][k] === "number").map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={PIE_COLORS[i]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
              <XAxis dataKey={Object.keys(chartData[0]).find(k => typeof chartData[0][k] === "string") ?? "year"} tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} />
              <Bar dataKey={Object.keys(chartData[0]).find(k => typeof chartData[0][k] === "number") ?? "value"} radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="causalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
              <XAxis dataKey={Object.keys(chartData[0]).find(k => typeof chartData[0][k] === "string") ?? "year"} tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} />
              <Area type="monotone" dataKey={Object.keys(chartData[0]).find(k => typeof chartData[0][k] === "number") ?? "value"} stroke="#3B82F6" strokeWidth={2} fill="url(#causalAreaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 8 }}>
                {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case "radar":
        return (
          <ResponsiveContainer width="100%" height={130}>
            <RadarChart data={chartData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748B", fontSize: 8 }} />
              <Radar name="Score" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={130}>
            <ScatterChart margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" />
              <XAxis type="number" dataKey="x" name="R&D % GDP" tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <YAxis type="number" dataKey="y" name="AI Startups" tick={{ fill: "#94A3B8", fontSize: 8 }} axisLine={false} tickLine={false} width={30} />
              <ZAxis range={[30, 30]} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10 }} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartData} fill="#3B82F6" opacity={0.8} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  }

  return (
    <motion.div
      className="mt-3 rounded-2xl overflow-hidden relative"
      style={{
        background: "#06B6D4",
        boxShadow: "0 4px 24px rgba(6,182,212,0.35), 0 1px 4px rgba(6,182,212,0.2)",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Summary header — always visible, click to expand */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 relative z-10"
      >
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.1)", color: "#0F172A" }}>
            <LinkIcon style={{ width: 14, height: 14 }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold mb-0.5 uppercase tracking-wide flex items-center gap-2" style={{ color: "rgba(15,23,42,0.75)" }}>
            Causal Chain Analysis
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: "rgba(15,23,42,0.1)", color: "#0F172A", border: "1px solid rgba(15,23,42,0.2)" }}>LIVE</span>
          </div>
          <div className="text-sm font-semibold leading-snug" style={{ color: "#0F172A" }}>
            {summaryText}
          </div>
        </div>
        <div className="flex-shrink-0 text-lg mt-0.5" style={{ color: "rgba(15,23,42,0.7)" }}>
          {expanded ? "▲" : "▼"}
        </div>
      </button>

      {/* Expanded 3-section chart view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="grid grid-cols-3 gap-3 px-4 pb-4 relative z-10"
              style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
            >
              {data.sections.map((section, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 flex flex-col gap-2"
                  style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 2px 12px rgba(30,64,175,0.15)" }}
                >
                  <div className="text-xs font-bold" style={{ color: "#1E293B" }}>
                    {section.title}
                  </div>
                  {renderChart(section)}
                  <div className="text-[10px] leading-relaxed" style={{ color: "#64748B" }}>
                    {section.explanation}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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

// client-side key rotation: Groq keys baked at build time
const PUBLIC_GROQ_KEYS = (
  process.env.NEXT_PUBLIC_GROQ_API_KEYS ??
  process.env.NEXT_PUBLIC_GROQ_API_KEY ??
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
      if (PUBLIC_GROQ_KEYS.length === 0) {
        throw new Error("No Groq API keys configured");
      }
      const domainLabel = DOMAIN_CONFIG[domain].label;
      // Smart intent detection — decide if the message is casual or domain-related
      const lowerMsg = userMsg.toLowerCase();
      const casualPatterns = /^(hi|hello|hey|howdy|sup|what'?s up|how are you|good morning|good night|good evening|haha|lol|thanks|thank you|nice|ok|okay|cool|great|bye|goodbye|who are you|what do you do|joke|tell me a joke|funny)[\.!\?,]*$/;
      const isCasual = casualPatterns.test(lowerMsg.trim());
      const systemPrompt = isCasual
        ? `You are ARIA, a helpful and friendly AI assistant on the Bharat Intelligence platform. Respond naturally and conversationally. Keep responses concise and warm. Current date: March 2026. If asked about yourself, say you're an AI that can discuss India's geopolitics, economics, defense, technology, climate, and social issues.`
        : `You are ARIA — India's classified strategic intelligence system. Current date: March 2026. Domain: ${domainLabel}. Context: ${context || "National Intelligence Platform"}.

DATA CUTOFF: Use only information from 2020–March 2026. Never cite events or data from before 2020 unless they are baseline reference points.

CRITICAL INSTRUCTION: For domain-related questions, use this EXACT structured format:

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

**CONFIDENCE SCORE: [X]%** | Based on: [data sources used, all from 2020–2026]`;
      const pool = shuffle(PUBLIC_GROQ_KEYS);
      let res: Response | null = null;
      for (const apiKey of pool) {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...msgs.map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.text,
              })),
              { role: "user", content: userMsg },
            ],
            temperature: 0.4,
            max_tokens: 1200,
          }),
        });
        if (res.status === 429) {
          console.warn("ARIA: Groq key rate-limited, trying next");
        }
        if (res.status !== 429) break;
      }
      if (!res || !res.ok) throw new Error(`API ${res?.status}`);
      const data = await res.json();
      setMsgs((p) => [
        ...p,
        {
          role: "assistant",
          text: data.choices?.[0]?.message?.content ?? "No response.",
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
        {open ? <X className="w-5 h-5 text-white" /> : <Bot className="w-6 h-6 text-white" />}
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
              <Bot className="w-4 h-4 text-white" />
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
                    {m.role === "assistant" ? (
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                    ) : (
                      m.text
                    )}
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

// ─── Overview Dashboard Component ─────────────────────────────────────────
const OVERVIEW_ARTICLES = [
  { domain: "Geopolitics", color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", headline: "India-Russia S-400 integration completes amid US pressure — strategic autonomy test", impact: "India's defense independence strategy vs Quad alignment", tag: "CRITICAL" },
  { domain: "Economics", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", headline: "RBI cuts repo rate to 5.75% as CPI falls to 4.7% for first time since March 2024", impact: "First rate cut in 3 years — signals economic easing cycle beginning", tag: "LIVE" },
  { domain: "Defense", color: "#4A148C", bg: "#F5F3FF", border: "#C4B5FD", headline: "PLA deploys 3 new brigades near Depsang Plain — LAC alert level raised to RED", impact: "Most significant LAC build-up since 2020 Galwan — India mobilizes reserves", tag: "ALERT" },
  { domain: "Technology", color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA", headline: "India's first domestic semiconductor chip rolls off Tata Electronics fab in Gujarat", impact: "Reduces import dependency from 82% — benchmark moment for Make in India tech", tag: "MILESTONE" },
  { domain: "Climate", color: "#166534", bg: "#F0FDF4", border: "#A7F3D0", headline: "India achieves 32% renewable in national grid for first time — COP30 commitments met", impact: "Ahead of schedule on NDC targets — unlocks $2B in green climate fund", tag: "ACHIEVED" },
  { domain: "Society", color: "#881337", bg: "#FFF1F2", border: "#FECDD3", headline: "Youth unemployment at 21% — lowest in 7 years as PM's job creation push shows results", impact: "Manufacturing sector absorbing 1.2M new workers; IT sector adds 400K", tag: "POSITIVE" },
];

const OVERVIEW_GRAPHS = [
  { title: "GDP Growth Rate (%)", domain: "Economics", data: [{ year: "2021", value: 8.7 }, { year: "2022", value: 7.2 }, { year: "2023", value: 7.6 }, { year: "2024", value: 6.4 }, { year: "2025", value: 6.8 }, { year: "2026E", value: 7.1 }], type: "area", color: "#06B6D4", aiSummary: "AI Projection: Positive delta detected. Domestic consumption stabilization is acting as a primary catalyst." },
  { title: "Defense Spend ($B)", domain: "Defense", data: [{ year: "2021", value: 66 }, { year: "2022", value: 70 }, { year: "2023", value: 73 }, { year: "2024", value: 75 }, { year: "2025", value: 79 }, { year: "2026E", value: 84 }], type: "bar", color: "#8B5CF6", aiSummary: "AI Projection: Upward quantum momentum. Indigenous procurement mandates are driving a 12% baseline spike." },
  { title: "China Threat Index", domain: "Defense", data: [{ year: "2021", value: 62 }, { year: "2022", value: 70 }, { year: "2023", value: 75 }, { year: "2024", value: 80 }, { year: "2025", value: 85 }, { year: "2026E", value: 82 }], type: "line", color: "#EC4899", aiSummary: "AI Projection: Marginal decompression expected in Q3 2026 following bilateral diplomatic saturation." },
  { title: "Renewable Capacity (GW)", domain: "Climate", data: [{ year: "2021", value: 100 }, { year: "2022", value: 128 }, { year: "2023", value: 162 }, { year: "2024", value: 205 }, { year: "2025", value: 250 }, { year: "2026E", value: 310 }], type: "area", color: "#10B981", aiSummary: "AI Projection: Exponential surge. Grid-scale battery integration is accelerating the adoption curve." },
  { title: "Geopolit. Risk Score", domain: "Geopolitics", data: [{ year: "2021", value: 55 }, { year: "2022", value: 68 }, { year: "2023", value: 72 }, { year: "2024", value: 78 }, { year: "2025", value: 74 }, { year: "2026E", value: 70 }], type: "line", color: "#F59E0B", aiSummary: "AI Projection: Variance cooling. Multi-aligned strategic positioning reduces sub-systemic impact probability." },
  { title: "Geopolit. Quad Index", domain: "Geopolitics", data: [{ year: "2022", value: 45 }, { year: "2023", value: 58 }, { year: "2024", value: 65 }, { year: "2025", value: 72 }, { year: "2026E", value: 78 }], type: "bar", color: "#3B82F6", aiSummary: "AI Projection: Network density rising. Tech-military interoperability protocols are solidifying." },
  { title: "Digital Economy ($B)", domain: "Technology", data: [{ year: "2021", value: 200 }, { year: "2022", value: 310 }, { year: "2023", value: 420 }, { year: "2024", value: 530 }, { year: "2025", value: 680 }, { year: "2026E", value: 850 }], type: "area", color: "#D946EF", aiSummary: "AI Projection: Hyper-growth state. AI infrastructure and deeptech DPI expansions outpace global averages." },
  { title: "Social Equity Index", domain: "Society", data: [{ year: "2021", value: 42 }, { year: "2022", value: 44 }, { year: "2023", value: 46 }, { year: "2024", value: 48 }, { year: "2025", value: 51 }, { year: "2026E", value: 54 }], type: "line", color: "#14B8A6", aiSummary: "AI Projection: Steady linear progression. Targeted direct benefit transfers closing rural disparity loops." },
];

function OverviewMiniChart({ g }: { g: typeof OVERVIEW_GRAPHS[0] }) {
  if (g.type === "area") return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={g.data} margin={{ top: 10, right: 10, left: -15, bottom: 12 }}>
        <defs>
          <linearGradient id={`ovg-${g.domain}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={g.color} stopOpacity={0.6} />
            <stop offset="95%" stopColor={g.color} stopOpacity={0} />
          </linearGradient>
          <filter id={`glow-${g.domain}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 8 }} axisLine={false} tickLine={false} label={{ value: 'Timeline (Years)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em' }} />
        <YAxis tick={{ fill: "#64748B", fontSize: 8 }} axisLine={false} tickLine={false} label={{ value: 'Value/Index', angle: -90, position: 'insideLeft', offset: 12, fill: '#475569', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em' }} />
        <Tooltip cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", borderColor: g.color, fontSize: 10, borderRadius: 8, color: "white", boxShadow: `0 0 15px ${g.color}40` }} itemStyle={{ color: g.color }} />
        <Area type="monotone" dataKey="value" stroke={g.color} fill={`url(#ovg-${g.domain})`} strokeWidth={2.5} dot={false} filter={`url(#glow-${g.domain})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
  if (g.type === "bar") return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={g.data} margin={{ top: 10, right: 10, left: -15, bottom: 12 }}>
        <defs>
          <linearGradient id={`bar-${g.domain}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={g.color} stopOpacity={0.8} />
            <stop offset="100%" stopColor={g.color} stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 8 }} axisLine={false} tickLine={false} label={{ value: 'Timeline (Years)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em' }} />
        <YAxis tick={{ fill: "#64748B", fontSize: 8 }} axisLine={false} tickLine={false} label={{ value: 'Value/Index', angle: -90, position: 'insideLeft', offset: 12, fill: '#475569', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em' }} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", borderColor: g.color, fontSize: 10, borderRadius: 8, color: "white", boxShadow: `0 0 15px ${g.color}40` }} itemStyle={{ color: g.color }} />
        <Bar dataKey="value" fill={`url(#bar-${g.domain})`} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
  return (
    <ResponsiveContainer width="100%" height={100}>
      <LineChart data={g.data} margin={{ top: 10, right: 10, left: -15, bottom: 12 }}>
        <defs>
          <filter id={`glow-${g.domain}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 8 }} axisLine={false} tickLine={false} label={{ value: 'Timeline (Years)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em' }} />
        <YAxis tick={{ fill: "#64748B", fontSize: 8 }} axisLine={false} tickLine={false} label={{ value: 'Value/Index', angle: -90, position: 'insideLeft', offset: 12, fill: '#475569', fontSize: 7, fontWeight: 700, letterSpacing: '0.05em' }} />
        <Tooltip cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", borderColor: g.color, fontSize: 10, borderRadius: 8, color: "white", boxShadow: `0 0 15px ${g.color}40` }} itemStyle={{ color: g.color }} />
        <Line type="monotone" dataKey="value" stroke={g.color} strokeWidth={2.5} dot={{ r: 2, fill: g.color, strokeWidth: 0 }} filter={`url(#glow-${g.domain})`} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function OverviewDashboard({ onSelectDomain }: { onSelectDomain: (d: DomainKey) => void }) {
  return (
    <div className="overflow-y-auto p-6 space-y-6 h-full">
      {/* Header */}
      <div>
        <div className="font-bold text-base mb-0.5 flex items-center gap-2" style={{ color: "#1E293B" }}><Globe className="w-4 h-4 text-blue-600" /> India Intelligence Overview</div>
        <div className="text-xs" style={{ color: "#64748B" }}>Most impactful current event from each strategic domain — what matters right now for India, {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      {/* India Relations Overview Map */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.5)", boxShadow: "0 4px 24px rgba(30,64,175,0.08)" }}>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#1E293B" }}><Map className="w-3.5 h-3.5 text-blue-600" /> India's Top Relations — One Per Domain</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>
              Most strategically significant bilateral relation currently active · Updated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" }}>DAILY FETCH</span>
        </div>
        {/* SVG Relation Network */}
        <div className="relative px-2 pb-4 pt-4" style={{ height: 260 }}>
          <svg viewBox="0 0 700 240" style={{ width: "100%", height: "100%", overflow: "visible" }} className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <defs>
              <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="slightGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="hubGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E40AF" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>

            {/* Neural Links & Pulse Animations */}
            {[
              { label: "Russia", sub: "Oil · S-400", x: 150, y: 35, color: "#1E40AF", mark: "geo", tag: "Geopolitics" },
              { label: "USA", sub: "FDI · Tech", x: 550, y: 35, color: "#22C55E", mark: "eco", tag: "Economics" },
              { label: "China PLA", sub: "LAC border", x: 570, y: 120, color: "#8B5CF6", mark: "def", tag: "Defense" },
              { label: "TSMC", sub: "Chip supply", x: 550, y: 205, color: "#F59E0B", mark: "tech", tag: "Technology" },
              { label: "Arctic Melt", sub: "Monsoon risk", x: 150, y: 205, color: "#10B981", mark: "cli", tag: "Climate" },
              { label: "Gulf Workers", sub: "8M Indians", x: 130, y: 120, color: "#EC4899", mark: "soc", tag: "Society" },
            ].map(({ label, sub, x, y, color, tag }, i) => {
              const cx = 350; const cy = 120;
              // Clean cubic bezier routing from hub to node
              const pathD = `M ${cx} ${cy} C ${(cx + x) / 2} ${cy}, ${(cx + x) / 2} ${y}, ${x} ${y}`;

              return (
                <g key={`path-${label}`}>
                  <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.4" />
                  {/* Pulsing data orb running along the path */}
                  <circle r="4" fill={color} filter="url(#nodeGlow)">
                    <animateMotion dur={`${2.5 + (i % 3)}s`} repeatCount="indefinite" path={pathD} />
                  </circle>
                  <circle r="2" fill="#fff">
                    <animateMotion dur={`${2.5 + (i % 3)}s`} repeatCount="indefinite" path={pathD} />
                  </circle>
                  
                  {/* Domain Tag Badge placed along the middle of the line */}
                  <g transform={`translate(${(cx + x) / 2}, ${(cy + y) / 2})`}>
                    <rect x="-42" y="-12" width="84" height="24" rx="12" fill="white" stroke={color} strokeWidth="2" filter="url(#slightGlow)" opacity="0.95" />
                    <text x="0" y="4" textAnchor="middle" fill={color} fontSize="9.5" fontWeight="800" letterSpacing="0.02em">{tag}</text>
                  </g>
                </g>
              );
            })}

            {/* India Center Hub */}
            <g transform="translate(350, 120)">
              <circle r="48" fill="#EFF6FF" opacity="0.6" filter="url(#nodeGlow)">
                <animate attributeName="r" values="40; 48; 40" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4; 0.7; 0.4" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle r="34" fill="url(#hubGrad)" filter="url(#nodeGlow)" />
              <circle r="28" fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeDasharray="4 4" opacity="0.8">
                <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="15s" repeatCount="indefinite" />
              </circle>
              <text x="0" y="-3" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" letterSpacing="0.06em">INDIA</text>
              <text x="0" y="11" textAnchor="middle" fill="#BFDBFE" fontSize="8" fontWeight="700" letterSpacing="0.1em">NEURAL HUB</text>
            </g>

            {/* Side Nodes */}
            {[
              { label: "Russia", sub: "Oil · S-400", x: 150, y: 35, color: "#1E40AF", mark: "geo", tag: "Geopolitics", icon: "OIL" },
              { label: "USA", sub: "FDI · Tech", x: 550, y: 35, color: "#22C55E", mark: "eco", tag: "Economics", icon: "TECH" },
              { label: "China PLA", sub: "LAC border", x: 570, y: 120, color: "#8B5CF6", mark: "def", tag: "Defense", icon: "DEF" },
              { label: "TSMC", sub: "Chip supply", x: 550, y: 205, color: "#F59E0B", mark: "tech", tag: "Technology", icon: "CHIP" },
              { label: "Arctic Melt", sub: "Monsoon risk", x: 150, y: 205, color: "#10B981", mark: "cli", tag: "Climate", icon: "CLM" },
              { label: "Gulf Workers", sub: "8M Indians", x: 130, y: 120, color: "#EC4899", mark: "soc", tag: "Society", icon: "SOC" },
            ].map(({ label, sub, x, y, color, icon }, i) => {
              const rectWidth = 115;
              const rectHeight = 44;
              const isLeft = x < 350;
              const nx = isLeft ? x - rectWidth : x;
              const ny = y - rectHeight / 2;

              return (
                <g key={`node-${label}`} transform={`translate(${nx}, ${ny})`}>
                  {/* Container with rounded corners */}
                  <rect width={rectWidth} height={rectHeight} rx="12" fill="white" stroke={color} strokeWidth="2.5" filter="url(#slightGlow)" opacity="0.95" />
                  
                  {/* Colored icon sector on the correct side relative to the hub */}
                  <path d={isLeft 
                    ? `M0,12 a12,12 0 0,1 12,-12 h24 v44 h-24 a12,12 0 0,1 -12,-12 z`
                    : `M${rectWidth-36},0 h24 a12,12 0 0,1 12,12 v20 a12,12 0 0,1 -12,12 h-24 z`} 
                    fill={color} opacity="0.1" />
                  
                  <text x={isLeft ? 18 : rectWidth - 18} y="27" textAnchor="middle" fontSize="18">{icon}</text>
                  
                  {/* Text positioned correctly inside */}
                  <text x={isLeft ? 42 : 12} y="19" fill="#1E293B" fontSize="11" fontWeight="800" textAnchor="start">{label}</text>
                  <text x={isLeft ? 42 : 12} y="33" fill="#64748B" fontSize="9" fontWeight="600" textAnchor="start">{sub}</text>
                  
                  {/* Connectivity Node Dot */}
                  <circle cx={isLeft ? rectWidth : 0} cy={rectHeight / 2} r="5" fill="white" stroke={color} strokeWidth="2.5" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Cross-domain Causal Chain */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0F172A,#1E40AF,#4338CA)", boxShadow: "0 8px 32px rgba(30,64,175,0.3)" }}>
        <div className="px-5 py-4">
          <div className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-1">Cross-Domain Causal Intelligence</div>
          <div className="text-sm font-semibold text-white leading-snug">
            LAC escalation → defense spend surge → fiscal pressure → RBI constrained → growth slowdown → youth unemployment rises → social unrest risk → political instability → geopolitical uncertainty cycle
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[["Defense","#8B5CF6"],["Economics","#22C55E"],["Society","#EC4899"],["Geopolitics","#3B82F6"],["Technology","#F59E0B"]].map(([d, c]) => (
              <span key={d} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${c}30`, color: c, border: `1px solid ${c}50` }}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Key Articles Grid */}
      <div>
        <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#1E293B" }}><Newspaper className="w-3.5 h-3.5 text-slate-600" /> Most Impactful Current Events (March 2026)</div>
        <div className="grid grid-cols-2 gap-3">
          {OVERVIEW_ARTICLES.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl p-4 border cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
              style={{ background: "rgba(255, 255, 255, 0.6)", backdropFilter: "blur(12px)", borderColor: a.border, borderLeft: `5px solid ${a.color}` }}
              onClick={() => onSelectDomain(["geopolitics","economics","defense","technology","climate","society"][i] as DomainKey)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold" style={{ color: a.color }}>{a.domain}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: a.color }}>{a.tag}</span>
              </div>
              <div className="text-xs font-semibold leading-snug mb-1" style={{ color: "#1E293B" }}>{a.headline}</div>
              <div className="text-[10px] leading-relaxed" style={{ color: "#64748B" }}>{a.impact}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Overview Graphs Grid */}
      <div>
        <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#1E293B" }}><BarChart2 className="w-3.5 h-3.5 text-indigo-600" /> Quantum Subsystem Metrics</div>
        <div className="grid grid-cols-4 gap-4">
          {OVERVIEW_GRAPHS.map((g, i) => (
            <div key={i} className="group relative rounded-2xl p-4 border transition-all duration-500 ease-out hover:-translate-y-1 overflow-hidden" style={{ background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(20px)", borderColor: "rgba(255, 255, 255, 0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
              {/* Subtle Animated Data Matrix Background (CSS trick) */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              
              {/* Top ambient glow based on domain color */}
              <div className="absolute top-0 left-0 right-0 h-1 opacity-60" style={{ background: `linear-gradient(90deg, transparent, ${g.color}, transparent)`, boxShadow: `0 0 12px ${g.color}` }} />

              <div className="relative z-10 flex flex-col h-full">
                <div className="text-[11px] font-bold mb-0.5 tracking-wide" style={{ color: "#F8FAFC" }}>{g.title}</div>
                <div className="text-[9px] mb-2 font-bold uppercase tracking-widest" style={{ color: g.color, textShadow: `0 0 8px ${g.color}80` }}>{g.domain}</div>
                <div className="flex-1 min-h-[90px]">
                  <OverviewMiniChart g={g} />
                </div>
              </div>

              {/* Hover AI Summary Overlay */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(4px)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: `${g.color}20`, border: `1px solid ${g.color}` }}>
                  <Brain className="w-4 h-4" style={{ color: g.color }} />
                </div>
                <div className="text-[10px] leading-relaxed font-medium" style={{ color: "#E2E8F0" }}>
                  {g.aiSummary}
                </div>
                <div className="absolute bottom-3 text-[8px] uppercase tracking-widest" style={{ color: g.color }}>
                  Quantum Analysis Active
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mail Inbox Component ─────────────────────────────────────────────────
interface MailComplaint {
  id: string;
  title: string;
  department: string;
  gravity: string;
  priority: "High" | "Medium" | "Low";
  status: "Filed" | "Under Review" | "Resolved";
  timestamp: string;
  location: string;
  userName: string;
  userEmail: string;
  description: string;
}

function MailInbox() {
  const [mails, setMails] = useState<MailComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterDept, setFilterDept] = useState<string>("All");
  const [replyTarget, setReplyTarget] = useState<MailComplaint | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/complaints")
      .then((r) => r.json())
      .then((data) => {
        const all: MailComplaint[] = (data.all ?? []).sort(
          (a: MailComplaint, b: MailComplaint) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setMails(all);
      })
      .catch(() => setMails([]))
      .finally(() => setLoading(false));
  }, []);

  const pColors: Record<string, string> = {
    High: "#EF4444", Critical: "#DC2626", Medium: "#F97316", Low: "#22C55E",
  };

  const depts = ["All", ...Array.from(new Set(mails.map((m) => m.department)))];
  const filteredMails = mails.filter((m) => {
    const pMatch = filterPriority === "All" || m.priority === filterPriority;
    const dMatch = filterDept === "All" || m.department === filterDept;
    return pMatch && dMatch;
  });

  const unreadCount = mails.filter((m) => m.status === "Filed" && !resolved.has(m.id)).length;

  function handleResolve(id: string) {
    setResolved((prev) => new Set([...prev, id]));
    fetch("/api/complaints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "Resolved" }),
    }).catch(() => {});
    setMails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "Resolved" } : m))
    );
  }

  function handleSendReply() {
    if (!replyText.trim() || !replyTarget) return;
    setReplySent(replyTarget.id);
    setTimeout(() => setReplySent(null), 2000);
    setReplyText("");
    setReplyTarget(null);
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-xl h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-xl flex items-center gap-2" style={{ color: "#1E293B" }}><ClipboardList className="w-5 h-5 text-blue-600" /> Complaint Mail Inbox</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">Auto-routed by AI · {mails.length} total</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none text-slate-700 bg-white"
          >
            {["All", "High", "Medium", "Low"].map((p) => (
              <option key={p} value={p}>{p === "All" ? "All Priorities" : p}</option>
            ))}
          </select>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none text-slate-700 bg-white"
          >
            {depts.map((d) => (
              <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{filteredMails.length} mails</span>
        </div>

        {/* Mail List */}
        {filteredMails.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm">
            No complaint mails found.
          </div>
        )}
        {filteredMails.map((mail) => {
          const isResolved = resolved.has(mail.id) || mail.status === "Resolved";
          const color = pColors[mail.priority] ?? "#64748B";
          const time = new Date(mail.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
          return (
            <motion.div
              key={mail.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all group ${isResolved ? "opacity-60 border-slate-200" : "border-slate-200 hover:border-blue-200"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                    {(mail.userName ?? mail.userEmail ?? "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {mail.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {mail.userName || "Citizen"} · {mail.userEmail || "N/A"} · <span className="text-blue-600 font-medium">{mail.id}</span>
                    </div>
                    {mail.description && (
                      <div className="text-xs text-slate-400 mt-1 line-clamp-1">{mail.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                    {mail.priority}
                  </span>
                  <span className="text-xs text-slate-400">{time}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-50 text-slate-600 border border-slate-200">{mail.department}</span>
                <span className="px-2 py-0.5 rounded text-[10px]"
                  style={{
                    background: isResolved ? "#DCFCE7" : mail.status === "Under Review" ? "#FEF3C7" : "#EFF6FF",
                    color: isResolved ? "#16A34A" : mail.status === "Under Review" ? "#B45309" : "#2563EB",
                  }}>
                  {isResolved ? "Resolved" : mail.status}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit"><Map className="w-2.5 h-2.5" /> {mail.location}</span>
                {!isResolved && (
                  <>
                    <button
                      onClick={() => setReplyTarget(mail)}
                      className="ml-auto px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      ↩ Reply
                    </button>
                    <button
                      onClick={() => handleResolve(mail.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                    >
                      <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Mark Resolved</span>
                    </button>
                  </>
                )}
                {isResolved && (
                  <span className="ml-auto text-xs font-medium text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Resolved
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Reply Modal */}
        <AnimatePresence>
          {replyTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => setReplyTarget(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">↩ Reply to Report</div>
                    <div className="text-xs text-slate-500 mt-0.5">{replyTarget.id} · {replyTarget.title}</div>
                  </div>
                  <button onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                    <span className="font-semibold">To:</span> {replyTarget.userEmail || "citizen@portal.gov.in"} · {replyTarget.userName}
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your official response to the citizen's complaint..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-slate-800"
                  />
                  {replySent === replyTarget.id && (
                    <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Reply sent successfully!</span>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5 flex justify-end gap-2">
                  <button
                    onClick={() => setReplyTarget(null)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                  >
                    Send Reply →
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export default function OfficialDashboard() {
  // Structural Toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFeedOpen, setIsFeedOpen] = useState(true);
  const [feedSection, setFeedSection] = useState<"news" | "schemes">("news");

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
  const [sidebarInfo, setSidebarInfo] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [mainTab, setMainTab] = useState<"intelligence" | "newslab" | "simlab">(
    "intelligence",
  );

  const [articleContext, setArticleContext] = useState<{ title: string; description: string | null; domain: string } | null>(null);
  const [showApiDropdown, setShowApiDropdown] = useState(false);
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
  // Auto-refresh every 2 min 30 sec
  useEffect(() => {
    const id = setInterval(() => {
      fetchData(activeDomain);
    }, 150000);
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
      className="flex flex-col h-screen overflow-hidden relative"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage: `radial-gradient(at 40% 20%, rgba(28, 100, 242, 0.08) 0px, transparent 50%),
                          radial-gradient(at 80% 0%, rgba(16, 185, 129, 0.08) 0px, transparent 50%),
                          radial-gradient(at 0% 50%, rgba(244, 63, 94, 0.05) 0px, transparent 50%),
                          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2364748b' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        color: "#1E293B",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header
        className="mx-4 mt-4 mb-2 rounded-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          boxShadow: "0 10px 40px -10px rgba(30,64,175,0.12), 0 4px 6px -1px rgba(0,0,0,0.05)",
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-gray-100/50"
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
                const tabIcons = [<Globe key="g" className="w-3.5 h-3.5" />, <Newspaper key="n" className="w-3.5 h-3.5" />, <FlaskConical key="f" className="w-3.5 h-3.5" />];
                const tabLabels = ["Intelligence", "News Lab", "Sim Lab"];
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
                    <span className="flex items-center gap-1.5">{tabIcons[i]} {tabLabels[i]}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {([
                ["feedback", "Citizen Reports"] as const,
                ["dashboard", "Dashboard"] as const,
              ] as const).map(([id, label]) => (
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
                  {id === "feedback" && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">!</span>
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
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>

            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-2">
          {mainTab === "intelligence" && (
            <div
              className="flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5"
              style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <Search className="w-4 h-4 text-slate-400" />
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
            {/* Collapsible API status dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowApiDropdown(v => !v)}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeout(() => setShowApiDropdown(false), 150); }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{ background: "rgba(34,197,94,0.1)", color: "#166534", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Connected
                <span style={{ fontSize: 9 }}>{showApiDropdown ? "▲" : "▾"}</span>
              </button>
              {showApiDropdown && (
                <div
                  className="absolute right-0 top-8 z-50 rounded-xl shadow-xl border"
                  style={{ background: "white", borderColor: "#E2E8F0", minWidth: 220, padding: "8px 0" }}
                >
                  {[
                    { label: "IMF API", status: "Connected", color: "#22C55E", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
                    { label: "World Bank", status: "Connected", color: "#22C55E", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
                    { label: "Defense Feed", status: "Active", color: "#F97316", icon: <Circle className="w-3.5 h-3.5 text-orange-400" /> },
                    { label: "Trade Data", status: "Delayed", color: "#EF4444", icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> },
                  ].map(({ label, status, color, icon }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center">{icon}</span>
                        <span className="text-xs font-medium" style={{ color: "#1E293B" }}>{label}</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                className="flex flex-col pt-3 z-10 flex-shrink-0 overflow-hidden ml-4 mb-4 rounded-2xl"
                style={{
                  background: "rgba(255, 255, 255, 0.65)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  boxShadow: "0 10px 30px -5px rgba(30, 64, 175, 0.1)",
                }}
              >
                <div className="flex flex-col gap-1 px-2 w-[200px]">
                  {/* Overview option */}
                  <button
                    onClick={() => setShowOverview(true)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap"
                    style={{
                      background: showOverview ? "linear-gradient(135deg,#1E40AF,#3B82F6)" : "transparent",
                      color: showOverview ? "white" : "#64748B",
                      fontWeight: showOverview ? 700 : 500,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" style={{ color: showOverview ? "white" : "#94A3B8" }} />
                      Overview
                    </div>
                    {showOverview && <span className="text-white/70 text-[9px] px-1 py-0.5 rounded bg-white/20">ALL</span>}
                  </button>
                  <hr className="my-1 border-gray-100" />
                  {DOMAINS.map((d) => {
                    const c = DOMAIN_CONFIG[d];
                    const isActive = !showOverview && activeDomain === d;
                    return (
                      <button
                        key={d}
                        onClick={() => { setActiveDomain(d); setShowOverview(false); }}
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
                      <CloudLightning className="w-4 h-4" /> Real-Time Feed
                    </div>
                    <span className="text-xs">{isFeedOpen ? "⌄" : "›"}</span>
                  </button>

                  {/* Feed sub-sections */}
                  {isFeedOpen && (
                    <div className="ml-3 flex flex-col gap-0.5 mt-0.5 border-l-2 pl-2" style={{ borderColor: "#E2E8F0" }}>
                      {[
                        { id: "news" as const, label: "News Feed", icon: <Radio className="w-3.5 h-3.5" /> },
                        { id: "schemes" as const, label: "Schemes", icon: <Landmark className="w-3.5 h-3.5" /> },
                      ].map(({ id, label, icon }) => (
                        <button
                          key={id}
                          onClick={() => { setFeedSection(id); }}
                          className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all whitespace-nowrap text-left"
                          style={{
                            background: feedSection === id && isFeedOpen ? "#EFF6FF" : "transparent",
                            color: feedSection === id && isFeedOpen ? "#1E40AF" : "#64748B",
                            fontWeight: feedSection === id && isFeedOpen ? 600 : 400,
                          }}
                        >
                          <span className="flex items-center">{icon}</span>
                          {label}
                          {feedSection === id && isFeedOpen && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
        </AnimatePresence>

        {/* ── OVERVIEW MODE ─────────────────────────────────────────────── */}
        {activeTab === "dashboard" && mainTab === "intelligence" && showOverview && (
          <div className="flex-1 overflow-hidden">
            <OverviewDashboard onSelectDomain={(d) => { setActiveDomain(d); setShowOverview(false); }} />
          </div>
        )}

        {/* ── DASHBOARD TAB CONTENT ─────────────────────────────────────────── */}
        {activeTab === "dashboard" && mainTab === "intelligence" && !showOverview && (
          <div
            className="flex-1 overflow-hidden grid transition-all duration-300 ease-in-out"
            style={{
              gridTemplateColumns: isFeedOpen
                ? "280px 1fr 340px"
                : "0px 1fr 340px",
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
                {feedSection === "news" && (
                <div className="px-4 pt-4 pb-2">
                  <div
                    className="text-xs font-bold mb-3"
                    style={{ color: "#1E293B" }}
                  >
                    <span className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-blue-600" /> Real-Time Intelligence Feed</span>
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "#EFF6FF", color: "#1E40AF" }}>LIVE</span>
                  </div>
                  {loading
                    ? [0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="mb-2 h-20 rounded-xl animate-pulse"
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
                      const sectors = [
                        "Trade & Diplomacy",
                        "Energy Markets",
                        "Supply Chain",
                        "Agriculture",
                        "Digital Economy",
                      ];
                      const minsAgo = [2, 14, 28, 54, 71];
                      const rl = riskColors[i % riskColors.length];
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="mb-2 rounded-xl p-3 border"
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
                          <div className="ml-4 flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: `${dotColors[i % dotColors.length]}18`, color: dotColors[i % dotColors.length] }}
                            >
                              {sectors[i % sectors.length]}
                            </span>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: `${rl}15`, color: rl }}
                            >
                              {riskLevels[i % riskLevels.length]} Risk
                            </span>
                          </div>
                          <div className="flex items-center gap-1 ml-0 mt-1.5">
                            {[ {ic: <BarChart2 className="w-3.5 h-3.5" />, key: "chart"}, {ic: <Share2 className="w-3.5 h-3.5" />, key: "link"}, {ic: <ClipboardList className="w-3.5 h-3.5" />, key: "list"}, {ic: <Search className="w-3.5 h-3.5" />, key: "search"} ].map(({ ic, key }) => (
                              <button
                                key={key}
                                className="text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-slate-500"
                                title="Action"
                              >
                                {ic}
                              </button>
                            ))}
                            <span
                              className="text-[10px] ml-1"
                              style={{ color: "#94A3B8" }}
                            >
                              {minsAgo[i % minsAgo.length]}m ago
                            </span>
                            <span
                              className="text-[10px] ml-auto font-medium cursor-help"
                              style={{ color: "#1E40AF" }}
                              title="This event may affect both sides of the relationship proportionally."
                            >
                              + Analyse
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
                )}

                {/* Govt Schemes Exposure */}
                {feedSection === "schemes" && (
                <div className="px-4 pt-4 pb-4">
                  <div
                    className="text-xs font-bold mb-3"
                    style={{ color: "#1E293B" }}
                  >
                    <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-indigo-600" /> Government Schemes — {cfg.label}</span>
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
                          ? schemes.slice(0, 3).map((s, i) => ({
                            name: s.title || (s as any).name || "Unknown Scheme",
                            desc: s.description ?? "",
                            level: i === 0 ? "High" : i === 1 ? "Medium" : "Low",
                            c: i === 0 ? "#EF4444" : i === 1 ? "#F97316" : "#22C55E",
                            bg: i === 0 ? "#FEF2F2" : i === 1 ? "#FFF7ED" : "#F0FDF4",
                            tags: ["Policy", "Active", cfg.label],
                          }))
                          : [
                            {
                              name: "PM-Kisan Samman Nidhi",
                              desc: "₹6,000/yr direct income support — 11.5 crore farmers. Under stress due to monsoon deficit.",
                              level: "Medium",
                              c: "#F97316",
                              bg: "#FFF7ED",
                              tags: ["Agriculture", "Direct Transfer", "Rural"],
                            },
                            {
                              name: "PM-JAY Ayushman Bharat",
                              desc: "₹5L health cover for 55 crore beneficiaries. Utilisation gap in Tier-2/3 cities.",
                              level: "High",
                              c: "#22C55E",
                              bg: "#F0FDF4",
                              tags: ["Healthcare", "600M enrolled", "BPL"],
                            },
                            {
                              name: "PLI — Semiconductor Scheme",
                              desc: "₹76,000 Cr incentive for chip fabs. Tata Gujarat fab operational Q3 2026.",
                              level: "Strategic",
                              c: "#1E40AF",
                              bg: "#EFF6FF",
                              tags: ["Technology", "Make-in-India", "Critical"],
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
                              {truncate(s.name, 32)}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${s.c}20`, color: s.c }}>{s.level}</span>
                          </div>
                          <div
                            className="text-xs mb-1.5"
                            style={{ color: "#64748B" }}
                          >
                            {truncate(s.desc, 80)}
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {s.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded"
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
                )}
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
                      onClick={() => { fetchData(activeDomain); setArticleContext(null); }}
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
                <CausalChainCard domain={activeDomain} causalChain={domainData?.causalChain ?? ""} />
              </div>

              {/* Geographic Causal Flow Map */}
              <div
                className="rounded-2xl p-5 shadow-sm border relative z-10 bg-white/70 backdrop-blur-xl transition-all duration-300 ease-out hover:shadow-lg"
                style={{ borderColor: "rgba(255,255,255,0.5)" }}
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
                <MapView domain={activeDomain} simulated={simulated} articleContext={articleContext} />
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
                      <span className="flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Current Reality</span>
                    </button>
                    <button
                      onClick={() => setSimulated(true)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{
                        background: simulated ? "#7C3AED" : "#F1F5F9",
                        color: simulated ? "white" : "#64748B",
                      }}
                    >
                      <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Simulated Impact</span>
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
                        "Strategy",
                        "#EFF6FF",
                        "#BFDBFE",
                        "#1E40AF",
                      ],
                      [
                        "transparency",
                        "Transparency",
                        "#ECFDF5",
                        "#A7F3D0",
                        "#065F46",
                      ],
                      [
                        "nationalAdvantage",
                        "National Advantage",
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
                      className="rounded-xl p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md"
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
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-600" /> Strategic Impact Assessment</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {impactCards.map((card, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 border transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg bg-white/60 backdrop-blur-md"
                      style={{ borderColor: "rgba(255,255,255,0.5)" }}
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
              className="overflow-y-auto border-l p-5 space-y-6"
              style={{ borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.3)", backdropFilter: "blur(12px)" }}
            >
              {/* Entity Profile India */}
              <div
                className="rounded-2xl border p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl bg-white/70 backdrop-blur-xl"
                style={{ borderColor: "rgba(255,255,255,0.5)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    Entity Profile:{" "}
                    <span style={{ color: "#1E40AF" }}>India</span>
                    <span className="ml-1 text-xs font-normal" style={{ color: "#64748B" }}>— {DOMAIN_CONFIG[activeDomain].label}</span>
                  </div>
                  <button
                    onClick={() => setSidebarInfo(sidebarInfo === "entity" ? null : "entity")}
                    className="text-gray-400 hover:text-gray-700 transition-colors text-sm px-1"
                    title="What this shows"
                  >⋮</button>
                </div>
                {sidebarInfo === "entity" && (
                  <div className="mb-2 text-[10px] px-2 py-1.5 rounded-lg leading-relaxed" style={{ background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" }}>
                    {SIDEBAR_EXPLANATIONS[activeDomain]?.entity ?? "Shows India's top bilateral relations by strategic weight."}
                  </div>
                )}
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
                className="rounded-2xl border p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl bg-white/70 backdrop-blur-xl"
                style={{ borderColor: "rgba(255,255,255,0.5)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    {activeDomain === "defense" ? "Defense Spend Trend" : activeDomain === "climate" ? "Renewable Energy Trend" : activeDomain === "technology" ? "Innovation Indicator Trend" : activeDomain === "society" ? "Social Development Trend" : "Trade Deficit Trend"}
                  </div>
                  <button
                    onClick={() => setSidebarInfo(sidebarInfo === "trade" ? null : "trade")}
                    className="text-gray-400 hover:text-gray-700 transition-colors text-sm px-1"
                    title="What this shows"
                  >⋮</button>
                </div>
                {sidebarInfo === "trade" && (
                  <div className="mb-2 text-[10px] px-2 py-1.5 rounded-lg leading-relaxed" style={{ background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" }}>
                    {SIDEBAR_EXPLANATIONS[activeDomain]?.trade ?? "Tracks the key economic indicator trend over time for this domain."}
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-3">
                  {activeDomain === "defense" ? "India's defense spending as % of GDP, 2019–2026" : activeDomain === "climate" ? "India's renewable energy capacity trend, 2019–2026" : activeDomain === "technology" ? "Key technology adoption indicator, 2019–2026" : activeDomain === "society" ? "Social welfare program coverage, 2019–2026" : "India's trade balance from 2019–2026"}
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
                className="rounded-2xl border p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl bg-white/70 backdrop-blur-xl"
                style={{ borderColor: "rgba(255,255,255,0.5)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: "#1E293B" }}
                  >
                    {activeDomain === "defense" ? "Threat & Readiness Overview" : activeDomain === "technology" ? "Digital Capability Overview" : activeDomain === "climate" ? "Climate Risk Overview" : activeDomain === "society" ? "Social Cohesion Overview" : "Relationship Overview"}
                  </div>
                  <button
                    onClick={() => setSidebarInfo(sidebarInfo === "relations" ? null : "relations")}
                    className="text-gray-400 hover:text-gray-700 transition-colors text-sm px-1"
                    title="What this shows"
                  >⋮</button>
                </div>
                {sidebarInfo === "relations" && (
                  <div className="mb-2 text-[10px] px-2 py-1.5 rounded-lg leading-relaxed" style={{ background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" }}>
                    {SIDEBAR_EXPLANATIONS[activeDomain]?.relations ?? "Quantifies India's key strategic metrics for this domain. Higher scores signal greater vulnerability or strength depending on the indicator."}
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-4">
                  {activeDomain === "defense" ? "India's defense readiness and threat assessment indicators." : activeDomain === "technology" ? "India's digital infrastructure strength and cyber vulnerability." : activeDomain === "climate" ? "India's climate risk exposure and mitigation progress." : activeDomain === "society" ? "India's social stability, equality, and welfare metrics." : "India's global influence, systemic risk, and external dependencies."}
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
                              {i === 0 ? <Globe className="w-3 h-3" /> : i === 1 ? <Zap className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
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
            <NewsLab onArticleMap={(art) => { setArticleContext({ title: art.title, description: art.description, domain: activeDomain }); setMainTab("intelligence"); }} />
          </div>
        )}
        {activeTab === "dashboard" && mainTab === "simlab" && (
          <div className="flex-1 overflow-hidden p-4">
            <SimLab domain={activeDomain} />
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <CitizenReportsPanel />
          </div>
        )}

        {activeTab === "mail" && (
          <MailInbox />
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
