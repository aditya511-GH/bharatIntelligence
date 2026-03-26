"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { truncate, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase-client";
import { Sparkles, Bot, AlertTriangle, CheckCircle2, AlertOctagon, Siren, ClipboardList, Pin, XCircle, CloudUpload, Leaf, Search, Wrench, Hourglass, Globe, Map, Satellite, MapPin, Mail, Droplets, Wind, Eye, Sun, Building, Activity, GraduationCap, Bus, Zap, ShieldAlert, Clock, PenLine } from "lucide-react";


const IndiaGrievanceMap = dynamic(() => import("./IndiaGrievanceMap"), {
    ssr: false,
    loading: () => <div className="rounded-xl bg-slate-100 animate-pulse" style={{ height: 380 }} />,
});

// ─── Types ─────────────────────────────────────────────────────────────────
interface Scheme {
    id: string;
    title: string;
    ministry: string;
    description: string;
    beneficiaries: string;
    deadline: string | null;
    applicationUrl: string;
    category: string;
    tags: string[];
}

type SchemeDomain = "All" | "Tracking";

interface ChatMessage {
    role: "user" | "assistant";
    text: string;
}

interface ComplaintStats {
    total: number;
    filed: number;
    underReview: number;
    resolved: number;
    byDepartment: Record<string, number>;
    byGravity: Record<string, number>;
}

