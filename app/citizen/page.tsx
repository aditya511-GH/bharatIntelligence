"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
    LineChart, Line,
} from "recharts";
import { truncate, formatDate } from "@/lib/utils";

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

type SchemeDomain = "All" | "Geopolitics" | "Economics" | "Defense" | "Technology" | "Climate" | "Society";

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
            whileHover={{ scale: 1.015 }}
            onClick={() => onCardClick(scheme)}
            className="glass-card relative p-4 cursor-pointer transition-all hover:glow-teal"
            style={{ border: "1px solid rgba(77,182,172,0.2)" }}
        >
            {/* Interested button */}
            <button
                onClick={handleInterested}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold transition-all z-10"
                style={{
                    background: interested ? "rgba(0,137,123,0.4)" : "rgba(0,137,123,0.15)",
                    border: `1px solid ${interested ? "#4DB6AC" : "rgba(77,182,172,0.3)"}`,
                    color: interested ? "#4DB6AC" : "#80CBC4",
                }}
            >
                {interested ? "✓ Interested" : "+ Interested"}
            </button>

            <div className="pr-24">
                <div
                    className="font-semibold text-sm mb-1 leading-tight"
                    style={{ color: "#E0F7FA" }}
                >
                    {truncate(scheme.title, 60)}
                </div>
                <div className="text-xs mb-2" style={{ color: "#4DB6AC" }}>
                    {scheme.ministry}
                </div>
                <div className="text-xs leading-relaxed mb-3" style={{ color: "#90CAF9" }}>
                    {truncate(scheme.description, 100)}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                        {scheme.tags.slice(0, 2).map((t) => (
                            <span
                                key={t}
                                className="px-2 py-0.5 rounded-full text-xs"
                                style={{ background: "rgba(66,165,245,0.1)", color: "#42A5F5" }}
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                    {scheme.deadline && (
                        <div className="text-xs" style={{ color: "#546E7A" }}>
                            Deadline: {formatDate(scheme.deadline)}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(2,11,24,0.85)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                style={{ border: "1px solid rgba(77,182,172,0.3)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="px-6 py-4 border-b flex items-start justify-between"
                    style={{ borderColor: "rgba(77,182,172,0.2)", background: "rgba(0,105,92,0.1)" }}
                >
                    <div>
                        <div className="font-display font-bold text-lg" style={{ color: "#E0F7FA" }}>
                            {scheme.title}
                        </div>
                        <div className="text-sm mt-1" style={{ color: "#4DB6AC" }}>{scheme.ministry}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-xl ml-4"
                        style={{ color: "#546E7A" }}
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* AI Summary */}
                    <div className="p-4 rounded-xl" style={{ background: "rgba(0,137,123,0.1)", border: "1px solid rgba(77,182,172,0.25)" }}>
                        <div className="text-xs font-semibold mb-2" style={{ color: "#4DB6AC" }}>🤖 AI SUMMARY</div>
                        {loadingSummary ? (
                            <div className="skeleton h-5 w-3/4" />
                        ) : (
                            <div className="text-sm font-medium" style={{ color: "#E0F7FA" }}>{summary}</div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                            { label: "Beneficiaries", value: scheme.beneficiaries },
                            { label: "Category", value: scheme.category },
                            { label: "Deadline", value: scheme.deadline ? formatDate(scheme.deadline) : "Open" },
                            { label: "Apply", value: "Visit portal →", href: scheme.applicationUrl },
                        ].map((d) => (
                            <div key={d.label} className="glass-card-dark p-3">
                                <div className="mb-1" style={{ color: "#546E7A" }}>{d.label}</div>
                                {d.href ? (
                                    <a href={d.href} target="_blank" rel="noopener noreferrer" style={{ color: "#42A5F5" }}>{d.value}</a>
                                ) : (
                                    <div style={{ color: "#B0BEC5" }}>{d.value}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Full description */}
                    <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: "#90CAF9" }}>ABOUT THIS SCHEME</div>
                        <div className="text-sm leading-relaxed" style={{ color: "#B0BEC5" }}>{scheme.description}</div>
                    </div>

                    {/* Chatbot */}
                    <div className="border-t pt-4" style={{ borderColor: "rgba(77,182,172,0.2)" }}>
                        <div className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: "#4DB6AC" }}>
                            🤖 Ask about this scheme
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div
                            className="h-48 overflow-y-auto mb-3 space-y-2 p-3 rounded-lg"
                            style={{ background: "rgba(2,11,24,0.5)" }}
                        >
                            {!chatMessages.length && (
                                <div className="text-xs" style={{ color: "#546E7A" }}>
                                    Ask me anything about {scheme.title}…
                                </div>
                            )}
                            {chatMessages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                                        style={{
                                            background: m.role === "user" ? "rgba(0,137,123,0.4)" : "rgba(13,31,60,0.8)",
                                            color: "#E0F7FA",
                                            border: m.role === "assistant" ? "1px solid rgba(77,182,172,0.2)" : "none",
                                        }}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {loadingChat && (
                                <div className="flex justify-start">
                                    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(13,31,60,0.8)", color: "#90CAF9" }}>
                                        Thinking…
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                                placeholder="Ask about eligibility, benefits, how to apply…"
                                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                                style={{
                                    background: "rgba(13,31,60,0.8)",
                                    border: "1px solid rgba(77,182,172,0.2)",
                                    color: "#E0F7FA",
                                }}
                            />
                            <button
                                onClick={sendChat}
                                className="px-4 py-2 rounded-lg text-xs font-semibold"
                                style={{ background: "#00695C", color: "#E0F7FA" }}
                            >
                                Ask
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Complaint Form ─────────────────────────────────────────────────────────
function ComplaintForm() {
    const DEPARTMENTS = [
        "Infrastructure", "Healthcare", "Education", "Police/Safety",
        "Environment", "Water/Sanitation", "Agriculture", "Housing",
        "Transport", "Electricity", "Corruption/Fraud", "Other",
    ];

    const [text, setText] = useState("");
    const [dept, setDept] = useState(DEPARTMENTS[0]);
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success?: boolean;
        warning?: boolean;
        error?: string;
        gravity?: string;
        refinedText?: string;
        message?: string;
        strikes?: number;
    } | null>(null);

    function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!text.trim()) return;
        setLoading(true);
        setResult(null);

        const form = new FormData();
        form.append("text", text);
        form.append("department", dept);
        form.append("userName", "Citizen");
        form.append("userEmail", "citizen@india.in");
        if (image) form.append("image", image);

        try {
            const res = await fetch("/api/complaints", { method: "POST", body: form });
            const data = await res.json();
            setResult(data);
            if (data.success) {
                setText(""); setImage(null); setImagePreview(null);
            }
        } catch {
            setResult({ error: "Network error. Please try again." });
        }
        setLoading(false);
    }

    const gravityColors: Record<string, string> = {
        Critical: "#EF5350", High: "#FFA726", Medium: "#FFEE58", Low: "#66BB6A",
    };

    return (
        <div className="max-w-2xl">
            <h2 className="font-display font-bold text-xl mb-6" style={{ color: "#E0F7FA" }}>
                📋 File a Complaint
            </h2>

            <form onSubmit={submit} className="glass-card p-6 space-y-4">
                {/* Department */}
                <div>
                    <label className="text-xs mb-1.5 block" style={{ color: "#90CAF9" }}>Department</label>
                    <select
                        value={dept}
                        onChange={(e) => setDept(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                        style={{ background: "rgba(13,31,60,0.8)", border: "1px solid rgba(66,165,245,0.3)", color: "#E0F7FA" }}
                    >
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {/* Complaint text */}
                <div>
                    <label className="text-xs mb-1.5 block" style={{ color: "#90CAF9" }}>
                        Describe your complaint <span style={{ color: "#546E7A" }}>(write in your own words)</span>
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Describe the problem clearly — what happened, where, when, who is affected…"
                        rows={5}
                        required
                        className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
                        style={{ background: "rgba(13,31,60,0.8)", border: "1px solid rgba(66,165,245,0.3)", color: "#E0F7FA" }}
                    />
                </div>

                {/* Image upload */}
                <div>
                    <label className="text-xs mb-1.5 block" style={{ color: "#90CAF9" }}>
                        Attach Evidence Image <span style={{ color: "#546E7A" }}>(optional — must be real, not AI-generated)</span>
                    </label>
                    <div
                        className="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                        style={{ borderColor: "rgba(66,165,245,0.3)" }}
                        onClick={() => document.getElementById("img-upload")?.click()}
                    >
                        <input
                            id="img-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImage}
                            className="hidden"
                        />
                        {imagePreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-cover" />
                        ) : (
                            <div>
                                <div className="text-2xl mb-2">📷</div>
                                <div className="text-xs" style={{ color: "#546E7A" }}>Click to upload image evidence</div>
                            </div>
                        )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#EF5350" }}>
                        ⚠️ Fake or AI-generated images will earn a strike. 3 strikes = account ban.
                    </div>
                </div>

                {/* Result */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl"
                        style={{
                            background: result.success ? "rgba(21,128,61,0.15)" : result.warning ? "rgba(234,88,12,0.15)" : "rgba(220,38,38,0.15)",
                            border: `1px solid ${result.success ? "rgba(21,128,61,0.4)" : result.warning ? "rgba(234,88,12,0.5)" : "rgba(220,38,38,0.4)"}`,
                        }}
                    >
                        {result.success && (
                            <>
                                <div className="font-semibold text-sm mb-2" style={{ color: "#86EFAC" }}>
                                    ✅ Complaint submitted successfully
                                </div>
                                <div className="text-xs mb-1" style={{ color: "#90CAF9" }}>
                                    Gravity: <strong style={{ color: gravityColors[result.gravity ?? "Low"] }}>{result.gravity}</strong>
                                </div>
                                <div className="text-xs leading-relaxed" style={{ color: "#B0BEC5" }}>
                                    <strong>AI-Refined:</strong> {result.refinedText}
                                </div>
                            </>
                        )}
                        {result.warning && (
                            <>
                                <div className="font-semibold text-sm mb-1" style={{ color: "#FDBA74" }}>{result.message}</div>
                                <div className="text-xs" style={{ color: "#90CAF9" }}>
                                    Strikes: {result.strikes}/3
                                </div>
                            </>
                        )}
                        {result.error && result.error !== "BANNED" && (
                            <div className="text-sm" style={{ color: "#FCA5A5" }}>{result.error}</div>
                        )}
                        {result.error === "BANNED" && (
                            <div className="font-bold text-sm" style={{ color: "#EF5350" }}>
                                🚫 Account suspended for submitting fake evidence.
                            </div>
                        )}
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                        background: loading ? "rgba(13,71,161,0.3)" : "linear-gradient(135deg, #0D47A1, #00695C)",
                        color: loading ? "#546E7A" : "#E0F7FA",
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "AI is processing your complaint…" : "Submit Complaint →"}
                </button>
            </form>
        </div>
    );
}

// ─── Complaint Stats ────────────────────────────────────────────────────────
function ComplaintStats() {
    const [stats, setStats] = useState<ComplaintStats | null>(null);
    const [loading, setLoading] = useState(true);

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

    const PIE_COLORS = ["#1565C0", "#00897B", "#E65100", "#6A1B9A"];
    const GRAVITY_COLORS: Record<string, string> = {
        Critical: "#EF5350", High: "#FFA726", Medium: "#FFEE58", Low: "#66BB6A",
    };

    if (loading) return <div className="p-6"><div className="skeleton h-64" /></div>;
    if (!stats) return <div className="p-6 text-center" style={{ color: "#546E7A" }}>Unable to load stats.</div>;

    const statusData = [
        { name: "Filed", value: stats.filed, color: "#1565C0" },
        { name: "Under Review", value: stats.underReview, color: "#FFA726" },
        { name: "Resolved", value: stats.resolved, color: "#66BB6A" },
    ];

    const deptData = Object.entries(stats.byDepartment).map(([name, value]) => ({ name, value }));
    const gravityData = Object.entries(stats.byGravity).map(([name, value]) => ({
        name,
        value,
        color: GRAVITY_COLORS[name] ?? "#42A5F5",
    }));

    return (
        <div className="space-y-6">
            <h2 className="font-display font-bold text-xl" style={{ color: "#E0F7FA" }}>
                📊 Complaint Statistics
            </h2>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Filed", value: stats.total, color: "#42A5F5" },
                    { label: "Under Review", value: stats.underReview, color: "#FFA726" },
                    { label: "Resolved", value: stats.resolved, color: "#66BB6A" },
                ].map((c) => (
                    <div key={c.label} className="glass-card p-4 text-center">
                        <div className="text-3xl font-bold font-display mb-1" style={{ color: c.color }}>{c.value}</div>
                        <div className="text-xs" style={{ color: "#90CAF9" }}>{c.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Status Pie */}
                <div className="glass-card p-4">
                    <div className="text-sm font-semibold mb-4" style={{ color: "#90CAF9" }}>Status Distribution</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                                {statusData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: "rgba(13,31,60,0.95)", border: "1px solid rgba(66,165,245,0.3)", borderRadius: 8, color: "#E0F7FA" }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Gravity Bar */}
                <div className="glass-card p-4">
                    <div className="text-sm font-semibold mb-4" style={{ color: "#90CAF9" }}>By Gravity Level</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={gravityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,165,245,0.08)" />
                            <XAxis dataKey="name" tick={{ fill: "#546E7A", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#546E7A", fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: "rgba(13,31,60,0.95)", border: "1px solid rgba(66,165,245,0.3)", borderRadius: 8, color: "#E0F7FA" }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {gravityData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Department Bar */}
                {deptData.length > 0 && (
                    <div className="glass-card p-4 md:col-span-2">
                        <div className="text-sm font-semibold mb-4" style={{ color: "#90CAF9" }}>Complaints by Department</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(66,165,245,0.08)" />
                                <XAxis dataKey="name" tick={{ fill: "#546E7A", fontSize: 10 }} />
                                <YAxis tick={{ fill: "#546E7A", fontSize: 10 }} />
                                <Tooltip contentStyle={{ background: "rgba(13,31,60,0.95)", border: "1px solid rgba(66,165,245,0.3)", borderRadius: 8, color: "#E0F7FA" }} />
                                <Bar dataKey="value" fill="#1565C0" radius={[4, 4, 0, 0]}>
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
                <div className="glass-card p-8 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <div className="text-sm" style={{ color: "#90CAF9" }}>
                        No complaints filed yet. Stats will appear here as citizens file complaints.
                    </div>
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
            setDone(true); // Still close gracefully
        }
        setLoading(false);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(2,11,24,0.85)" }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="glass-card p-6 w-full max-w-sm"
                style={{ border: "1px solid rgba(77,182,172,0.4)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {!done ? (
                    <>
                        <div className="font-display font-bold mb-1" style={{ color: "#E0F7FA" }}>
                            🔔 Get Deadline Reminder
                        </div>
                        <div className="text-xs mb-4" style={{ color: "#90CAF9" }}>
                            {scheme.title}
                        </div>
                        <div className="text-xs mb-4" style={{ color: "#B0BEC5" }}>
                            We&apos;ll call you 3 hours before the deadline via Twilio.
                        </div>
                        <form onSubmit={submit} className="space-y-3">
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+91 98765 43210"
                                required
                                className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                                style={{ background: "rgba(13,31,60,0.8)", border: "1px solid rgba(77,182,172,0.3)", color: "#E0F7FA" }}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg font-semibold text-sm"
                                style={{
                                    background: "linear-gradient(135deg, #00695C, #00897B)",
                                    color: "#E0F7FA",
                                    cursor: loading ? "not-allowed" : "pointer",
                                }}
                            >
                                {loading ? "Scheduling…" : "Schedule Reminder Call"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <div className="text-4xl mb-3">✅</div>
                        <div className="font-semibold" style={{ color: "#86EFAC" }}>Reminder Scheduled!</div>
                        <div className="text-xs mt-2" style={{ color: "#90CAF9" }}>
                            You'll receive a call before the deadline.
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-4 px-6 py-2 rounded-lg text-sm"
                            style={{ background: "rgba(0,137,123,0.3)", color: "#4DB6AC" }}
                        >
                            Close
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// ─── Main Citizen Dashboard ────────────────────────────────────────────────
const SCHEME_DOMAINS: SchemeDomain[] = ["All", "Geopolitics", "Economics", "Defense", "Technology", "Climate", "Society"];
const DOMAIN_KEYWORDS: Record<SchemeDomain, string> = {
    All: "india citizen welfare",
    Geopolitics: "foreign policy ambassador passport",
    Economics: "economic development loan subsidy business",
    Defense: "defense military ex-servicemen veteran",
    Technology: "technology digital startup skill",
    Climate: "environment solar green agriculture",
    Society: "education health women youth rural urban",
};

export default function CitizenDashboard() {
    const [activeTab, setActiveTab] = useState<"overview" | "schemes" | "complaint" | "stats">("overview");
    const [schemeDomain, setSchemeDomain] = useState<SchemeDomain>("All");
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [schemesLoading, setSchemesLoading] = useState(false);
    const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
    const [interestedScheme, setInterestedScheme] = useState<Scheme | null>(null);

    useEffect(() => {
        if (activeTab !== "schemes") return;
        setSchemesLoading(true);
        fetch(`/api/schemes?keyword=${encodeURIComponent(DOMAIN_KEYWORDS[schemeDomain])}`)
            .then((r) => r.json())
            .then((d) => setSchemes(d.schemes ?? []))
            .catch(() => setSchemes([]))
            .finally(() => setSchemesLoading(false));
    }, [activeTab, schemeDomain]);

    const navItems = [
        { id: "overview", icon: "🏠", label: "Overview" },
        { id: "schemes", icon: "📋", label: "Schemes" },
        { id: "complaint", icon: "📝", label: "File Complaint" },
        { id: "stats", icon: "📊", label: "Complaint Stats" },
    ] as const;

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: "#020B18", color: "#E0F7FA" }}>
            {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
            <aside
                className="flex flex-col"
                style={{
                    width: 220,
                    background: "rgba(13,31,60,0.9)",
                    borderRight: "1px solid rgba(77,182,172,0.15)",
                    flexShrink: 0,
                }}
            >
                <div className="px-4 py-5 border-b" style={{ borderColor: "rgba(77,182,172,0.1)" }}>
                    <div className="font-display font-bold text-base" style={{ color: "#4DB6AC" }}>Bharat Intelligence</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: "#546E7A" }}>CITIZEN PORTAL</div>
                </div>

                <nav className="flex-1 py-3">
                    <div className="px-3 mb-2 text-xs font-mono" style={{ color: "#546E7A" }}>NAVIGATION</div>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all"
                            style={{
                                background: activeTab === item.id ? "rgba(0,137,123,0.2)" : "transparent",
                                borderLeft: activeTab === item.id ? "3px solid #4DB6AC" : "3px solid transparent",
                                color: activeTab === item.id ? "#E0F7FA" : "#90CAF9",
                                cursor: "pointer",
                                fontWeight: activeTab === item.id ? 600 : 400,
                            }}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: "rgba(77,182,172,0.1)" }}>
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "rgba(0,105,92,0.4)", color: "#4DB6AC" }}
                    >
                        AS
                    </div>
                    <div>
                        <div className="text-xs font-semibold" style={{ color: "#E0F7FA" }}>Aarav Sharma</div>
                        <div className="text-xs" style={{ color: "#546E7A" }}>Citizen</div>
                    </div>
                </div>
            </aside>

            {/* ── MAIN ────────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <div
                    className="sticky top-0 px-6 py-4 flex items-center justify-between z-10"
                    style={{ background: "rgba(2,11,24,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(77,182,172,0.12)" }}
                >
                    <h1 className="font-display font-bold text-xl" style={{ color: "#E0F7FA" }}>
                        {navItems.find((n) => n.id === activeTab)?.icon}{" "}
                        {navItems.find((n) => n.id === activeTab)?.label}
                    </h1>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "#4DB6AC" }}>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                    </div>
                </div>

                {/* ── OVERVIEW ──────────────────────────────────────────────── */}
                {activeTab === "overview" && (
                    <div className="p-6 space-y-6">
                        <div className="glass-card p-6">
                            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: "#E0F7FA" }}>
                                Namaste, Aarav 🇮🇳
                            </h2>
                            <p className="text-sm" style={{ color: "#90CAF9" }}>
                                Welcome to Bharat Intelligence — your gateway to government schemes, complaint filing, and real-time governance insights.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {navItems.filter((n) => n.id !== "overview").map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => setActiveTab(n.id)}
                                    className="glass-card p-5 text-center hover:glow-teal transition-all cursor-pointer"
                                >
                                    <div className="text-3xl mb-2">{n.icon}</div>
                                    <div className="font-semibold text-sm" style={{ color: "#E0F7FA" }}>{n.label}</div>
                                </button>
                            ))}
                        </div>
                        <div className="glass-card p-5">
                            <div className="text-sm font-semibold mb-3" style={{ color: "#4DB6AC" }}>📢 Important Notice</div>
                            <div className="text-sm" style={{ color: "#B0BEC5" }}>
                                All complaints filed through this portal are AI-triaged, gravity-scored, and routed directly to the relevant government department. Images will be verified for authenticity.
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SCHEMES ───────────────────────────────────────────────── */}
                {activeTab === "schemes" && (
                    <div className="p-6">
                        {/* Domain sub-tabs */}
                        <div className="flex gap-2 flex-wrap mb-5">
                            {SCHEME_DOMAINS.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setSchemeDomain(d)}
                                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                                    style={{
                                        background: schemeDomain === d ? "rgba(0,137,123,0.4)" : "rgba(0,137,123,0.1)",
                                        border: schemeDomain === d ? "1px solid #4DB6AC" : "1px solid rgba(77,182,172,0.2)",
                                        color: schemeDomain === d ? "#E0F7FA" : "#80CBC4",
                                        cursor: "pointer",
                                    }}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>

                        {schemesLoading && (
                            <div className="grid md:grid-cols-2 gap-4">
                                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-36" />)}
                            </div>
                        )}

                        {!schemesLoading && schemes.length > 0 && (
                            <div className="grid md:grid-cols-2 gap-4">
                                {schemes.map((s) => (
                                    <SchemeCard
                                        key={s.id}
                                        scheme={s}
                                        onCardClick={setSelectedScheme}
                                        onInterested={(scheme) => setInterestedScheme(scheme)}
                                    />
                                ))}
                            </div>
                        )}

                        {!schemesLoading && !schemes.length && (
                            <div className="glass-card p-8 text-center">
                                <div className="text-4xl mb-3">📭</div>
                                <div className="text-sm" style={{ color: "#90CAF9" }}>
                                    No schemes found for this category. Try another domain or check back later.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── COMPLAINT ─────────────────────────────────────────────── */}
                {activeTab === "complaint" && (
                    <div className="p-6">
                        <ComplaintForm />
                    </div>
                )}

                {/* ── STATS ─────────────────────────────────────────────────── */}
                {activeTab === "stats" && (
                    <div className="p-6">
                        <ComplaintStats />
                    </div>
                )}
            </main>

            {/* Scheme detail modal */}
            <AnimatePresence>
                {selectedScheme && (
                    <SchemeModal scheme={selectedScheme} onClose={() => setSelectedScheme(null)} />
                )}
            </AnimatePresence>

            {/* Twilio interested modal */}
            <AnimatePresence>
                {interestedScheme && (
                    <InterestedModal scheme={interestedScheme} onClose={() => setInterestedScheme(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
