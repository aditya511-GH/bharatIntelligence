"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import MailPacketsPanel from "./MailPacketsPanel";
import { supabase } from "@/lib/supabase-client";
import { MapPin, Map, Search, Building2, LayoutDashboard, ClipboardList, BarChart3, Inbox, Building, Bell, AlertTriangle, CheckCircle2, Hourglass, Mountain, Satellite, Globe } from "lucide-react";

const IndiaGrievanceMap = dynamic(() => import("../citizen/IndiaGrievanceMap"), {
    ssr: false,
    loading: () => <div className="rounded-xl bg-slate-100 animate-pulse" style={{ height: 480 }} />,
});
const Complaint3DView = dynamic(() => import("../citizen/Complaint3DView"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────
interface ComplaintRecord {
    id: string;
    title: string;
    department: string;
    gravity: string;
    priority: "High" | "Medium" | "Low" | "Critical";
    problemType: string;
    status: "Filed" | "Under Review" | "Resolved";
    timestamp: string;
    location: string;
    lat: number;
    lng: number;
    userName: string;
    userEmail: string;
    description: string;
}
interface ComplaintPin {
    id: string; title: string; lat: number; lng: number; location: string;
    priority: "High" | "Medium" | "Low"; department: string; status: string; timestamp: string;
}
interface Stats {
    total: number; filed: number; underReview: number; resolved: number;
    byDepartment: Record<string, number>; byGravity: Record<string, number>;
    all: ComplaintRecord[]; locations: ComplaintPin[];
}

// ─── Analytics helpers ────────────────────────────────────────────────────────
const CAT_COLORS = ["#3B82F6", "#22C55E", "#F97316", "#8B5CF6", "#EC4899"];
function buildDailyTrend(complaints: ComplaintRecord[]) {
    const map: Record<string, number> = {};
    complaints.forEach((c) => {
        const d = new Date(c.timestamp);
        const key = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
        map[key] = (map[key] ?? 0) + 1;
    });
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today); d.setDate(today.getDate() - (29 - i));
        const key = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
        return { date: key, count: map[key] ?? 0 };
    });
}
function buildCategoryBreakdown(byDept: Record<string, number>) {
    const map: Record<string, number> = { Infrastructure: 0, Sanitation: 0, "Public Safety": 0, Utilities: 0, Other: 0 };
    Object.entries(byDept).forEach(([dept, count]) => {
        if (["Infrastructure", "Transport", "Housing"].includes(dept)) map["Infrastructure"] += count;
        else if (["Water/Sanitation", "Environment"].includes(dept)) map["Sanitation"] += count;
        else if (["Police/Safety", "Corruption/Fraud"].includes(dept)) map["Public Safety"] += count;
        else if (dept === "Electricity") map["Utilities"] += count;
        else map["Other"] += count;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);
}
const AREA_KEYWORDS: [string, string[]][] = [
    ["North", ["delhi", "chandigarh", "jammu", "amritsar", "ludhiana", "dehradun", "shimla", "haryana", "punjab"]],
    ["South", ["chennai", "bangalore", "bengaluru", "hyderabad", "kochi", "trivandrum", "mysore", "coimbatore", "vizag", "kerala", "telangana", "karnataka", "tamil", "andhra"]],
    ["East", ["kolkata", "bhubaneswar", "patna", "ranchi", "guwahati", "west bengal", "odisha", "jharkhand", "assam", "bihar"]],
    ["West", ["mumbai", "pune", "ahmedabad", "surat", "nagpur", "goa", "maharashtra", "gujarat", "rajasthan", "jaipur", "jodhpur"]],
    ["Central", ["bhopal", "indore", "lucknow", "agra", "varanasi", "allahabad", "madhya pradesh", "uttar pradesh", "chhattisgarh", "raipur"]],
];
function buildAreaDistribution(complaints: ComplaintRecord[]) {
    const map: Record<string, { area: string; high: number; medium: number; low: number }> = {};
    for (const [area] of AREA_KEYWORDS) {
        map[area] = { area, high: 0, medium: 0, low: 0 };
    }
    for (const c of complaints) {
        const loc = c.location.toLowerCase();
        let matched = false;
        for (const [area, keywords] of AREA_KEYWORDS) {
            if (keywords.some(kw => loc.includes(kw))) {
                if (["High", "Critical"].includes(c.priority)) map[area].high++;
                else if (c.priority === "Medium") map[area].medium++;
                else map[area].low++;
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Fallback: put in Central
            if (["High", "Critical"].includes(c.priority)) map["Central"].high++;
            else if (c.priority === "Medium") map["Central"].medium++;
            else map["Central"].low++;
        }
    }
    return Object.values(map);
}

// ─── Official Avatar (real user from Supabase) ───────────────────────────────
function OfficialAvatar() {
    const [initials, setInitials] = useState("AJ");
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                const name = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Official";
                const parts = name.trim().split(" ");
                setInitials(parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase());
            }
        });
    }, []);
    return <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{initials}</div>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
    const s: Record<string, string> = {
        High: "bg-red-100 text-red-700 border-red-200",
        Medium: "bg-amber-100 text-amber-700 border-amber-200",
        Low: "bg-green-100 text-green-700 border-green-200",
        Critical: "bg-red-100 text-red-700 border-red-200",
    };
    return <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${s[priority] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>{priority}</span>;
}