// ─── Scheme Card ───────────────────────────────────────────────────────────
function SchemeCard({
    scheme,
    onCardClick,
    onInterested,
}: {
    scheme: Scheme;
    onCardClick: (s: Scheme) => void;
    onInterested: (s: Scheme) => void;
}) {
    const [interested, setInterested] = useState(false);

    function handleInterested(e: React.MouseEvent) {
        e.stopPropagation();
        setInterested(true);
        onInterested(scheme);
    }

    return (
        <motion.div
            whileHover={{ y: -2 }}
            onClick={() => onCardClick(scheme)}
            className="bg-white rounded-xl p-5 cursor-pointer transition-all shadow-sm border border-slate-200 hover:shadow-md relative group"
        >
            {/* Interested button */}
            <button
                onClick={handleInterested}
                className={`absolute top-4 right-4 px-3 py-1.5 rounded-md text-xs font-semibold transition-all z-10 ${interested
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
            >
                {interested ? "✓ Tracked" : "+ Track"}
            </button>

            <div className="pr-24">
                <div className="font-bold text-slate-900 text-sm mb-1.5 leading-tight group-hover:text-blue-600 transition-colors">
                    {truncate(scheme.title, 60)}
                </div>
                <div className="text-xs font-medium text-blue-600 mb-2">
                    {scheme.ministry}
                </div>
                <div className="text-xs leading-relaxed text-slate-500 mb-4 line-clamp-2">
                    {scheme.description}
                </div>
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-wrap gap-1.5">
                        {scheme.tags.slice(0, 2).map((t) => (
                            <span
                                key={t}
                                className="px-2 py-1 rounded border border-slate-100 bg-slate-50 text-slate-600 text-[10px] font-semibold uppercase tracking-wider"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                    {scheme.deadline && (
                        <div className="text-xs font-medium text-rose-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {formatDate(scheme.deadline)}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Scheme Modal ──────────────────────────────────────────────────────────
function SchemeModal({
    scheme,
    onClose,
}: {
    scheme: Scheme;
    onClose: () => void;
}) {
    const [summary, setSummary] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingChat, setLoadingChat] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        (async () => {
            setLoadingSummary(true);
            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "summarize",
                        schemeName: scheme.title,
                        schemeDescription: scheme.description,
                    }),
                });
                const data = await res.json();
                setSummary(data.summary ?? "Unable to summarize.");
            } catch {
                setSummary("Unable to generate summary.");
            }
            setLoadingSummary(false);
        })();
    }, [scheme]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    async function sendChat() {
        if (!input.trim() || loadingChat) return;
        const msg = input.trim();
        setInput("");
        setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
        setLoadingChat(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: msg,
                    context: `Scheme: ${scheme.title}. Ministry: ${scheme.ministry}. ${scheme.description}. Beneficiaries: ${scheme.beneficiaries}. Deadline: ${scheme.deadline ?? "Not specified"}.`,
                    history: chatMessages.map((m) => ({
                        role: m.role === "assistant" ? "model" : "user",
                        text: m.text,
                    })),
                }),
            });
            const data = await res.json();
            setChatMessages((prev) => [
                ...prev,
                { role: "assistant", text: data.response ?? "Unable to respond." },
            ]);
        } catch {
            setChatMessages((prev) => [
                ...prev,
                { role: "assistant", text: "Error connecting to AI." },
            ]);
        }
        setLoadingChat(false);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
                    <div>
                        <div className="font-bold text-lg text-slate-900 mb-1">
                            {scheme.title}
                        </div>
                        <div className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {scheme.ministry}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* AI Summary */}
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                        <div className="text-xs font-bold text-indigo-700 mb-2 tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> AI INTELLIGENCE SUMMARY
                        </div>
                        {loadingSummary ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-3 py-1">
                                    <div className="h-2 bg-indigo-200 rounded w-3/4"></div>
                                    <div className="h-2 bg-indigo-200 rounded w-5/6"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-indigo-900 leading-relaxed">{summary}</div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Target Demo", value: scheme.beneficiaries },
                            { label: "Sector", value: scheme.category },
                            { label: "Status", value: scheme.deadline ? `Due ${formatDate(scheme.deadline)}` : "Active" },
                            { label: "Action", value: "Official Portal →", href: scheme.applicationUrl },
                        ].map((d) => (
                            <div key={d.label} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{d.label}</div>
                                {d.href ? (
                                    <a href={d.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">{d.value}</a>
                                ) : (
                                    <div className="text-sm font-medium text-slate-800 line-clamp-1">{d.value}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Full description */}
                    <div>
                        <div className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Detailed Overview</div>
                        <div className="text-sm leading-relaxed text-slate-600">{scheme.description}</div>
                    </div>

                    {/* Chatbot */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            SIMULATED INTELLIGENCE ASSISTANT
                        </div>
                        <div className="bg-white h-56 overflow-y-auto p-4 space-y-3">
                            {!chatMessages.length && (
                                <div className="text-sm text-slate-400 text-center mt-10">
                                    Ask specific questions about eligibility, documents, or processing times.
                                </div>
                            )}
                            {chatMessages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                                        ? "bg-blue-600 text-white rounded-tr-sm"
                                        : "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-sm"
                                        }`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {loadingChat && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 border border-slate-200 text-slate-500 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm flex gap-1">
                                        <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                                placeholder="Type your query here..."
                                className="flex-1 px-4 py-2 rounded-lg text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <button
                                onClick={sendChat}
                                className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Complaint Form (SmartFix Style) ─────────────────────────────────────────
function ComplaintForm() {
    const CATEGORIES = [
        "Select a category", "Infrastructure", "Healthcare", "Education",
        "Police/Safety", "Environment", "Water/Sanitation", "Agriculture",
        "Housing", "Transport", "Electricity", "Corruption/Fraud", "Other",
    ];

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [location, setLocation] = useState("");
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [description, setDescription] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visionLoading, setVisionLoading] = useState(false);
    const [visionResult, setVisionResult] = useState<{ ok: boolean; message: React.ReactNode } | null>(null);
    // Multilingual input
    const [nativeText, setNativeText] = useState("");
    const [nativeLang, setNativeLang] = useState("");
    const [nativeTranslating, setNativeTranslating] = useState(false);
    const [result, setResult] = useState<{
        success?: boolean; warning?: boolean; error?: string;
        gravity?: string; refinedText?: string; message?: string; strikes?: number;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const gravityColors: Record<string, string> = {
        Critical: "text-red-600 bg-red-50 border-red-200",
        High: "text-orange-600 bg-orange-50 border-orange-200",
        Medium: "text-amber-600 bg-amber-50 border-amber-200",
        Low: "text-green-600 bg-green-50 border-green-200",
    };

    function processFile(file: File) {
        setImage(file);
        setVisionResult(null);
        const reader = new FileReader();
        reader.onload = () => {
            setImagePreview(reader.result as string);
            // Run Vision API pre-check after preview loads
            runVisionCheck(reader.result as string, file);
        };
        reader.readAsDataURL(file);
    }

    function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) processFile(file);
    }

    async function runVisionCheck(dataUrl: string, file: File) {
        setVisionLoading(true);
        try {
            const base64 = dataUrl.split(",")[1];
            const res = await fetch("/api/ai-complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "vision-check",
                    imageBase64: base64,
                    mimeType: file.type,
                    context: title || "civic grievance",
                }),
            });
            const data = await res.json();
            if (data.isAIGenerated) {
                setVisionResult({ ok: false, message: <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> This image appears AI-generated. Real photos only.</span> });
            } else if (!data.isRelevant) {
                setVisionResult({ ok: false, message: <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> Image doesn't seem related to a civic complaint. Please upload an accurate photo.</span> });
            } else {
                setVisionResult({ ok: true, message: <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 shrink-0" /> Image verified — appears authentic and relevant.</span> });
            }
        } catch {
            setVisionResult({ ok: true, message: "Image check skipped — AI service unavailable." });
        }
        setVisionLoading(false);
    }

    function useGPS() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            setLat(pos.coords.latitude);
            setLng(pos.coords.longitude);
            setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }, () => {
            setLocation("GPS unavailable — please type location");
        });
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!description.trim() || category === CATEGORIES[0]) return;
        if (visionResult && !visionResult.ok) return;
        setLoading(true);
        setResult(null);

        const form = new FormData();
        form.append("text", description);
        form.append("title", title || description.slice(0, 60));
        form.append("department", category);
        form.append("location", location || "India");
        form.append("lat", String(lat ?? 20.5937));
        form.append("lng", String(lng ?? 78.9629));
        form.append("userName", "Aarav Sharma");
        form.append("userEmail", "citizen@india.in");
        if (nativeText.trim()) {
            form.append("originalText", nativeText);
            form.append("originalLanguage", nativeLang || "unknown");
        }
        if (image) form.append("image", image);

        try {
            const res = await fetch("/api/complaints", { method: "POST", body: form });
            const data = await res.json();
            setResult(data);
            if (data.success) {
                setTitle(""); setCategory(CATEGORIES[0]); setLocation("");
                setDescription(""); setImage(null); setImagePreview(null);
                setVisionResult(null);
            }
        } catch {
            setResult({ error: "Network error. Please try again." });
        }
        setLoading(false);
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <h2 className="font-bold text-2xl text-slate-900 mb-1">File a Grievance</h2>
                <p className="text-sm text-slate-500">Upload photo evidence and describe your issue. AI validation is active.</p>
            </div>

            <div className="flex gap-6">
                {/* LEFT — Main form */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
                    {/* Drag & Drop Image Upload */}
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                            isDragging ? "border-blue-500 bg-blue-50" : imagePreview ? "border-blue-300 bg-blue-50/30" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <input ref={fileInputRef} id="img-upload" type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
                        {imagePreview ? (
                            <div className="space-y-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover shadow-sm border border-slate-200" />
                                <button type="button" onClick={(e) => { e.stopPropagation(); setImage(null); setImagePreview(null); setVisionResult(null); }} className="text-xs text-slate-500 hover:text-red-500 transition-colors">Remove image</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                </div>
                                <div className="text-base font-semibold text-slate-700">Drag &amp; Drop to Upload</div>
                                <div className="text-sm text-slate-500">Supported formats: JPG, PNG, GIF (Max 10MB)</div>
                                <button type="button" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">Select Image</button>
                            </div>
                        )}
                    </div>

                    {/* Vision API result badge */}
                    {visionLoading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            Analyzing image with Vision AI...
                        </div>
                    )}
                    {!visionLoading && visionResult && (
                        <div className={`text-sm px-4 py-2 rounded-lg border font-medium ${
                            visionResult.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700"
                        }`}>
                            {visionResult.message}
                        </div>
                    )}

                    {/* Title + Category row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">Title of Issue</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a brief title for the issue"
                                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">Location</label>
                        <div className="flex gap-2">
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Enter location or use GPS"
                                className="flex-1 px-4 py-2.5 rounded-lg text-sm border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={useGPS}
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" strokeLinecap="round"/></svg>
                                Use GPS
                            </button>
                        </div>
                        {lat && lng && <div className="mt-1 text-xs text-green-600 flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS: {lat.toFixed(4)}, {lng.toFixed(4)}</div>}
                    </div>

                    {/* Multilingual Input */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-indigo-500" />
                                <span className="text-xs font-bold text-slate-700">Write in your language</span>
                                <span className="text-[10px] text-slate-400 italic">Hindi, Tamil, Bengali, Urdu...</span>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <textarea
                                value={nativeText}
                                onChange={(e) => setNativeText(e.target.value)}
                                placeholder="Apni baat apni bhasha mein likhein... আপনার সমস্যা বাংলায় লিখুন... உங்கள் புகாரை தமிழில் எழுதுங்கள்..."
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                            <button
                                type="button"
                                disabled={!nativeText.trim() || nativeTranslating}
                                onClick={async () => {
                                    if (!nativeText.trim()) return;
                                    setNativeTranslating(true);
                                    try {
                                        const res = await fetch("/api/ai-complete", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                messages: [{ role: "user", content: `Detect the language of the following text, then translate and rewrite it as a formal English complaint suitable for a government authority. Only return the formal English text, nothing else.\n\nOriginal text:\n"${nativeText}"` }],
                                                system: "You are a professional translator and complaint formalizer for Indian government services. Translate any Indian language or informal text into clear, formal English. Return ONLY the formal English complaint text.",
                                                temperature: 0.3, max_tokens: 400,
                                            }),
                                        });
                                        const data = await res.json();
                                        if (data.content) {
                                            setDescription(data.content.trim());
                                            // Try to detect language
                                            const langDetect = nativeText.match(/[\u0900-\u097F]/) ? "Hindi" : nativeText.match(/[\u0980-\u09FF]/) ? "Bengali" : nativeText.match(/[\u0B80-\u0BFF]/) ? "Tamil" : nativeText.match(/[\u0600-\u06FF]/) ? "Urdu" : nativeText.match(/[\u0C00-\u0C7F]/) ? "Telugu" : nativeText.match(/[\u0A80-\u0AFF]/) ? "Gujarati" : "Regional language";
                                            setNativeLang(langDetect);
                                        }
                                    } catch { /* ignore */ }
                                    setNativeTranslating(false);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {nativeTranslating ? (
                                    <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />Translating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> Translate &amp; Format to English</>
                                )}
                            </button>
                            {description && nativeText && (
                                <div className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Translated to English — see Description below. Original ({nativeLang || "regional"}) preserved.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">Description <span className="font-normal normal-case text-slate-400">(Optional)</span></label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide additional details about the issue"
                            rows={4}
                            required
                            className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                        />
                    </div>

                    {/* Submit result */}
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-xl border ${
                                result.success ? "bg-green-50 border-green-200" :
                                result.warning ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"
                            }`}
                        >
                            {result.success && (
                                <div className="space-y-3">
                                    <div className="font-bold text-sm text-green-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Grievance Logged Successfully</div>
                                    {/* AI Priority Segregation */}
                                    <div className="bg-white border border-green-200 rounded-lg p-3 space-y-2">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> AI Priority Assessment</div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex shrink-0 ${gravityColors[result.gravity ?? "Low"]}`}>
                                                {result.gravity ?? "Low"} Severity
                                            </span>
                                            <span className="text-xs text-slate-600 leading-snug flex items-center gap-1.5">
                                                {result.gravity === "Critical" ? <><AlertOctagon className="w-3.5 h-3.5 shrink-0 text-red-500"/> EMERGENCY — Escalated to District Collector</> :
                                                 result.gravity === "High" ? <><Siren className="w-3.5 h-3.5 shrink-0 text-orange-500"/> Routed to Senior Authority — Immediate action</> :
                                                 result.gravity === "Medium" ? <><ClipboardList className="w-3.5 h-3.5 shrink-0 text-amber-500"/> Routed to Department Head — Standard processing (3–5 days)</> :
                                                 <><Pin className="w-3.5 h-3.5 shrink-0 text-blue-500"/> Added to normal queue — Resolution within 7–14 days</>}
                                            </span>
                                        </div>
                                    </div>
                                    {result.refinedText && <div className="text-xs text-green-800 p-3 bg-green-100/50 rounded-lg">{result.refinedText}</div>}
                                </div>
                            )}
                            {result.warning && <div className="font-bold text-sm text-orange-800 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {result.message} (Strikes: {result.strikes}/3)</div>}
                            {result.error && <div className="font-bold text-sm text-red-700 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> {result.error === "BANNED" ? "Account suspended." : result.error}</div>}
                        </motion.div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="button"
                        onClick={submit as unknown as () => void}
                        disabled={loading || !description.trim() || category === CATEGORIES[0] || (visionResult !== null && !visionResult.ok)}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                            loading || !description.trim() || category === CATEGORIES[0] || (visionResult !== null && !visionResult.ok)
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                        }`}
                    >
                        {loading ? (
                            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Analyzing...</>
                        ) : (
                            <><CloudUpload className="w-4 h-4" /> Upload &amp; Analyze with AI</>
                        )}
                    </button>
                </div>

                {/* RIGHT — Quick Updates sidebar */}
                <div className="w-72 shrink-0 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span className="font-bold text-sm text-slate-900">Quick Updates</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {[
                                { icon: <Leaf className="w-4 h-4" />, title: "New Scheme Launched", desc: "Green Energy Initiative for homeowners with solar panel subsidies up to 40%.", time: "2 hours ago", color: "text-green-600" },
                                { icon: <Search className="w-4 h-4" />, title: "Issue Under Review", desc: "Your reported pothole issue is currently being reviewed by authorities.", time: "1 day ago", color: "text-blue-600" },
                                { icon: <Wrench className="w-4 h-4" />, title: "Maintenance Alert", desc: "Scheduled water supply interruption in your area tomorrow from 9 AM to 3 PM.", time: "2 days ago", color: "text-orange-600" },
                            ].map((item, i) => (
                                <div key={i} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                    <div className={`font-bold text-sm ${item.color} flex items-center gap-2 mb-1`}>
                                        {item.icon}{item.title}
                                    </div>
                                    <div className="text-xs text-slate-600 leading-relaxed mb-1.5">{item.desc}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>
                                        {item.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weather widget */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-5 text-white shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold">Weather</span>
                            <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                        </div>
                        <div className="text-4xl font-black mb-1">28°C</div>
                        <div className="text-sm opacity-90 mb-4">Mostly Sunny</div>
                        <div className="grid grid-cols-2 gap-2 text-xs opacity-80">
                            <div className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Humidity: 65%</div>
                            <div className="flex items-center gap-1"><Wind className="w-3 h-3" /> Wind: 12 km/h</div>
                            <div className="flex items-center gap-1"><Eye className="w-3 h-3" /> Visibility: 10 km</div>
                            <div className="flex items-center gap-1"><Sun className="w-3 h-3" /> UV: 6 (High)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Complaint Stats ────────────────────────────────────────────────────────
interface StatsData {
    total: number; filed: number; underReview: number; resolved: number;
    byDepartment: Record<string, number>; byGravity: Record<string, number>;
    locations: { id: string; title: string; lat: number; lng: number; location: string; priority: "High" | "Medium" | "Low"; department: string; status: string; timestamp: string; }[];
}
function ComplaintStats() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [useSatellite, setUseSatellite] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/complaints");
                const data = await res.json();
                setStats(data);
            } catch {
                setStats(null);
            }
            setLoading(false);
        })();
    }, []);

    const PIE_COLORS = ["#2563EB", "#0ea5e9", "#f59e0b", "#10b981", "#6366f1"];
    const GRAVITY_COLORS: Record<string, string> = {
        Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#22c55e",
    };

    if (loading) return <div className="p-6"><div className="animate-pulse bg-slate-200 h-64 rounded-xl" /></div>;
    if (!stats) return <div className="p-6 text-center text-slate-500">Unable to load macro-statistics.</div>;

    const statusData = [
        { name: "Filed", value: stats.filed, color: "#3b82f6" },
        { name: "Under Review", value: stats.underReview, color: "#f59e0b" },
        { name: "Resolved", value: stats.resolved, color: "#10b981" },
    ];

    const deptData = Object.entries(stats.byDepartment).map(([name, value]) => ({ name, value }));
    const gravityData = Object.entries(stats.byGravity).map(([name, value]) => ({
        name,
        value,
        color: GRAVITY_COLORS[name] ?? "#3b82f6",
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-2xl text-slate-900 mb-1">Systemic Overview</h2>
                    <p className="text-sm text-slate-500">Real-time aggregate of civil grievances.</p>
                </div>
                <button className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded-md hover:bg-slate-50 flex items-center gap-1 text-slate-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Reports", value: stats.total, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", icon: <ClipboardList className="w-6 h-6 text-blue-600" /> },
                    { label: "In Process", value: stats.underReview, color: "text-amber-600", bg: "bg-amber-50 border-amber-100", icon: <Hourglass className="w-6 h-6 text-amber-600" /> },
                    { label: "Resolved", value: stats.resolved, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" /> },
                    { label: "Critical Risk", value: stats.byGravity["Critical"] || 0, color: "text-rose-600", bg: "bg-rose-50 border-rose-100", icon: <AlertTriangle className="w-6 h-6 text-rose-600" /> },
                ].map((c) => (
                    <div key={c.label} className={`bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex items-center gap-4 relative overflow-hidden`}>
                        <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center text-xl flex-shrink-0`}>{c.icon}</div>
                        <div>
                            <div className="text-sm font-semibold text-slate-500 mb-0.5">{c.label}</div>
                            <div className={`text-3xl font-black tracking-tight ${c.color}`}>{c.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* India Grievance Map */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Map className="w-4 h-4 mr-0.5" /> Complaint Location Map — India
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Pins show where complaints were filed · Click for details</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 ml-1" /> Medium
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 ml-1" /> Low
                        </div>
                        <button
                            onClick={() => setUseSatellite(s => !s)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                                useSatellite ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                            {useSatellite ? <><Satellite className="w-3.5 h-3.5" /> Satellite</> : <><Map className="w-3.5 h-3.5" /> Street</>}
                        </button>
                    </div>
                </div>
                <IndiaGrievanceMap complaints={stats.locations ?? []} height={360} useSatellite={useSatellite} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Status Pie */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                    <div className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 border-b border-slate-100 pb-2">Resolution Flow</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" stroke="none">
                                {statusData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#1e293b', fontSize: '13px', fontWeight: 600 }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Gravity Bar */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                    <div className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 border-b border-slate-100 pb-2">Risk Distribution</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={gravityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                {gravityData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Department Bar */}
                {deptData.length > 0 && (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 md:col-span-2">
                        <div className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 border-b border-slate-100 pb-2">Sector Heatmap</div>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} dy={10} angle={-15} textAnchor="end" />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {deptData.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {!stats.total && (
                <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <div className="text-slate-500 font-medium">Data stream empty. No grievances recorded.</div>
                </div>
            )}
        </div>
    );
}

// ─── Twilio interest modal ─────────────────────────────────────────────────
function InterestedModal({
    scheme,
    onClose,
}: {
    scheme: Scheme;
    onClose: () => void;
}) {
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await fetch("/api/twilio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    schemeId: scheme.id,
                    schemeName: scheme.title,
                    deadline: scheme.deadline,
                    userPhone: phone,
                }),
            });
            setDone(true);
        } catch {
            setDone(true);
        }
        setLoading(false);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {!done ? (
                    <>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="font-bold text-lg text-slate-900 mb-1">
                            Set Alert
                        </div>
                        <div className="text-sm font-medium text-slate-600 mb-2">
                            {scheme.title}
                        </div>
                        <div className="text-xs text-slate-500 mb-5 leading-relaxed border-l-2 border-blue-500 pl-3">
                            Our automated system will dispatch a voice alert to this number 3 hours prior to the official deadline.
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    required
                                    className="w-full px-4 py-3 rounded-lg text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-300"
                            >
                                {loading ? "Registering Protocol..." : "Activate Call Alert"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-green-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <div className="font-bold text-lg text-slate-900 mb-1">Alert Confirmed</div>
                        <div className="text-sm text-slate-500 mb-6">
                            Target added to communication queue.
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-2.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                            Acknowledge
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─── My Complaints Tracker ────────────────────────────────────────────────────
function MyComplaintsTracker() {
    const [complaints, setComplaints] = useState<{
        id: string; title: string; priority: string; gravity: string;
        status: string; department: string; location: string; timestamp: string;
        description: string; problemType: string;
    }[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"All" | "Filed" | "Under Review" | "Resolved">("All");

    useEffect(() => {
        fetch("/api/complaints")
            .then(r => r.json())
            .then(d => setComplaints(d.all ?? []))
            .catch(() => setComplaints([]))
            .finally(() => setLoading(false));
    }, []);

    const DEPT_ICONS: Record<string, React.ReactNode> = {
        "Infrastructure": <Building className="w-5 h-5 text-indigo-500" />, "Water/Sanitation": <Droplets className="w-5 h-5 text-blue-500" />, "Electricity": <Zap className="w-5 h-5 text-amber-500" />,
        "Environment": <Leaf className="w-5 h-5 text-green-500" />, "Healthcare": <Activity className="w-5 h-5 text-rose-500" />, "Education": <GraduationCap className="w-5 h-5 text-purple-500" />,
        "Transport": <Bus className="w-5 h-5 text-sky-500" />, "Corruption/Fraud": <ShieldAlert className="w-5 h-5 text-red-600" />,
    };
    const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
        "Filed": { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
        "Under Review": { label: "In Progress", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
        "Resolved": { label: "Resolved", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    };

    function timeAgo(ts: string) {
        const diff = Date.now() - new Date(ts).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days} days ago`;
        return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    }

    const displayed = filter === "All" ? complaints : complaints.filter(c => c.status === filter);

    if (loading) return (
        <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
    );

    if (!complaints.length) return (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-16 text-center">
            <ClipboardList className="w-14 h-14 mx-auto mb-4 text-slate-300" />
            <div className="font-bold text-slate-700 mb-2">No complaints filed yet</div>
            <p className="text-sm text-slate-500">Go to <strong>Upload Issue</strong> to report a grievance.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-xl text-slate-900">Your Recent Complaints</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{complaints.length} total · Real-time status updates</p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export
                </button>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2">
                {(["All", "Filed", "Under Review", "Resolved"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                        {f === "Filed" ? "Pending" : f} {filter !== f && `(${f === "All" ? complaints.length : complaints.filter(c => c.status === f).length})`}
                    </button>
                ))}
            </div>

            {/* Complaint Cards — SmartFix style */}
            <div className="space-y-3">
                {displayed.map((c, i) => {
                    const st = statusConfig[c.status] ?? statusConfig["Filed"];
                    const icon = DEPT_ICONS[c.department] || <ClipboardList className="w-5 h-5" />;
                    return (
                        <motion.div key={c.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shrink-0 group-hover:bg-slate-100 transition-colors">
                                    {icon}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="font-semibold text-slate-900 text-sm leading-tight">{c.title}</div>
                                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                                            {st.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">{c.description}</p>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {timeAgo(c.timestamp)}
                                        </span>
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {c.location.split(",")[0]}
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {c.department}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-400">{c.id}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}


// ─── Citizen Mail Compose ────────────────────────────────────────────────────
function CitizenMailCompose() {
    const SUBJECTS = [
        "Select subject",
        "Road / Infrastructure",
        "Water & Sanitation",
        "Electricity",
        "Healthcare",
        "Education",
        "Public Safety",
        "Government Scheme Query",
        "Corruption / Fraud",
        "Other",
    ];

    const [subject, setSubject] = useState(SUBJECTS[0]);
    const [nativeText, setNativeText] = useState("");
    const [nativeLang, setNativeLang] = useState("");
    const [translatedText, setTranslatedText] = useState("");
    const [translating, setTranslating] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authUser, setAuthUser] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setAuthUser({
                    name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Citizen",
                    email: data.user.email || "",
                });
            }
        });
    }, []);

    async function translate() {
        if (!nativeText.trim()) return;
        setTranslating(true);
        try {
            const res = await fetch("/api/ai-complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: `Detect the language of the following text, then translate and rewrite it as a formal English letter suitable for a government authority. The citizen's name is ${authUser?.name || "Citizen"}. Please sign off the letter using this exact name instead of placeholders like [Your Name]. Return ONLY the formal English text.\n\nOriginal:\n"${nativeText}"` }],
                    system: "You are a professional translator for Indian government services. Translate any Indian language text into clear, formal English. Return ONLY the formal English text.",
                    temperature: 0.3,
                    max_tokens: 500,
                }),
            });
            const data = await res.json();
            if (data.content) {
                let finalContent = data.content.trim();
                const uName = authUser?.name || "Citizen";
                finalContent = finalContent.replace(/\[Your Name\]/gi, uName)
                                         .replace(/\[Name\]/gi, uName)
                                         .replace(/\[Applicant's Name\]/gi, uName);
                setTranslatedText(finalContent);
                const lang = nativeText.match(/[\u0900-\u097F]/) ? "Hindi"
                    : nativeText.match(/[\u0980-\u09FF]/) ? "Bengali"
                    : nativeText.match(/[\u0B80-\u0BFF]/) ? "Tamil"
                    : nativeText.match(/[\u0600-\u06FF]/) ? "Urdu"
                    : nativeText.match(/[\u0C00-\u0C7F]/) ? "Telugu"
                    : nativeText.match(/[\u0A80-\u0AFF]/) ? "Gujarati"
                    : "Regional language";
                setNativeLang(lang);
            }
        } catch { /* ignore */ }
        setTranslating(false);
    }

    async function sendMail() {
        const body = translatedText || nativeText;
        if (!body.trim() || subject === SUBJECTS[0]) return;
        setSending(true);
        setError(null);
        const form = new FormData();
        form.append("text", body);
        form.append("title", subject);
        form.append("department", subject);
        form.append("location", "India");
        form.append("lat", "20.5937");
        form.append("lng", "78.9629");
        form.append("userName", authUser?.name || "Citizen");
        form.append("userEmail", authUser?.email || "");
        form.append("grantAIAccess", "true");
        if (nativeText.trim() && translatedText) {
            form.append("originalText", nativeText);
            form.append("originalLanguage", nativeLang || "Regional language");
        }
        try {
            await fetch("/api/complaints", { method: "POST", body: form });
            setSent(true);
            setNativeText(""); setTranslatedText(""); setSubject(SUBJECTS[0]);
        } catch {
            setError("Network error. Please try again.");
        }
        setSending(false);
    }

    const urgencyConfig = {
        Normal: { bg: "bg-slate-50 border-slate-200 text-slate-600", active: "bg-slate-900 border-slate-900 text-white" },
        High: { bg: "bg-orange-50 border-orange-200 text-orange-700", active: "bg-orange-500 border-orange-500 text-white" },
        Critical: { bg: "bg-red-50 border-red-200 text-red-700", active: "bg-red-600 border-red-600 text-white" },
    };

    if (sent) return (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-14 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 text-green-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="font-bold text-2xl text-slate-900 mb-2">Mail Sent Successfully</div>
                <p className="text-slate-500 text-sm mb-6">Your message has been delivered to the concerned authority. You will be notified on updates.</p>
                <button onClick={() => setSent(false)} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                    Send Another
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6">
                <h2 className="font-bold text-2xl text-slate-900 mb-1">Send a Mail to Authority</h2>
                <p className="text-sm text-slate-500">Write in your own language — AI will translate and format your message for official use.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Compose Toolbar */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        New Mail — Citizen Portal
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Encrypted · Official Channel
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* To / Subject row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">To</label>
                            <div className="px-4 py-2.5 rounded-lg text-sm border border-slate-200 bg-slate-50 text-slate-500 flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                Government Authority — Auto-routed
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Subject / Category</label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>


                    {/* Urgency is determined automatically by AI — no selector shown */}

                    {/* Multilingual Input */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-indigo-600" />
                            <span className="text-xs font-bold text-slate-800">Write in Your Language</span>
                            <span className="text-[10px] text-slate-500 italic">Hindi • Bengali • Tamil • Urdu • Telugu • Gujarati • Marathi...</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <textarea
                                value={nativeText}
                                onChange={(e) => setNativeText(e.target.value)}
                                placeholder={"Apni baat yahan likhein... আপনার কথা বাংলায় লিখুন... உங்கள் புகாரை தமிழில் எழுதுங்கள்..."}
                                rows={5}
                                className="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                            />
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    disabled={!nativeText.trim() || translating}
                                    onClick={translate}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    {translating ? (
                                        <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Translating...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4" /> Translate &amp; Formalise</>
                                    )}
                                </button>
                                {translatedText && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        Translated from {nativeLang}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Translated English preview */}
                    {translatedText && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-blue-200 rounded-xl overflow-hidden"
                        >
                            <div className="bg-blue-50 px-5 py-3 border-b border-blue-200 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    AI-Formalised English (What Authority Will Receive)
                                </div>
                                <button onClick={() => setTranslatedText("")} className="text-blue-400 hover:text-blue-600 text-xs">Clear</button>
                            </div>
                            <div className="p-4">
                                <textarea
                                    value={translatedText}
                                    onChange={(e) => setTranslatedText(e.target.value)}
                                    rows={5}
                                    className="w-full text-sm text-slate-800 leading-relaxed bg-transparent outline-none resize-none"
                                />
                            </div>
                        </motion.div>
                    )}


                    {/* AI processes all mails automatically — no toggle needed */}

                    {error && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{error}</div>
                    )}

                    <button
                        disabled={sending || (!nativeText.trim() && !translatedText.trim()) || subject === SUBJECTS[0]}
                        onClick={sendMail}
                        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending...</>
                        ) : (
                            <><Mail className="w-4 h-4" /> Send Mail to Authority</>
                        )}
                    </button>
                </div>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-sm text-amber-800">
                    <strong>How it works:</strong> Your message (in any language) will be translated to formal English by AI and sent securely to the relevant government authority. Your original message is preserved for reference.
                </div>
            </div>
        </div>
    );
}

