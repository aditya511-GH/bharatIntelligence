"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const Complaint3DView = dynamic(() => import("./Complaint3DView"), { ssr: false });

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
    complaints: ComplaintPin[];
    height?: number;
    useSatellite?: boolean;
}

export default function IndiaGrievanceMap({ complaints, height = 420, useSatellite = false }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<unknown>(null);
    const [selected3D, setSelected3D] = useState<ComplaintPin | null>(null);

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
                center: [20.5937, 78.9629],
                zoom: 5,
                zoomControl: true,
                scrollWheelZoom: true,
                attributionControl: true,
            });

            // Tile Layer
            const tileUrl = useSatellite
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

            const attribution = useSatellite
                ? "Tiles © Esri"
                : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

            L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);

            // Priority colors
            const priorityColors: Record<string, string> = {
                High: "#EF4444",
                Medium: "#F97316",
                Low: "#22C55E",
            };

            // Add complaint pins with pulsing effect
            complaints.forEach((c) => {
                const color = priorityColors[c.priority] ?? "#3B82F6";
                const date = new Date(c.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

                // Pulsing div icon
                const pulseIcon = L.divIcon({
                    className: "",
                    html: `
                        <div style="position:relative;width:32px;height:32px;">
                            <div style="
                                position:absolute;inset:0;border-radius:50%;
                                background:${color};opacity:0.2;
                                animation:mapPulse 2s ease-in-out infinite;
                            "></div>
                            <div style="
                                position:absolute;top:50%;left:50%;
                                transform:translate(-50%,-50%);
                                width:14px;height:14px;border-radius:50%;
                                background:${color};border:2.5px solid white;
                                box-shadow:0 0 8px ${color}80;
                            "></div>
                            <style>
                                @keyframes mapPulse {
                                    0%,100%{transform:scale(1);opacity:0.2}
                                    50%{transform:scale(1.8);opacity:0.05}
                                }
                            </style>
                        </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                });

                const marker = L.marker([c.lat, c.lng], { icon: pulseIcon });

                marker.bindPopup(`
                    <div style="font-family:system-ui,sans-serif;min-width:200px;padding:2px">
                        <div style="font-weight:700;font-size:12px;color:#1e293b;margin-bottom:4px">${c.title}</div>
                        <div style="font-size:11px;color:#64748b;margin-bottom:8px"><svg style="display:inline;vertical-align:middle;margin-right:3px" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${c.location}</div>
                        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
                            <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${color}20;color:${color};border:1px solid ${color}50">${c.priority}</span>
                            <span style="padding:2px 8px;border-radius:20px;font-size:10px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0">${c.status}</span>
                        </div>
                        <div style="font-size:10px;color:#94a3b8;margin-bottom:8px"><svg style="display:inline;vertical-align:middle;margin-right:3px" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><rect x="2" y="6" width="20" height="16"/><path d="M12 6V2"/><path d="M3 11h18"/></svg>${c.department} · ${date}</div>
                        <button
                            onclick="window._open3DView('${c.id}')"
                            style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(59,130,246,0.4);background:rgba(59,130,246,0.1);color:#2563eb;font-size:11px;font-weight:600;cursor:pointer;"
                        >
                            <svg style="display:inline;vertical-align:middle;margin-right:4px" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg> Open 3D View
                        </button>
                    </div>
                `, { maxWidth: 240 });

                marker.addTo(map);
            });

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

    // Register global click handler for 3D view button in popups
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)._open3DView = (id: string) => {
            const found = complaints.find((c) => c.id === id);
            if (found) setSelected3D(found);
        };
        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any)._open3DView;
        };
    }, [complaints]);

    return (
        <>
            {/* Leaflet CSS */}
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <div
                ref={mapRef}
                style={{ height, width: "100%", borderRadius: 12, overflow: "hidden", zIndex: 0 }}
            />
            {selected3D && (
                <Complaint3DView
                    complaint={selected3D}
                    onClose={() => setSelected3D(null)}
                />
            )}
        </>
    );
}