function StatusDropdown({ status, complaintId, onUpdate }: {
    status: string; complaintId: string;
    onUpdate: (id: string, s: "Filed" | "Under Review" | "Resolved") => void;
}) {
    const c: Record<string, string> = {
        "Filed": "bg-blue-50 text-blue-700 border-blue-200",
        "Under Review": "bg-amber-50 text-amber-700 border-amber-200",
        "Resolved": "bg-green-50 text-green-700 border-green-200",
    };
    return (
        <select
            value={status}
            onChange={(e) => onUpdate(complaintId, e.target.value as "Filed" | "Under Review" | "Resolved")}
            className={`text-xs font-semibold px-2 py-1 rounded border outline-none cursor-pointer ${c[status] ?? ""}`}
        >
            <option value="Filed">Pending</option>
            <option value="Under Review">In Progress</option>
            <option value="Resolved">Resolved</option>
        </select>
    );
}

// ─── Complaint Detail Modal ───────────────────────────────────────────────────
function ComplaintDetailModal({ complaint, onClose, onUpdate }: {
    complaint: ComplaintRecord; onClose: () => void;
    onUpdate: (id: string, s: "Filed" | "Under Review" | "Resolved") => void;
}) {
    const color: Record<string, string> = { High: "#EF4444", Medium: "#F97316", Low: "#22C55E" };
    const c = color[complaint.priority] ?? "#64748B";
    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
                onClick={onClose}
            >
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <PriorityBadge priority={complaint.priority} />
                                <span className="text-xs text-slate-400 font-mono">{complaint.id}</span>
                            </div>
                            <div className="font-bold text-slate-900 text-lg leading-tight">{complaint.title}</div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {complaint.location}</div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors">✕</button>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Details grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Filed By", value: complaint.userName },
                                { label: "Department", value: complaint.department },
                                { label: "Gravity", value: complaint.gravity },
                                { label: "Problem Type", value: complaint.problemType },
                                { label: "Filed On", value: new Date(complaint.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
                                { label: "Email", value: complaint.userEmail || "N/A" },
                            ].map((f) => (
                                <div key={f.label} className="bg-slate-50 rounded-lg p-3">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">{f.label}</div>
                                    <div className="text-sm font-semibold text-slate-800 truncate">{f.value}</div>
                                </div>
                            ))}
                        </div>
                        {/* Description */}
                        {complaint.description && (
                            <div className="bg-slate-50 rounded-lg p-4">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Complaint Description</div>
                                <div className="text-sm text-slate-700 leading-relaxed">{complaint.description}</div>
                            </div>
                        )}
                        {/* AI Gravity Bar */}
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">AI-Assessed Priority</div>
                                <span className="text-xs font-bold" style={{ color: c }}>{complaint.gravity} Severity</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{
                                    width: complaint.gravity === "Critical" ? "100%" : complaint.gravity === "High" ? "80%" : complaint.gravity === "Medium" ? "50%" : "25%",
                                    background: c
                                }} />
                            </div>
                        </div>
                        {/* Update status */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="text-sm font-semibold text-slate-700">Update Status:</div>
                            <div className="flex gap-2">
                                {(["Filed", "Under Review", "Resolved"] as const).map((s) => (
                                    <button key={s}
                                        onClick={() => { onUpdate(complaint.id, s); onClose(); }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${complaint.status === s
                                            ? s === "Filed" ? "bg-blue-600 text-white border-blue-600"
                                                : s === "Under Review" ? "bg-amber-600 text-white border-amber-600"
                                                : "bg-green-600 text-white border-green-600"
                                            : "hover:bg-slate-50 text-slate-600 border-slate-200"
                                            }`}
                                    >
                                        {s === "Filed" ? "Pending" : s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── 2D Map Component using Leaflet ──────────────────────────────────────────────
function Map3DView({ pins }: { pins: ComplaintPin[] }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<{ map: any; L: any } | null>(null);
    const [selected3D, setSelected3D] = useState<ComplaintPin | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        async function initMap() {
            const L = (await import("leaflet")).default;
            if (!document.getElementById("leaflet-css")) {
                const link = document.createElement("link");
                link.id = "leaflet-css";
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }
            if (!mapRef.current) return;

            const map = L.map(mapRef.current, {
                center: [20.5937, 78.9629],
                zoom: 4.5,
                zoomControl: false,
            });
            
            L.control.zoom({ position: 'topright' }).addTo(map);

            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
                maxZoom: 20,
            }).addTo(map);

            const pColors: Record<string, string> = { High: "#EF4444", Medium: "#F97316", Low: "#16A34A" };
            pins.forEach((pin) => {
                const color = pColors[pin.priority] ?? "#3B82F6";
                // Firmly bound to coordinates by setting exact iconSize, with overflow handled automatically by DOM
                const marker = L.marker([pin.lat, pin.lng], {
                    icon: L.divIcon({
                        html: `<div class="pin-hover" style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:transform .15s;cursor:pointer;pointer-events:auto;transform-origin:center;"></div>`,
                        className: "",
                        iconSize: [14, 14],
                        iconAnchor: [7, 7]
                    })
                }).addTo(map);

                marker.on("click", () => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (window as any)._map3DSelect?.(pin.id);
                    map.flyTo([pin.lat, pin.lng], 13, { duration: 1.2 });
                });
            });

            mapInstanceRef.current = { map, L };
            
            // Inject stable hover animation class
            if (!document.getElementById("leaflet-pin-hover")) {
                const style = document.createElement("style");
                style.id = "leaflet-pin-hover";
                style.textContent = `.pin-hover:hover { transform: scale(1.6) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; }`;
                document.head.appendChild(style);
            }
        }
        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.map.remove();
                mapInstanceRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)._map3DSelect = (id: string) => {
            const found = pins.find((p) => p.id === id);
            if (found) setSelected3D(found);
        };
        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any)._map3DSelect;
        };
    }, [pins]);

    return (
        <div className="relative" style={{ height: 520 }}>
            {/* The Leaflet container must handle its own z-index context to avoid leaking above modals */}
            <div ref={mapRef} style={{ height: "100%", width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", zIndex: 1 }} />
            
            {/* View controls */}
            <div className="absolute top-3 left-3 z-[400] space-y-1.5 flex flex-col">
                {[
                    { label: <><Map className="w-3.5 h-3.5 inline mr-1.5" /> Overview</>, zoom: 4.5 },
                    { label: <><Search className="w-3.5 h-3.5 inline mr-1.5" /> Regional View</>, zoom: 8 },
                    { label: <><Building2 className="w-3.5 h-3.5 inline mr-1.5" /> City View</>, zoom: 12 },
                ].map((v, i) => (
                    <button key={i}
                        onClick={() => {
                            const map = mapInstanceRef.current?.map;
                            if (map) map.flyTo([20.5937, 78.9629], v.zoom, { duration: 1.2 });
                        }}
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white/90 border border-slate-200 shadow-sm transition-all hover:bg-white hover:shadow min-w-[120px] text-left"
                    >{v.label}</button>
                ))}
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-3 z-[400] flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {[["#EF4444", "High"], ["#F97316", "Medium"], ["#16A34A", "Low"]].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                        <span className="text-xs text-white font-medium">{l}</span>
                    </div>
                ))}
            </div>

            {/* Hint & Badge */}
            <div className="absolute top-3 right-16 z-[400] px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 bg-white/90 border border-slate-200 shadow-sm flex items-center gap-1.5">
                <Map className="w-3 h-3" /> LEAFLET MAP VIEW
            </div>
            <div className="absolute bottom-6 right-3 z-[400] px-2.5 py-1.5 rounded-lg text-[10px] text-slate-600 bg-white/90 border border-slate-200 shadow-sm">
                Click any pin for detail view
            </div>

            {/* Keep 3D Detail modal in a high z-index wrapper */}
            {selected3D && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
                    <Complaint3DView complaint={selected3D} onClose={() => setSelected3D(null)} />
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type SubTab = "overview" | "reports" | "dashboard" | "analytics" | "map" | "mail";
type SideNav = "overview" | "reports" | "analytics" | "map" | "mail";

export default function CitizenReportsPanel() {
    const [subTab, setSubTab] = useState<SubTab>("overview");
    const [sideNav, setSideNav] = useState<SideNav>("overview");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
    const [search, setSearch] = useState("");
    const [filterPriority, setFilterPriority] = useState("All");
    const [viewComplaint, setViewComplaint] = useState<ComplaintRecord | null>(null);
    const [useSatellite, setUseSatellite] = useState(false);

    useEffect(() => {
        fetch("/api/complaints")
            .then((r) => r.json())
            .then((data: Stats) => { setStats(data); setComplaints(data.all ?? []); })
            .catch(() => setStats(null))
            .finally(() => setLoading(false));
    }, []);

    async function handleStatusUpdate(id: string, newStatus: "Filed" | "Under Review" | "Resolved") {
        await fetch("/api/complaints", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: newStatus }),
        }).catch(() => {});
        setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    }

    const highPriority = complaints.filter((c) => c.priority === "High").length;
    const resolved = complaints.filter((c) => c.status === "Resolved").length;
    const pending = complaints.filter((c) => c.status === "Filed").length;
    const recentHigh = complaints.filter((c) => c.priority === "High").slice(0, 5);
    const weeklyTrend = buildDailyTrend(complaints);
    const categoryBreakdown = buildCategoryBreakdown(stats?.byDepartment ?? {});
    const areaData = buildAreaDistribution(complaints);
    const pins = stats?.locations ?? [];

    const filtered = complaints.filter((c) => {
        const q = search.toLowerCase();
        const pMatch = filterPriority === "All" || c.priority === filterPriority;
        const sMatch = q === "" || c.id.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.userName.toLowerCase().includes(q);
        return pMatch && sMatch;
    });

    const SIDENAV_ITEMS: { id: SideNav; icon: React.ReactNode; label: string; tab: SubTab }[] = [
        { id: "overview", icon: <LayoutDashboard className="w-4 h-4"/>, label: "Dashboard Overview", tab: "overview" as SubTab },
        { id: "reports", icon: <ClipboardList className="w-4 h-4"/>, label: "Complaints Received", tab: "reports" as SubTab },
        { id: "analytics", icon: <BarChart3 className="w-4 h-4"/>, label: "Analytics", tab: "analytics" },
        { id: "map", icon: <Map className="w-4 h-4"/>, label: "Map View", tab: "map" },
        { id: "mail", icon: <Inbox className="w-4 h-4"/>, label: "Mail Inbox", tab: "mail" },
    ];

    function selectNav(item: typeof SIDENAV_ITEMS[number]) {
        setSideNav(item.id);
        setSubTab(item.tab);
    }

    if (loading) return (
        <div className="flex h-full animate-pulse">
            <div className="w-56 bg-white border-r border-slate-200 shrink-0" />
            <div className="flex-1 p-6 space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Left Sidebar ── */}
            {isSidebarOpen && (
            <div className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all">
                {/* Panel header */}
                <div className="px-4 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Collapse sidebar"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"/>
                                <line x1="3" y1="6" x2="21" y2="6"/>
                                <line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                        <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold"><Building className="w-3.5 h-3.5"/></div>
                        <span className="font-bold text-slate-900 text-sm">Authority Panel</span>
                    </div>
                </div>
                {/* Nav items */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {SIDENAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => selectNav(item)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${sideNav === item.id
                                ? "bg-blue-50 text-blue-700 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <span className="text-base leading-none">{item.icon}</span>
                            <span className="leading-tight">{item.label}</span>
                        </button>
                    ))}
                </nav>
                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400">© 2026 Bharat Intelligence · v2.0</div>
                </div>
            </div>
            )}

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {/* Top bar */}
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
                    {/* Hamburger (shown when sidebar is closed) */}
                    {!isSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Open sidebar"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"/>
                                <line x1="3" y1="6" x2="21" y2="6"/>
                                <line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                    )}
                    {/* Page title */}
                    <div className="font-semibold text-slate-800 text-sm">
                        {sideNav === "overview" ? "Dashboard Overview" : sideNav === "reports" ? "Complaints Received" : sideNav === "analytics" ? "Analytics" : sideNav === "map" ? "Map View" : "Mail Inbox"}
                    </div>
                    {/* Search */}
                    <div className="ml-auto flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by ID, location, or status..."
                            className="bg-transparent text-sm outline-none text-slate-700 w-52 placeholder-slate-400"
                        />
                    </div>
                    {/* Notification + Avatar */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"><Bell className="w-4 h-4" /></div>
                            {pending > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">{pending}</div>}
                        </div>
                        <OfficialAvatar />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── DASHBOARD (OVERVIEW HUB) ─────────────────────────────────────────── */}
                    {subTab === "overview" && (
                        <div className="p-6 space-y-6">
                            {/* Stats Cards */}
                            <div>
                                <h2 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
                                    <LayoutDashboard className="w-5 h-5 text-blue-600" /> Dashboard Overview
                                </h2>
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { label: "Total Reports", value: complaints.length, icon: <ClipboardList className="w-6 h-6 text-blue-600"/>, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
                                        { label: "High Priority", value: highPriority, icon: <AlertTriangle className="w-6 h-6 text-red-600"/>, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
                                        { label: "Resolved", value: resolved, icon: <CheckCircle2 className="w-6 h-6 text-green-600"/>, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
                                        { label: "Pending", value: pending, icon: <Hourglass className="w-6 h-6 text-amber-600"/>, color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
                                    ].map((c) => (
                                        <motion.div key={c.label} whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                                            className="bg-white rounded-xl p-5 flex items-center justify-between shadow-sm"
                                            style={{ border: `1px solid ${c.border}` }}
                                        >
                                            <div>
                                                <div className="text-sm font-semibold text-slate-500 mb-1">{c.label}</div>
                                                <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: c.bg }}>
                                                {c.icon}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Hub Flashcards */}
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 mb-3">System Modules</h3>
                                <div className="grid grid-cols-2 gap-5">
                                    {[
                                        { id: "reports", title: "Complaints Received", desc: "View, filter, and manage all incoming citizen grievances. Review AI-assigned gravity scores and take immediate routing actions.", icon: <ClipboardList className="w-7 h-7" />, color: "blue" },
                                        { id: "analytics", title: "Analytics Engine", desc: "Dive deep into macro-level statistics. Analyze priority heatmaps, departmental distribution, and systemic resolution flows.", icon: <BarChart3 className="w-7 h-7" />, color: "indigo" },
                                        { id: "map", title: "Live Map View", desc: "Interactive geographic distribution of pending complaints across India with real-time priority pinpointing.", icon: <Map className="w-7 h-7" />, color: "emerald" },
                                        { id: "mail", title: "Secure Mail Inbox", desc: "Encrypted official communication channel for AI-formalized citizen letters and cross-departmental secure drops.", icon: <Inbox className="w-7 h-7" />, color: "rose" },
                                    ].map(mod => (
                                        <motion.div key={mod.id} 
                                            whileHover={{ scale: 1.015, rotateX: 2, rotateY: 2 }} 
                                            transition={{ type: "spring", stiffness: 300 }}
                                            className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl overflow-hidden cursor-pointer"
                                            onClick={() => selectNav(SIDENAV_ITEMS.find(s => s.id === mod.id)!)}
                                        >
                                            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full bg-${mod.color}-50 bg-opacity-50 group-hover:bg-${mod.color}-100 transition-colors blur-2xl`}></div>
                                            <div className="flex items-start gap-4 relative z-10">
                                                <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl bg-${mod.color}-50 border border-${mod.color}-100 text-${mod.color}-600 group-hover:scale-110 transition-transform`}>
                                                    {mod.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">{mod.title}</h4>
                                                    <p className="text-sm text-slate-500 leading-relaxed max-w-[95%] mb-4">{mod.desc}</p>
                                                    <div className={`text-xs font-bold text-${mod.color}-600 flex items-center gap-1 uppercase tracking-wider group-hover:translate-x-1 transition-transform`}>
                                                        Access Module
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── COMPLAINTS RECEIVED (REPORTS) ─────────────────────────────────────────── */}
                    {subTab === "reports" && (
                        <div className="p-6 space-y-6">
                            {/* Stats Cards */}
                            <div>
                                <h2 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-2">
                                    <LayoutDashboard className="w-5 h-5 text-blue-600" /> Dashboard Overview
                                </h2>
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { label: "Total Reports", value: complaints.length, icon: <ClipboardList className="w-6 h-6 text-blue-600"/>, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
                                        { label: "High Priority", value: highPriority, icon: <AlertTriangle className="w-6 h-6 text-red-600"/>, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
                                        { label: "Resolved", value: resolved, icon: <CheckCircle2 className="w-6 h-6 text-green-600"/>, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
                                        { label: "Pending", value: pending, icon: <Hourglass className="w-6 h-6 text-amber-600"/>, color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
                                    ].map((c) => (
                                        <motion.div key={c.label} whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                                            className="bg-white rounded-xl p-5 flex items-center justify-between shadow-sm"
                                            style={{ border: `1px solid ${c.border}` }}
                                        >
                                            <div>
                                                <div className="text-sm font-semibold text-slate-500 mb-1">{c.label}</div>
                                                <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: c.bg }}>
                                                {c.icon}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Reports Table + Sidebar */}
                            <div className="flex gap-5">
                                {/* Table */}
                                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                        <div className="font-bold text-slate-900">Recent Reports</div>
                                        <div className="flex items-center gap-2">
                                            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
                                                className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 outline-none bg-white">
                                                <option value="All">All Priorities</option>
                                                <option value="High">High</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Low">Low</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50">
                                                    {["REPORT ID", "USER NAME", "LOCATION", "PRIORITY", "STATUS", "DATE", "ACTIONS"].map((h) => (
                                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map((c, i) => (
                                                    <tr key={c.id} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                                                        <td className="px-4 py-3 text-blue-600 font-semibold">{c.id}</td>
                                                        <td className="px-4 py-3 text-slate-700 font-medium">{c.userName}</td>
                                                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[130px] truncate">{c.location}</td>
                                                        <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                                                        <td className="px-4 py-3">
                                                            <StatusDropdown status={c.status} complaintId={c.id} onUpdate={handleStatusUpdate} />
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                                            {new Date(c.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => setViewComplaint(c)}
                                                                    className="px-3 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                                                                    View
                                                                </button>
                                                                <button onClick={() => handleStatusUpdate(c.id, "Resolved")}
                                                                    className="px-3 py-1 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                                                                    Resolve
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Right Sidebar */}
                                <div className="w-64 shrink-0 space-y-4">
                                    {/* High Priority */}
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <div className="font-bold text-slate-900 text-sm">Recent High-Priority Reports</div>
                                            <span className="text-slate-400 text-base cursor-pointer">···</span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {recentHigh.map((c) => (
                                                <div key={c.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setViewComplaint(c)}>
                                                    <div className="text-sm font-semibold text-slate-800 leading-tight mb-1 line-clamp-2">{c.title}</div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-blue-600 font-medium">{c.id}</span>
                                                        <span className="text-xs text-slate-400">{new Date(c.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Quick trend */}
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                                        <div className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
                                            Reports This Week <span className="text-slate-400 text-base cursor-pointer">···</span>
                                        </div>
                                        <ResponsiveContainer width="100%" height={80}>
                                            <AreaChart data={weeklyTrend.slice(-7)} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                                                <defs><linearGradient id="sw2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
                                                <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="url(#sw2)" strokeWidth={2} dot={false} />
                                                <Tooltip contentStyle={{ fontSize: 10 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── ANALYTICS ─────────────────────────────────────────── */}
                    {subTab === "analytics" && (
                        <div className="p-6 space-y-6">
                            <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" /> Analytics Dashboard
                            </h2>
                            <div className="grid grid-cols-2 gap-5">
                                {/* Daily Trend */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                                    <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                        Daily Reports Trend
                                    </div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <AreaChart data={weeklyTrend.slice(-15)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                            <defs><linearGradient id="dt2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                                            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                                            <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="url(#dt2)" strokeWidth={2} dot={false} name="Reports" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Category Donut */}
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                                    <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a10 10 0 0110 10" /></svg>
                                        Report Category Breakdown
                                    </div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" stroke="none">
                                                {categoryBreakdown.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                            <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            {/* Area-wise bar chart */}
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                                <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    Area-wise Issue Distribution
                                </div>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="area" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="high" name="High Priority" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
                                        <Bar dataKey="medium" name="Medium Priority" fill="#F97316" radius={[3, 3, 0, 0]} maxBarSize={28} />
                                        <Bar dataKey="low" name="Low Priority" fill="#22C55E" radius={[3, 3, 0, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── MAIL INBOX ─────────────────────────────────────────── */}
                    {subTab === "mail" && (
                        <div className="h-full overflow-hidden">
                            <MailPacketsPanel />
                        </div>
                    )}

                    {/* ── MAP VIEW ──────────────────────────────────────────── */}
                    {subTab === "map" && (
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold text-xl text-slate-900">Complaint Map View</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Geographic distribution · Click any pin to view details in 3D</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setUseSatellite(false)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${!useSatellite ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}>
                                        <Mountain className="w-3.5 h-3.5" /> 3D Map
                                    </button>
                                    <button onClick={() => setUseSatellite(true)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${useSatellite ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}>
                                        <Satellite className="w-3.5 h-3.5" /> Satellite
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                {!useSatellite ? (
                                    pins.length > 0 ? <Map3DView pins={pins} /> : <div className="h-96 flex items-center justify-center text-slate-400">No complaints to map</div>
                                ) : (
                                    pins.length > 0 ? <IndiaGrievanceMap complaints={pins} height={520} useSatellite={true} /> : <div className="h-96 flex items-center justify-center text-slate-400">No complaints to map</div>
                                )}
                            </div>
                        </div>
                    )}


                </div>
            </div>

            {/* Complaint Detail Modal */}
            {viewComplaint && (
                <ComplaintDetailModal
                    complaint={viewComplaint}
                    onClose={() => setViewComplaint(null)}
                    onUpdate={handleStatusUpdate}
                />
            )}
        </div>
    );
}
