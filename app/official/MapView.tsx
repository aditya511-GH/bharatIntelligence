"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { DomainKey } from "@/lib/utils";
import { AlertTriangle, Brain, Sparkles, MapPin, Link2, Lightbulb, Map, RefreshCw } from "lucide-react";

type MapNode = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  color: string;
  size: "large" | "small";
};
type MapEdge = {
  from: string;
  to: string;
  label: string;
  color: string;
  dash?: boolean;
  weight?: number;
};
type MapData = {
  nodes: MapNode[];
  edges: MapEdge[];
  center: [number, number];
  zoom: number;
};

// ─── Static domain overview maps ─────────────────────────────────────────────
const DOMAIN_MAPS: Record<DomainKey, MapData> = {
  geopolitics: {
    center: [30, 60], zoom: 3,
    nodes: [
      { id: "russia", label: "Russia", lat: 62, lng: 100, color: "#1E40AF", size: "large" },
      { id: "oil_trade", label: "Oil Trade\n$88/bbl", lat: 42, lng: 58, color: "#F97316", size: "small" },
      { id: "india", label: "India\n72% import", lat: 22, lng: 78, color: "#1E40AF", size: "large" },
      { id: "usa", label: "USA", lat: 38, lng: -97, color: "#3B82F6", size: "large" },
      { id: "sanctions", label: "US Sanctions\n~72%", lat: 48, lng: 12, color: "#EF4444", size: "small" },
      { id: "china", label: "China", lat: 35, lng: 105, color: "#7C3AED", size: "large" },
      { id: "taiwan", label: "Taiwan\n(Tension)", lat: 24, lng: 121, color: "#EF4444", size: "small" },
      { id: "pak", label: "Pakistan\nLoC tensions", lat: 30, lng: 70, color: "#EF4444", size: "small" },
    ],
    edges: [
      { from: "russia", to: "oil_trade", label: "+1.8M T/mo · 32%", color: "#F97316", weight: 4 },
      { from: "oil_trade", to: "india", label: "72% supply · $88/bbl", color: "#3B82F6", weight: 3 },
      { from: "usa", to: "sanctions", label: "CAATSA/BIS", color: "#EF4444", dash: true, weight: 2 },
      { from: "sanctions", to: "russia", label: "Sanction pressure", color: "#EF4444", dash: true, weight: 2 },
      { from: "china", to: "taiwan", label: "Military exercises", color: "#7C3AED", weight: 2 },
      { from: "russia", to: "india", label: "S-400 · defence", color: "#22C55E", dash: true, weight: 1 },
      { from: "pak", to: "india", label: "LoC incidents", color: "#EF4444", dash: true, weight: 2 },
    ],
  },
  economics: {
    center: [25, 60], zoom: 3,
    nodes: [
      { id: "india", label: "India\nGDP $3.7T", lat: 22, lng: 78, color: "#1E40AF", size: "large" },
      { id: "opec", label: "OPEC Gulf\n$88 crude", lat: 24, lng: 46, color: "#F97316", size: "small" },
      { id: "usa_fed", label: "US Fed\n5.5% rate", lat: 38, lng: -97, color: "#EF4444", size: "large" },
      { id: "china_trade", label: "China Trade\n$100B deficit", lat: 35, lng: 105, color: "#7C3AED", size: "large" },
      { id: "imf", label: "IMF Forecast\n+6.5% GDP", lat: 49, lng: 2, color: "#22C55E", size: "small" },
      { id: "eu", label: "EU Markets\n$80B exports", lat: 52, lng: 15, color: "#3B82F6", size: "small" },
    ],
    edges: [
      { from: "opec", to: "india", label: "Oil imports · $120B/yr", color: "#F97316", weight: 4 },
      { from: "usa_fed", to: "india", label: "Rate parity pressure", color: "#EF4444", dash: true, weight: 2 },
      { from: "china_trade", to: "india", label: "Electronics/goods", color: "#7C3AED", weight: 3 },
      { from: "imf", to: "india", label: "Growth forecast +6.5%", color: "#22C55E", weight: 1 },
      { from: "eu", to: "india", label: "Export destination", color: "#3B82F6", weight: 2 },
    ],
  },
  defense: {
    center: [30, 75], zoom: 4,
    nodes: [
      { id: "india", label: "India\n$74B budget", lat: 22, lng: 78, color: "#1E40AF", size: "large" },
      { id: "china_lac", label: "China PLA\nLAC incursion", lat: 35, lng: 82, color: "#EF4444", size: "large" },
      { id: "pak", label: "Pakistan\nLoC 62/mo", lat: 30, lng: 70, color: "#EF4444", size: "small" },
      { id: "usa_india", label: "US-India Pact\nQ2+BECA", lat: 38, lng: 50, color: "#22C55E", size: "small" },
      { id: "russia_s400", label: "Russia S-400\nDeliver. 85%", lat: 55, lng: 80, color: "#3B82F6", size: "small" },
      { id: "ior", label: "IOR Patrol\nNavy", lat: 10, lng: 70, color: "#1E40AF", size: "small" },
    ],
    edges: [
      { from: "china_lac", to: "india", label: "LAC: +18km incursion", color: "#EF4444", weight: 4 },
      { from: "pak", to: "india", label: "LoC incidents · 62/mo", color: "#EF4444", dash: true, weight: 3 },
      { from: "usa_india", to: "india", label: "Tech transfer · Q2+BECA", color: "#22C55E", weight: 2 },
      { from: "russia_s400", to: "india", label: "S-400 85% delivered", color: "#3B82F6", weight: 2 },
      { from: "india", to: "ior", label: "IOR patrol · 24/7", color: "#1E40AF", weight: 1 },
    ],
  },
  technology: {
    center: [25, 75], zoom: 3,
    nodes: [
      { id: "india_it", label: "India IT\n$250B exports", lat: 22, lng: 78, color: "#1E40AF", size: "large" },
      { id: "tsmc_tw", label: "TSMC Taiwan\n3nm chips", lat: 25, lng: 121, color: "#22C55E", size: "large" },
      { id: "usa_ban", label: "USA Chip Ban\nEAR controls", lat: 38, lng: -97, color: "#EF4444", size: "large" },
      { id: "india_fab", label: "Gujarat Fab\n28nm target", lat: 23, lng: 72, color: "#22C55E", size: "small" },
      { id: "china_ai", label: "China AI\nCyber threat", lat: 35, lng: 110, color: "#7C3AED", size: "small" },
      { id: "silicon_valley", label: "Silicon Valley\nIndia diaspora", lat: 37, lng: -122, color: "#3B82F6", size: "small" },
    ],
    edges: [
      { from: "usa_ban", to: "india_it", label: "CHIPS act export ctrl", color: "#EF4444", dash: true, weight: 2 },
      { from: "tsmc_tw", to: "india_fab", label: "Tech transfer deal", color: "#22C55E", weight: 3 },
      { from: "china_ai", to: "india_it", label: "APT cyber attacks", color: "#7C3AED", dash: true, weight: 2 },
      { from: "india_fab", to: "india_it", label: "Import substitution", color: "#3B82F6", weight: 2 },
      { from: "silicon_valley", to: "india_it", label: "Diaspora investment", color: "#3B82F6", weight: 1 },
    ],
  },
  climate: {
    center: [20, 70], zoom: 3,
    nodes: [
      { id: "india", label: "India\nCOP30 net-zero 2070", lat: 22, lng: 78, color: "#1E40AF", size: "large" },
      { id: "monsoon", label: "Monsoon\n−22% deficit", lat: 16, lng: 74, color: "#3B82F6", size: "small" },
      { id: "arctic", label: "Arctic Melt\n1.8x global avg", lat: 78, lng: 0, color: "#7C3AED", size: "small" },
      { id: "solar", label: "Solar India\n100GW → 150GW", lat: 25, lng: 73, color: "#22C55E", size: "small" },
      { id: "cop30_uae", label: "COP30 UAE\nPledge watch", lat: 24, lng: 54, color: "#F97316", size: "small" },
      { id: "bangladesh", label: "Bangladesh\nFlood risk", lat: 24, lng: 90, color: "#EF4444", size: "small" },
    ],
    edges: [
      { from: "arctic", to: "monsoon", label: "Jet stream disruption", color: "#7C3AED", weight: 3 },
      { from: "monsoon", to: "india", label: "Kharif −15% · Food risk", color: "#EF4444", weight: 3 },
      { from: "solar", to: "india", label: "150GW target · COP pledge", color: "#22C55E", weight: 2 },
      { from: "cop30_uae", to: "india", label: "Net-zero commitment", color: "#F97316", weight: 1 },
      { from: "bangladesh", to: "india", label: "Climate migration pressure", color: "#EF4444", dash: true, weight: 1 },
    ],
  },
  society: {
    center: [22, 78], zoom: 4,
    nodes: [
      { id: "india", label: "India\n1.44B population", lat: 22, lng: 78, color: "#1E40AF", size: "large" },
      { id: "urban", label: "Urbanisation\n500M in cities", lat: 19, lng: 73, color: "#F97316", size: "small" },
      { id: "edu", label: "Edu Gap\n27% skill mismatch", lat: 26, lng: 80, color: "#EF4444", size: "small" },
      { id: "pmjay", label: "PM-JAY\n600M insured", lat: 18, lng: 84, color: "#22C55E", size: "small" },
      { id: "diaspora", label: "Diaspora\n$120B remittance", lat: 25, lng: 55, color: "#3B82F6", size: "small" },
      { id: "gulf_labor", label: "Gulf Workers\n8M Indians", lat: 25, lng: 51, color: "#F97316", size: "small" },
    ],
    edges: [
      { from: "edu", to: "india", label: "Skills gap · 27% mismatch", color: "#EF4444", weight: 2 },
      { from: "urban", to: "india", label: "Inequality ↑ Gini 0.51", color: "#F97316", weight: 2 },
      { from: "pmjay", to: "india", label: "OOP expenditure −38%", color: "#22C55E", weight: 2 },
      { from: "diaspora", to: "india", label: "$120B inflow #3 global", color: "#3B82F6", weight: 3 },
      { from: "gulf_labor", to: "india", label: "Remittances + welfare", color: "#F97316", weight: 2 },
    ],
  },
};