// ─── Main Citizen Dashboard ────────────────────────────────────────────────
const SCHEME_DOMAINS: SchemeDomain[] = ["All", "Tracking"];
const DOMAIN_KEYWORDS: Record<SchemeDomain, string> = {
    All: "india citizen welfare education health digital",
    Tracking: "india citizen welfare education health digital",
};

export default function CitizenDashboard() {
    const [activeTab, setActiveTab] = useState<"overview" | "schemes" | "complaint" | "stats" | "mycomplaints" | "mail">("overview");
    const [schemeDomain, setSchemeDomain] = useState<SchemeDomain>("All");
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [trackedSchemes, setTrackedSchemes] = useState<Scheme[]>([]);
    const [schemesLoading, setSchemesLoading] = useState(false);
    const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
    const [interestedScheme, setInterestedScheme] = useState<Scheme | null>(null);
    const [authUser, setAuthUser] = useState<{ name: string; email: string; initials: string } | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                const name = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Citizen";
                const parts = name.trim().split(" ");
                const initials = parts.length >= 2
                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                    : name.slice(0, 2).toUpperCase();
                setAuthUser({ name, email: data.user.email || "", initials });
            }
        });
    }, []);

    const displayName = authUser?.name || "Citizen";
    const displayInitials = authUser?.initials || "CI";
    const firstName = displayName.split(" ")[0];

    useEffect(() => {
        if (activeTab !== "schemes" || schemeDomain === "Tracking") return;
        setSchemesLoading(true);
        fetch(`/api/schemes?keyword=${encodeURIComponent(DOMAIN_KEYWORDS[schemeDomain])}`)
            .then((r) => r.json())
            .then((d) => setSchemes(d.schemes ?? []))
            .catch(() => setSchemes([]))
            .finally(() => setSchemesLoading(false));
    }, [activeTab, schemeDomain]);

    const displayedSchemes = schemeDomain === "Tracking" ? trackedSchemes : schemes;

    const navItems = [
        { id: "overview", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>, label: "Intelligence Overview" },
        { id: "schemes", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>, label: "Policy & Schemes" },
        { id: "complaint", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>, label: "Upload Issue" },
        { id: "mycomplaints", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>, label: "Recent Complaints" },
        { id: "stats", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>, label: "Macro Statistics" },
        { id: "mail", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, label: "Send Mail" },
    ] as const;

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
            {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
            <aside className="flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm z-20 shrink-0">
                <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
                    <div>
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                            alt="State Emblem of India"
                            style={{ width: "24px", height: "auto", objectFit: "contain" }}
                        />
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 leading-tight">Bharat Intelligence</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">CITIZEN PORTAL</div>
                    </div>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1">
                    <div className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">MODULES</div>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.id
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <span className={`${activeTab === item.id ? "text-blue-600" : "text-slate-400"}`}>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white border border-blue-700">
                        {displayInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{displayName}</div>
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Verified ID
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── MAIN ────────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                {/* Global Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h1 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            {navItems.find((n) => n.id === activeTab)?.label}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            API Connected
                        </div>
                        <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Global Feed Active
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {/* ── OVERVIEW ──────────────────────────────────────────────── */}
                    {activeTab === "overview" && (
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>
                                <h2 className="font-bold text-3xl mb-3 text-slate-900 relative z-10 flex items-center gap-2">
                                    Welcome, {firstName} <Globe className="w-6 h-6 text-blue-500" />
                                </h2>
                                <p className="text-slate-600 text-base max-w-2xl relative z-10">
                                    Your secure gateway to centralized government schemes, grievance redressal, and real-time governance transparency.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-5">
                                {navItems.filter((n) => n.id !== "overview").map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => setActiveTab(n.id)}
                                        className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 text-left hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between h-36"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                            {n.icon}
                                        </div>
                                        <div className="font-bold text-slate-900 text-lg flex items-center justify-between">
                                            {n.label}
                                            <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
                                <div className="mt-0.5 text-amber-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-1">Notice: Anti-Fraud Mechanisms Active</div>
                                    <div className="text-sm text-amber-700 leading-relaxed">
                                        All grievances routed through this portal are parsed by AI models for gravity scoring. Submitting synthetic (AI-generated) image evidence will result in immediate account strikes.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SCHEMES ───────────────────────────────────────────────── */}
                    {activeTab === "schemes" && (
                        <div className="max-w-6xl mx-auto">
                            {/* Domain sub-tabs */}
                            <div className="flex gap-2 flex-wrap mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-fit">
                                {SCHEME_DOMAINS.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setSchemeDomain(d)}
                                        className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${schemeDomain === d
                                            ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200"
                                            : "text-slate-600 hover:bg-slate-50 border border-transparent"
                                            }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>

                            {schemesLoading && (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="animate-pulse bg-slate-200 h-40 rounded-xl" />)}
                                </div>
                            )}

                            {!schemesLoading && displayedSchemes.length > 0 && (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {displayedSchemes.map((s) => (
                                        <SchemeCard
                                            key={s.id}
                                            scheme={s}
                                            onCardClick={setSelectedScheme}
                                            onInterested={(scheme) => {
                                                setTrackedSchemes(prev => prev.find(p => p.id === scheme.id) ? prev : [...prev, scheme]);
                                                setInterestedScheme(scheme);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {!schemesLoading && !displayedSchemes.length && (
                                <div className="bg-white border border-slate-200 border-dashed rounded-xl p-16 text-center max-w-2xl mx-auto">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        {schemeDomain === "Tracking" ? (
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                        ) : (
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        )}
                                    </div>
                                    <div className="text-lg font-bold text-slate-900 mb-2">
                                        {schemeDomain === "Tracking" ? "No Tracked Schemes" : "No Active Policies Found"}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {schemeDomain === "Tracking"
                                            ? "Click \"+ Track\" on any scheme in the All tab to track it here."
                                            : "There are currently no matching schemes. Select a different category or wait for a database update."}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── COMPLAINT ─────────────────────────────────────────────── */}
                    {activeTab === "complaint" && (
                        <div className="max-w-6xl mx-auto">
                            <ComplaintForm />
                        </div>
                    )}

                    {/* ── MY COMPLAINTS ─────────────────────────────────────────── */}
                    {activeTab === "mycomplaints" && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div>
                                <h2 className="font-bold text-2xl text-slate-900 mb-1">My Reported Issues</h2>
                                <p className="text-sm text-slate-500">Track the status of all grievances you have submitted. AI assigns priority before routing to authority.</p>
                            </div>
                            <MyComplaintsTracker />
                        </div>
                    )}

                    {/* ── STATS ─────────────────────────────────────────────────── */}
                    {activeTab === "stats" && (
                        <div className="max-w-6xl mx-auto">
                            <ComplaintStats />
                        </div>
                    )}

                    {/* ── MAIL ──────────────────────────────────────────────────── */}
                    {activeTab === "mail" && (
                        <div className="max-w-6xl mx-auto">
                            <CitizenMailCompose />
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {selectedScheme && (
                    <SchemeModal scheme={selectedScheme} onClose={() => setSelectedScheme(null)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {interestedScheme && (
                    <InterestedModal scheme={interestedScheme} onClose={() => setInterestedScheme(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}