"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Mountain, Satellite, Map } from "lucide-react";

interface ComplaintPin {
    id: string;
    title: string;
    lat: number;
    lng: number;
    location: string;
    priority: "High" | "Medium" | "Low";
    department: string;
    status: string;
    timestamp: string;
}

interface Props {
    complaint: ComplaintPin;
    onClose: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
    High: "#EF4444",
    Medium: "#F97316",
    Low: "#22C55E",
};

export default function Complaint3DView({ complaint, onClose }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<unknown>(null);
    const [viewMode, setViewMode] = useState<"3d" | "satellite" | "street">("3d");

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        import("leaflet").then((L) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const map = L.map(mapRef.current!, {
                center: [complaint.lat, complaint.lng],
                zoom: 16,
                zoomControl: true,
                scrollWheelZoom: true,
                attributionControl: false,
            });

            // Satellite tile by default for "3D feel"
            L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                { maxZoom: 20 }
            ).addTo(map);

            // Glowing pulsing marker
            const color = PRIORITY_COLORS[complaint.priority] ?? "#3B82F6";
            const pulseIcon = L.divIcon({
                className: "",
                html: `
                    <div style="position:relative;width:40px;height:40px;">
                        <div style="
                            position:absolute;inset:0;
                            border-radius:50%;
                            background:${color};
                            opacity:0.25;
                            animation:pulse3d 1.5s ease-in-out infinite;
                            transform:scale(1.5);
                        "></div>
                        <div style="
                            position:absolute;top:50%;left:50%;
                            transform:translate(-50%,-50%);
                            width:18px;height:18px;
                            border-radius:50%;
                            background:${color};
                            border:3px solid white;
                            box-shadow:0 0 12px ${color};
                        "></div>
                        <style>
                            @keyframes pulse3d {
                                0%,100%{transform:scale(1.4);opacity:0.3}
                                50%{transform:scale(2.2);opacity:0.1}
                            }
                        </style>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            });

            L.marker([complaint.lat, complaint.lng], { icon: pulseIcon })
                .addTo(map)
                .bindPopup(`
                    <div style="font-family:system-ui,sans-serif;padding:4px">
                        <div style="font-weight:700;font-size:12px;color:#1e293b">${complaint.title}</div>
                        <div style="font-size:10px;color:#64748b;margin-top:2px"><svg style="display:inline;vertical-align:middle;margin-right:3px" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${complaint.location}</div>
                        <div style="font-size:10px;margin-top:4px;padding:2px 6px;border-radius:4px;display:inline-block;background:${color}20;color:${color}">${complaint.priority} Priority</div>
                    </div>
                `, { closeButton: false })
                .openPopup();

            mapInstanceRef.current = map;
        });

        return () => {
            if (mapInstanceRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (mapInstanceRef.current as any).remove();
                mapInstanceRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Switch tile layers on mode change
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = mapInstanceRef.current as any;

        // Remove existing tile layers
        map.eachLayer((layer: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((layer as any)._url) map.removeLayer(layer);
        });

        import("leaflet").then((L) => {
            if (viewMode === "3d" || viewMode === "satellite") {
                L.tileLayer(
                    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                    { maxZoom: 20 }
                ).addTo(map);
                if (viewMode === "3d") map.setZoom(17);
            } else {
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 19,
                    attribution: "© OpenStreetMap contributors",
                }).addTo(map);
                map.setZoom(16);
            }
        });
    }, [viewMode]);

    const color = PRIORITY_COLORS[complaint.priority] ?? "#3B82F6";
    const date = new Date(complaint.timestamp).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
    });

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(8px)" }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className="w-full flex flex-col overflow-hidden"
                    style={{ maxWidth: 760, maxHeight: "90vh", borderRadius: 20, background: "#0F172A", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                                <MapPin style={{ width: 18, height: 18, color }} />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-white leading-tight">{complaint.title}</div>
                                <div className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.8)" }}>
                                    {complaint.location} · {complaint.id}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                                {complaint.priority}
                            </span>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-slate-400 hover:text-white hover:bg-white/10"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Map View Toggle */}
                    <div className="flex items-center gap-1 px-5 py-2.5" style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span className="text-xs font-medium mr-2" style={{ color: "rgba(148,163,184,0.7)" }}>View:</span>
                        {([
                            { mode: "3d" as const, icon: Mountain, label: "3D Satellite" },
                            { mode: "satellite" as const, icon: Satellite, label: "Satellite" },
                            { mode: "street" as const, icon: Map, label: "Street Map" },
                        ]).map(({ mode, icon: Icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                    background: viewMode === mode ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                                    color: viewMode === mode ? "#60A5FA" : "rgba(148,163,184,0.7)",
                                    border: `1px solid ${viewMode === mode ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}`,
                                }}
                            >
                                <Icon style={{ width: 12, height: 12 }} />
                                {label}
                            </button>
                        ))}
                        <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 8px ${color}` }} />
                            {complaint.lat.toFixed(4)}, {complaint.lng.toFixed(4)}
                        </div>
                    </div>

                    {/* Map Container */}
                    <div className="relative flex-1" style={{ minHeight: 380 }}>
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                        <div ref={mapRef} style={{ height: "100%", width: "100%", minHeight: 380 }} />

                        {/* 3D Tilt Overlay Indicator */}
                        {viewMode === "3d" && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold z-[1000]" style={{ background: "rgba(15,23,42,0.85)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.3)", backdropFilter: "blur(8px)" }}>
                                <Mountain style={{ width: 10, height: 10 }} /> SATELLITE · ZOOM 17
                            </div>
                        )}
                    </div>

                    {/* Footer Info Row */}
                    <div className="flex items-center justify-between px-5 py-3.5" style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-4">
                            {[
                                { label: "Department", value: complaint.department },
                                { label: "Status", value: complaint.status },
                                { label: "Filed", value: date },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "rgba(100,116,139,0.8)" }}>{item.label}</div>
                                    <div className="text-xs font-semibold text-white mt-0.5">{item.value}</div>
                                </div>
                            ))}
                        </div>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${complaint.lat},${complaint.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.25)" }}
                        >
                            <span>↗</span> Open in Google Maps
                        </a>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
