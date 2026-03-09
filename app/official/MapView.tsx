"use client";
import { useEffect, useRef } from "react";
import { DomainKey } from "@/lib/utils";

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

const DOMAIN_MAPS: Record<
  DomainKey,
  { nodes: MapNode[]; edges: MapEdge[]; center: [number, number]; zoom: number }
> = {
  geopolitics: {
    center: [30, 60],
    zoom: 3,
    nodes: [
      {
        id: "russia",
        label: "Russia",
        lat: 62,
        lng: 100,
        color: "#1E40AF",
        size: "large",
      },
      {
        id: "oil_trade",
        label: "Oil Trade\n$88/bbl",
        lat: 42,
        lng: 58,
        color: "#F97316",
        size: "small",
      },
      {
        id: "india",
        label: "India\n72% import",
        lat: 22,
        lng: 78,
        color: "#1E40AF",
        size: "large",
      },
      {
        id: "usa",
        label: "USA",
        lat: 38,
        lng: -97,
        color: "#3B82F6",
        size: "large",
      },
      {
        id: "sanctions",
        label: "US Sanctions\n~72%",
        lat: 48,
        lng: 12,
        color: "#EF4444",
        size: "small",
      },
      {
        id: "china",
        label: "China",
        lat: 35,
        lng: 105,
        color: "#7C3AED",
        size: "large",
      },
      {
        id: "taiwan",
        label: "Taiwan\n(Tension)",
        lat: 24,
        lng: 121,
        color: "#EF4444",
        size: "small",
      },
    ],
    edges: [
      {
        from: "russia",
        to: "oil_trade",
        label: "+1.8M T/mo · 32%",
        color: "#F97316",
        weight: 4,
      },
      {
        from: "oil_trade",
        to: "india",
        label: "72% supply · $88/bbl",
        color: "#3B82F6",
        weight: 3,
      },
      {
        from: "usa",
        to: "sanctions",
        label: "CAATSA/BIS",
        color: "#EF4444",
        dash: true,
        weight: 2,
      },
      {
        from: "sanctions",
        to: "russia",
        label: "Influence weight",
        color: "#EF4444",
        dash: true,
        weight: 2,
      },
      {
        from: "china",
        to: "taiwan",
        label: "Military exercises",
        color: "#7C3AED",
        weight: 2,
      },
      {
        from: "russia",
        to: "india",
        label: "S-400 · defence",
        color: "#22C55E",
        dash: true,
        weight: 1,
      },
    ],
  },
  economics: {
    center: [25, 60],
    zoom: 3,
    nodes: [
      {
        id: "india",
        label: "India\nGDP $3.7T",
        lat: 22,
        lng: 78,
        color: "#1E40AF",
        size: "large",
      },
      {
        id: "opec",
        label: "OPEC Gulf\n$88 crude",
        lat: 24,
        lng: 46,
        color: "#F97316",
        size: "small",
      },
      {
        id: "usa_fed",
        label: "US Fed\n5.5% rate",
        lat: 38,
        lng: -97,
        color: "#EF4444",
        size: "large",
      },
      {
        id: "china_trade",
        label: "China Trade\n$100B deficit",
        lat: 35,
        lng: 105,
        color: "#7C3AED",
        size: "large",
      },
      {
        id: "imf",
        label: "IMF Forecast\n+6.5% GDP",
        lat: 49,
        lng: 2,
        color: "#22C55E",
        size: "small",
      },
      {
        id: "rbi",
        label: "RBI\n6.5% repo",
        lat: 19,
        lng: 73,
        color: "#3B82F6",
        size: "small",
      },
    ],
    edges: [
      {
        from: "opec",
        to: "india",
        label: "Oil imports · $120B/yr",
        color: "#F97316",
        weight: 4,
      },
      {
        from: "usa_fed",
        to: "rbi",
        label: "Rate parity pressure",
        color: "#EF4444",
        dash: true,
        weight: 2,
      },
      {
        from: "china_trade",
        to: "india",
        label: "Electronics/goods",
        color: "#7C3AED",
        weight: 3,
      },
      {
        from: "imf",
        to: "india",
        label: "Growth: +6.5%",
        color: "#22C55E",
        weight: 1,
      },
      {
        from: "rbi",
        to: "india",
        label: "Monetary policy",
        color: "#3B82F6",
        weight: 2,
      },
    ],
  },
  defense: {
    center: [30, 75],
    zoom: 4,
    nodes: [
      {
        id: "india",
        label: "India\n$74B budget",
        lat: 22,
        lng: 78,
        color: "#1E40AF",
        size: "large",
      },
      {
        id: "china_lac",
        label: "China PLA\nLAC incursion",
        lat: 35,
        lng: 82,
        color: "#EF4444",
        size: "large",
      },
      {
        id: "pak",
        label: "Pakistan\nLoC 62/mo",
        lat: 30,
        lng: 70,
        color: "#EF4444",
        size: "small",
      },
      {
        id: "usa_india",
        label: "US-India Pact\nQ2+BECA",
        lat: 38,
        lng: 50,
        color: "#22C55E",
        size: "small",
      },
      {
        id: "russia_s400",
        label: "Russia S-400\nDeliver. 85%",
        lat: 55,
        lng: 80,
        color: "#3B82F6",
        size: "small",
      },
      {
        id: "ior",
        label: "IOR Patrol\nNavy",
        lat: 10,
        lng: 70,
        color: "#1E40AF",
        size: "small",
      },
    ],
    edges: [
      {
        from: "china_lac",
        to: "india",
        label: "LAC: +18km incursion",
        color: "#EF4444",
        weight: 4,
      },
      {
        from: "pak",
        to: "india",
        label: "LoC incidents · 62/mo",
        color: "#EF4444",
        dash: true,
        weight: 3,
      },
      {
        from: "usa_india",
        to: "india",
        label: "Tech transfer · Q2+BECA",
        color: "#22C55E",
        weight: 2,
      },
      {
        from: "russia_s400",
        to: "india",
        label: "S-400 85% delivered",
        color: "#3B82F6",
        weight: 2,
      },
      {
        from: "india",
        to: "ior",
        label: "IOR patrol · 24/7",
        color: "#1E40AF",
        weight: 1,
      },
    ],
  },
  technology: {
    center: [25, 75],
    zoom: 3,
    nodes: [
      {
        id: "india_it",
        label: "India IT\n$250B exports",
        lat: 22,
        lng: 78,
        color: "#1E40AF",
        size: "large",
      },
      {
        id: "tsmc_tw",
        label: "TSMC Taiwan\n3nm chips",
        lat: 25,
        lng: 121,
        color: "#22C55E",
        size: "large",
      },
      {
        id: "usa_ban",
        label: "USA Chip Ban\nEAR controls",
        lat: 38,
        lng: -97,
        color: "#EF4444",
        size: "large",
      },
      {
        id: "india_fab",
        label: "Gujarat Fab\n28nm target",
        lat: 23,
        lng: 72,
        color: "#22C55E",
        size: "small",
      },
      {
        id: "china_ai",
        label: "China AI\nCyber threat",
        lat: 35,
        lng: 110,
        color: "#7C3AED",
        size: "small",
      },
    ],
    edges: [
      {
        from: "usa_ban",
        to: "india_it",
        label: "CHIPS act export ctrl",
        color: "#EF4444",
        dash: true,
        weight: 2,
      },
      {
        from: "tsmc_tw",
        to: "india_fab",
        label: "Tech transfer deal",
        color: "#22C55E",
        weight: 3,
      },
      {
        from: "china_ai",
        to: "india_it",
        label: "APT cyber attacks",
        color: "#7C3AED",
        dash: true,
        weight: 2,
      },
      {
        from: "india_fab",
        to: "india_it",
        label: "Import substitution",
        color: "#3B82F6",
        weight: 2,
      },
    ],
  },
  climate: {
    center: [20, 70],
    zoom: 3,
    nodes: [
      {
        id: "india",
        label: "India\nCOP30 net-zero 2070",
        lat: 22,
        lng: 78,
        color: "#1E40AF",
        size: "large",
      },
      {
        id: "monsoon",
        label: "Monsoon\n−22% deficit",
        lat: 16,
        lng: 74,
        color: "#3B82F6",
        size: "small",
      },
      {
        id: "arctic",
        label: "Arctic Melt\n1.8x global avg",
        lat: 78,
        lng: 0,
        color: "#7C3AED",
        size: "small",
      },
      {
        id: "solar",
        label: "Solar India\n100GW → 150GW",
        lat: 25,
        lng: 73,
        color: "#22C55E",
        size: "small",
      },
      {
        id: "cop30_uae",
        label: "COP30 UAE\nPledge watch",
        lat: 24,
        lng: 54,
        color: "#F97316",
        size: "small",
      },
    ],
    edges: [
      {
        from: "arctic",
        to: "monsoon",
        label: "Jet stream disruption",
        color: "#7C3AED",
        weight: 3,
      },
      {
        from: "monsoon",
        to: "india",
        label: "Kharif −15% · Food risk",
        color: "#EF4444",
        weight: 3,
      },
      {
        from: "solar",
        to: "india",
        label: "150GW target · COP pledge",
        color: "#22C55E",
        weight: 2,
      },
      {
        from: "cop30_uae",
        to: "india",
        label: "Net-zero commitment",
        color: "#F97316",
        weight: 1,
      },
    ],
  },
  society: {
    center: [22, 78],
    zoom: 4,
    nodes: [
      {
        id: "india",
        label: "India\n1.44B population",
        lat: 22,
        lng: 78,
        color: "#1E40AF",
        size: "large",
      },
      {
        id: "urban",
        label: "Urbanisation\n500M in cities",
        lat: 19,
        lng: 73,
        color: "#F97316",
        size: "small",
      },
      {
        id: "edu",
        label: "Edu Gap\n27% skill mismatch",
        lat: 26,
        lng: 80,
        color: "#EF4444",
        size: "small",
      },
      {
        id: "pmjay",
        label: "PM-JAY\n600M insured",
        lat: 18,
        lng: 84,
        color: "#22C55E",
        size: "small",
      },
      {
        id: "diaspora",
        label: "Diaspora\n$120B remittance",
        lat: 25,
        lng: 55,
        color: "#3B82F6",
        size: "small",
      },
    ],
    edges: [
      {
        from: "edu",
        to: "india",
        label: "Skills gap · 27% mismatch",
        color: "#EF4444",
        weight: 2,
      },
      {
        from: "urban",
        to: "india",
        label: "Inequality ↑ Gini 0.51",
        color: "#F97316",
        weight: 2,
      },
      {
        from: "pmjay",
        to: "india",
        label: "OOP expenditure −38%",
        color: "#22C55E",
        weight: 2,
      },
      {
        from: "diaspora",
        to: "india",
        label: "$120B inflow #3 global",
        color: "#3B82F6",
        weight: 3,
      },
    ],
  },
};