export interface ArticleContext {
  title: string;
  description: string | null;
  domain: string;
}

interface MapIntelResponse extends MapData {
  insights: string;
  futurePrediction: string;
}

export default function MapView({
  domain,
  simulated,
  articleContext,
}: {
  domain: DomainKey;
  simulated: boolean;
  articleContext?: ArticleContext | null;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ map: any; L: any } | null>(null);
  const [intel, setIntel] = useState<MapIntelResponse | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);

  // Fetch article-specific map intel from Groq
  const fetchArticleIntel = useCallback(async (ctx: ArticleContext) => {
    setLoadingIntel(true);
    setIntelError(null);
    setIntel(null);
    try {
      const res = await fetch("/api/map-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ctx.title,
          description: ctx.description ?? "",
          domain: ctx.domain,
        }),
      });
      if (!res.ok) throw new Error(`map-intel ${res.status}`);
      const data: MapIntelResponse = await res.json();
      setIntel(data);
    } catch (e) {
      setIntelError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoadingIntel(false);
    }
  }, []);

  // When article changes, fetch intel
  useEffect(() => {
    if (articleContext) {
      fetchArticleIntel(articleContext);
    } else {
      setIntel(null);
      setIntelError(null);
    }
  }, [articleContext, fetchArticleIntel]);

  // Initial Leaflet map setup
  useEffect(() => {
    async function initMap() {
      const L = (await import("leaflet")).default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      if (!divRef.current || mapRef.current) return;
      const map = L.map(divRef.current, {
        center: DOMAIN_MAPS[domain]?.center || [25, 60],
        zoom: DOMAIN_MAPS[domain]?.zoom || 3,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = { map, L };
      drawLayers(L, map, DOMAIN_MAPS[domain], simulated);
    }
    initMap();
    return () => {
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw when domain/simulated changes (default overview)
  useEffect(() => {
    if (!mapRef.current || articleContext) return;
    const { map, L } = mapRef.current;
    const data = DOMAIN_MAPS[domain] ?? DOMAIN_MAPS.geopolitics;
    clearLayers(map);
    map.setView(data.center, data.zoom);
    drawLayers(L, map, data, simulated);
  }, [domain, simulated, articleContext]);

  // Redraw when article intel arrives
  useEffect(() => {
    if (!mapRef.current || !intel) return;
    const { map, L } = mapRef.current;
    clearLayers(map);
    map.setView(intel.center, intel.zoom);
    drawLayers(L, map, intel, false);
  }, [intel]);

  return (
    <div className="relative w-full flex flex-col gap-3">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-leaflet-popup .leaflet-popup-content-wrapper { border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1); padding:4px; }
        .custom-leaflet-popup .leaflet-popup-tip { box-shadow:0 10px 25px rgba(0,0,0,0.1); }
      ` }} />

      {/* Map container */}
      <div className="relative">
        <div ref={divRef} style={{ height: 400, borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", background: "#F8FAFC" }} />

        {/* Article mode indicator */}
        {articleContext && (
          <div className="absolute top-3 left-3 right-3 z-[1000]">
            <div className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "rgba(30,64,175,0.92)", color: "white", backdropFilter: "blur(8px)" }}>
              <span className="flex items-center gap-1.5">{loadingIntel ? <><RefreshCw className="w-3 h-3 animate-spin" /> ARIA generating world-relation map…</> : <><Map className="w-3 h-3" /> Article Map: {articleContext.title.slice(0, 60)}…</>}</span>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loadingIntel && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(248,250,252,0.7)", backdropFilter: "blur(4px)", zIndex: 999 }}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium" style={{ color: "#1E40AF" }}>Generating intelligence map…</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5" style={{ zIndex: 1000 }}>
          {[["#EF4444", "Conflict / Risk"], ["#22C55E", "Alliance / Benefit"], ["#3B82F6", "Trade / Dependency"], ["#F97316", "Energy / Resource"], ["#7C3AED", "Geopolitical Pressure"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg shadow-sm" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.8)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
              <span style={{ color: "#475569", fontSize: 10, fontWeight: 600 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Article Intel panel */}
      {intelError && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {intelError}</span>
        </div>
      )}

      {intel && !loadingIntel && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #BFDBFE", backdropFilter: "blur(12px)" }}>
          {/* Insights */}
          <div>
            <div className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: "#1E293B" }}>
              <Brain className="w-4 h-4 text-blue-600" /> Strategic Insights for India
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#334155" }}>{intel.insights}</p>
          </div>

          {/* Future Prediction */}
          <div className="rounded-xl px-4 py-3" style={{ background: "linear-gradient(135deg, #EFF6FF, #F0FDF4)", border: "1px solid #BFDBFE" }}>
            <div className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: "#1E40AF" }}>
              <Sparkles className="w-4 h-4 text-blue-600" /> 30-90 Day Prediction
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#1E293B" }}>{intel.futurePrediction}</p>
          </div>

          {/* Entity count */}
          <div className="flex items-center gap-2 text-xs" style={{ color: "#94A3B8" }}>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {intel.nodes?.length ?? 0} entities mapped</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> {intel.edges?.length ?? 0} relations identified</span>
          </div>
        </div>
      )}

      {/* Default domain overview hint */}
      {!articleContext && !intel && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(239,246,255,0.8)", color: "#1E40AF", border: "1px solid #BFDBFE" }}>
          <span className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Click <strong>"View on Map"</strong> on a news article to see AI-generated world-relations, impact analysis, and future predictions specific to that story.</span>
        </div>
      )}
    </div>
  );
}

// ─── Leaflet drawing helpers ──────────────────────────────────────────────────
function clearLayers(map: any) {
  map.eachLayer((layer: any) => {
    if (!layer._url) map.removeLayer(layer);
  });
}

function drawLayers(L: any, map: any, data: MapData, simulated: boolean) {
  if (!data?.nodes || !data?.edges) return;

  // Collect all positions for auto-fit
  const positions: [number, number][] = data.nodes.map((n) => [n.lat, n.lng]);

  // Draw edges first
  data.edges.forEach((edge) => {
    const fromN = data.nodes.find((n) => n.id === edge.from);
    const toN = data.nodes.find((n) => n.id === edge.to);
    if (!fromN || !toN) return;
    const from: [number, number] = [fromN.lat, fromN.lng];
    const to: [number, number] = [toN.lat, toN.lng];
    const line = L.polyline([from, to], {
      color: edge.color,
      weight: simulated ? (edge.weight ?? 2) * 0.7 : (edge.weight ?? 2),
      opacity: 0.75,
      dashArray: edge.dash ? "8 5" : undefined,
    }).addTo(map);
    line.bindPopup(
      `<div style="font-family:system-ui,sans-serif;padding:4px"><b style="color:${edge.color};font-size:13px;display:block;margin-bottom:4px">${edge.label}</b><span style="color:#64748B;font-size:11px;font-weight:500">${fromN.label.split("\n")[0]} <span style="color:#CBD5E1">→</span> ${toN.label.split("\n")[0]}</span></div>`,
      { className: "custom-leaflet-popup" }
    );
    // Offset the label slightly above the midpoint for readability
    const midLat = (fromN.lat + toN.lat) / 2 + 0.6;
    const midLng = (fromN.lng + toN.lng) / 2;
    L.marker([midLat, midLng], {
      icon: L.divIcon({
        html: `<div style="background:white;border:1.5px solid ${edge.color};border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700;color:#1E293B;white-space:nowrap;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,0.12);line-height:1.4;max-width:160px;overflow:hidden;text-overflow:ellipsis"><span style="color:${edge.color};margin-right:4px">●</span>${edge.label}</div>`,
        className: "",
        iconSize: [0, 0],
        iconAnchor: [0, 12],
      }),
    }).addTo(map);
  });

  // Draw nodes
  data.nodes.forEach((node) => {
    const radius = node.size === "large" ? 11 : 7;
    const marker = L.circleMarker([node.lat, node.lng], {
      radius,
      fillColor: node.color,
      color: "white",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map);
    const lines = node.label.split("\n");
    L.marker([node.lat, node.lng], {
      icon: L.divIcon({
        html: `<div style="background:white;border:2px solid ${node.color}50;border-radius:10px;font-family:system-ui,sans-serif;line-height:1.5;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.12);pointer-events:none;display:inline-block;padding:5px 10px;margin-top:-10px"><b style="color:${node.color};font-size:13px;letter-spacing:-0.01em;display:block">${lines[0]}</b>${lines[1] ? `<span style="color:#475569;font-size:10.5px;font-weight:600;display:block">${lines[1]}</span>` : ""}</div>`,
        className: "",
        iconSize: [0, 0],
        iconAnchor: [-16, 28],
      }),
    }).addTo(map);
    const relatedEdges = data.edges.filter((e) => e.from === node.id || e.to === node.id);
    marker.bindPopup(
      `<div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px"><b style="color:${node.color};font-size:15px;letter-spacing:-0.02em;display:block">${lines[0]}</b>${lines[1] ? `<span style="color:#64748B;font-size:12px;font-weight:500;display:block;margin-top:2px">${lines[1]}</span>` : ""}<hr style="margin:10px 0;border:0;border-top:1px solid #E2E8F0"><b style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:6px">Relations (${relatedEdges.length})</b><div style="display:flex;flex-direction:column;gap:4px">${relatedEdges.map((e) => `<div style="display:flex;align-items:center;gap:6px;font-size:11px"><div style="width:6px;height:6px;border-radius:50%;background-color:${e.color};flex-shrink:0"></div><span style="color:#334155;font-weight:500">${e.label}</span></div>`).join("")}</div></div>`,
      { className: "custom-leaflet-popup" }
    );
  });

  // Auto-fit map bounds to show all nodes cleanly
  if (positions.length > 0) {
    try {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6, animate: true });
    } catch {
      // fallback: keep existing view
    }
  }
}