export default function MapView({
  domain,
  simulated,
}: {
  domain: DomainKey;
  simulated: boolean;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Initial map setup
  useEffect(() => {
    let L: any;
    async function initMap() {
      L = (await import("leaflet")).default;

      // Fix default icon path for Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!divRef.current || mapRef.current) return;

      const map = L.map(divRef.current, {
        center: DOMAIN_MAPS[domain]?.center || [25, 60],
        zoom: DOMAIN_MAPS[domain]?.zoom || 3,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "© OpenStreetMap © CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      mapRef.current = { map, L };

      // CRITICAL ADDITION: Immediately draw layers once map initializes
      updateLayers();
    }
    initMap();

    return () => {
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Update layers when domain/simulated changes
  useEffect(() => {
    if (!mapRef.current) return;
    updateLayers();
  }, [domain, simulated]);

  function updateLayers() {
    const { map, L } = mapRef.current;
    if (!map || !L) return;

    // remove all non-tile layers
    map.eachLayer((layer: any) => {
      if (!layer._url) map.removeLayer(layer);
    });

    const data = DOMAIN_MAPS[domain] ?? DOMAIN_MAPS.geopolitics;

    // fly to center
    map.flyTo(data.center, data.zoom, { duration: 1.2 });
    const nodeMap: Record<string, [number, number]> = {};

    // draw edges first (so markers appear on top)
    data.edges.forEach((edge) => {
      const fromN = data.nodes.find((n) => n.id === edge.from);
      const toN = data.nodes.find((n) => n.id === edge.to);
      if (!fromN || !toN) return;

      const from: [number, number] = [fromN.lat, fromN.lng];
      const to: [number, number] = [toN.lat, toN.lng];

      const line = L.polyline([from, to], {
        color: edge.color,
        weight: simulated ? (edge.weight ?? 2) * 0.7 : (edge.weight ?? 2),
        opacity: 0.8,
        dashArray: edge.dash ? "8 5" : undefined,
      }).addTo(map);

      // Enhanced Edge Popup
      line.bindPopup(
        `<div style="font-family:'Space Grotesk', system-ui, sans-serif; padding:4px;">
                    <b style="color:${edge.color}; font-size:13px; display:block; margin-bottom:4px;">${edge.label}</b>
                    <span style="color:#64748B; font-size:11px; font-weight:500;">
                        ${fromN.label.split("\n")[0]} <span style="color:#CBD5E1;">→</span> ${toN.label.split("\n")[0]}
                    </span>
                </div>`,
        { className: "custom-leaflet-popup" },
      );

      // Midpoint label with enhanced typography
      const midLat = (fromN.lat + toN.lat) / 2;
      const midLng = (fromN.lng + toN.lng) / 2;
      L.marker([midLat, midLng], {
        icon: L.divIcon({
          html: `<div style="
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(4px);
                        padding: 2px 6px;
                        border: 1px solid ${edge.color}40;
                        border-radius: 6px;
                        font-size: 10px;
                        font-weight: 600;
                        color: ${edge.color};
                        font-family: system-ui, -apple-system, sans-serif;
                        letter-spacing: -0.01em;
                        white-space: nowrap;
                        pointer-events: none;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                    ">${edge.label}</div>`,
          className: "",
          iconAnchor: [0, 8],
        }),
      }).addTo(map);
    });

    // draw nodes
    data.nodes.forEach((node) => {
      nodeMap[node.id] = [node.lat, node.lng];

      // REDUCED RADIUS SIZE HERE
      const radius = node.size === "large" ? 10 : 6;

      const marker = L.circleMarker([node.lat, node.lng], {
        radius,
        fillColor: node.color,
        color: "white",
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      // label icon with enhanced typography
      const lines = node.label.split("\n");
      L.marker([node.lat, node.lng], {
        icon: L.divIcon({
          html: `<div style="
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(4px);
                        padding: 4px 8px;
                        border: 1px solid ${node.color}30;
                        border-radius: 8px;
                        font-family: 'Space Grotesk', system-ui, sans-serif;
                        line-height: 1.4;
                        white-space: nowrap;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                        pointer-events: none;
                        transform: translateY(-8px);
                    ">
                        <b style="color:${node.color}; font-size:12px; letter-spacing:-0.02em;">${lines[0]}</b>
                        ${lines[1] ? `<br><span style="color:#64748B; font-size:10px; font-weight:500;">${lines[1]}</span>` : ""}
                    </div>`,
          className: "",
          iconAnchor: [-18, 24],
        }),
      }).addTo(map);

      // Enhanced Node Popup
      const relatedEdges = DOMAIN_MAPS[domain].edges.filter(
        (e) => e.from === node.id || e.to === node.id,
      );
      marker.bindPopup(
        `<div style="font-family:'Space Grotesk', system-ui, sans-serif; min-width:180px; padding:2px;">
                    <b style="color:${node.color}; font-size:15px; letter-spacing:-0.02em; display:block;">${lines[0]}</b>
                    ${lines[1] ? `<span style="color:#64748B; font-size:12px; font-weight:500; display:block; margin-top:2px;">${lines[1]}</span>` : ""}
                    <hr style="margin:10px 0; border:0; border-top:1px solid #E2E8F0;">
                    <b style="font-size:11px; color:#475569; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Relationships (${relatedEdges.length})</b>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${relatedEdges
                          .map(
                            (e) => `
                            <div style="display:flex; align-items:center; gap:6px; font-size:11px;">
                                <div style="width:6px; height:6px; border-radius:50%; background-color:${e.color}; flex-shrink:0;"></div>
                                <span style="color:#334155; font-weight:500;">${e.label}</span>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>`,
        { className: "custom-leaflet-popup" },
      );
    });
  }

  return (
    <div className="relative w-full">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-leaflet-popup .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    padding: 4px;
                }
                .custom-leaflet-popup .leaflet-popup-tip {
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
            `,
        }}
      />
      <div
        ref={divRef}
        style={{
          height: 400,
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          background: "#F8FAFC",
        }}
      />

      <div
        className="absolute bottom-4 left-4 flex flex-col gap-1.5"
        style={{ zIndex: 1000 }}
      >
        {[
          ["#EF4444", "Conflict / Sanction"],
          ["#22C55E", "Alliance / Support"],
          ["#3B82F6", "Trade / Dependency"],
          ["#F97316", "Energy Flow"],
          ["#7C3AED", "Geopolitical Pressure"],
        ].map(([c, l]) => (
          <div
            key={l}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg shadow-sm"
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(226,232,240,0.8)",
              fontSize: 10,
            }}
          >
            <div
              style={{ width: 16, height: 3, borderRadius: 2, background: c }}
            />
            <span
              style={{
                color: "#334155",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              {l}
            </span>
          </div>
        ))}
      </div>

      {simulated && (
        <div
          className="absolute top-4 right-4 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg"
          style={{
            background: "rgba(124,58,237,0.95)",
            color: "white",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          ⚡ Simulated Mode Active
        </div>
      )}
    </div>
  );
}
