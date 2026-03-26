"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HardHat, Droplets, Zap, Leaf, Heart, GraduationCap, Bus, Siren, ClipboardList, Inbox, Bot, AlertTriangle as AlertTriangleIcon, CheckCircle2, MailOpen, Star, Send, FileText, Lock, Mail, Sparkles, MapPin, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Mail {
    id: string;
    title: string;
    department: string;
    gravity: string;
    priority: "High" | "Medium" | "Low" | "Critical";
    status: string;
    location: string;
    timestamp: string;
    description: string;
    userName: string;
    userEmail: string;
    originalLanguage?: string;
    originalText?: string;
    problemType: string;
    grantAIAccess?: boolean;
}

type PacketRule = "keyword" | "location" | "department" | "priority";
type MailFilter = "All" | "Read" | "Unread";

interface Packet {
    id: string;
    name: string;
    rule: PacketRule;
    ruleValue: string;
    color: string;
    mailIds: string[];
    summary?: string;
    summaryLoading?: boolean;
    closed?: boolean;
}

const PACKET_COLORS = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F97316", "#EF4444",
    "#EC4899", "#06B6D4", "#84CC16",
];

const DEPT_ICONS: Record<string, React.ReactNode> = {
    "Infrastructure": <HardHat className="w-3.5 h-3.5" />,
    "Water/Sanitation": <Droplets className="w-3.5 h-3.5" />,
    "Electricity": <Zap className="w-3.5 h-3.5" />,
    "Environment": <Leaf className="w-3.5 h-3.5" />,
    "Healthcare": <Heart className="w-3.5 h-3.5" />,
    "Education": <GraduationCap className="w-3.5 h-3.5" />,
    "Transport": <Bus className="w-3.5 h-3.5" />,
    "Corruption/Fraud": <Siren className="w-3.5 h-3.5" />,
    "default": <ClipboardList className="w-3.5 h-3.5" />,
};

function deptIcon(dept: string) {
    return DEPT_ICONS[dept] || DEPT_ICONS["default"];
}

function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function initials(name: string) {
    return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
}

// Deterministic avatar color from name
const AVATAR_COLORS = [
    "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-amber-500",
];
function avatarColor(name: string) {
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[Math.abs(hash)];
}

const PRIORITY_BADGE: Record<string, string> = {
    High: "bg-red-100 text-red-700 border-red-200",
    Critical: "bg-purple-100 text-purple-700 border-purple-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-green-100 text-green-700 border-green-200",
};

// ─── AI helpers ───────────────────────────────────────────────────────────────
async function getAISummary(mails: Mail[], context: string): Promise<string> {
    const mailList = mails.map((m, i) =>
        `${i + 1}. [${m.priority}] ${m.title} — ${m.location}: ${m.description.slice(0, 120)}`
    ).join("\n");

    const res = await fetch("/api/ai-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ role: "user", content: `Provide a concise official summary (3-4 sentences) of these citizen complaints for a government authority. Context: ${context}.\n\nComplaints:\n${mailList}\n\nSummary should be formal, highlight key issues, priority of action, and recommended next steps.` }],
            system: "You are a government complaint analyst. Write formal, concise English summaries for official use.",
            temperature: 0.3,
            max_tokens: 300,
        }),
    });
    const data = await res.json();
    return data.content || "Summary unavailable.";
}

async function getSingleMailSummary(mail: Mail): Promise<string> {
    const res = await fetch("/api/ai-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ role: "user", content: `Provide a concise official analysis (2-3 sentences) of this citizen complaint for a government authority:\n\nTitle: ${mail.title}\nDepartment: ${mail.department}\nLocation: ${mail.location}\nPriority: ${mail.priority}\nDescription: ${mail.description}\n\nProvide: (1) What the issue is, (2) Urgency assessment, (3) Recommended action.` }],
            system: "You are a senior government complaint analyst. Write formal, actionable English briefings for officials. Be very concise.",
            temperature: 0.3,
            max_tokens: 200,
        }),
    });
    const data = await res.json();
    return data.content || "Summary unavailable.";
}

// ─── Create Packet Modal ──────────────────────────────────────────────────────
function CreatePacketModal({
    mails, onSave, onClose,
}: {
    mails: Mail[];
    onSave: (p: Packet) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState("");
    const [rule, setRule] = useState<PacketRule>("keyword");
    const [keywords, setKeywords] = useState("");
    const [colorIdx, setColorIdx] = useState(0);

    const uniqueLocations = [...new Set(mails.map((m) => m.location.split(",")[0].trim()))];
    const uniqueDepts = [...new Set(mails.map((m) => m.department))];

    function getMatchingIds(): string[] {
        const terms = keywords.toLowerCase().split(",").map(t => t.trim()).filter(Boolean);
        if (!terms.length) return mails.map((m) => m.id);
        return mails.filter((m) => {
            const haystack = `${m.title} ${m.description} ${m.problemType} ${m.location} ${m.department} ${m.priority}`.toLowerCase();
            if (rule === "keyword") return terms.some(t => haystack.includes(t));
            if (rule === "location") return terms.some(t => m.location.toLowerCase().includes(t));
            if (rule === "department") return terms.some(t => m.department.toLowerCase().includes(t));
            if (rule === "priority") return terms.some(t => m.priority.toLowerCase() === t);
            return true;
        }).map((m) => m.id);
    }

    const matchCount = getMatchingIds().length;
    const matchedMails = mails.filter(m => getMatchingIds().includes(m.id)).slice(0, 3);

    function save() {
        if (!name.trim()) return;
        const packet: Packet = {
            id: Date.now().toString(),
            name: name.trim(),
            rule,
            ruleValue: keywords.trim(),
            color: PACKET_COLORS[colorIdx],
            mailIds: getMatchingIds(),
        };
        onSave(packet);
        onClose();
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Create Mail Packet</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Group related mails by keyword, location, department, or priority</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
                </div>

                {/* Name */}
                <div className="mb-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Packet Name</label>
                    <input
                        value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. North Delhi Water Issues"
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                    />
                </div>

                {/* Rule type */}
                <div className="mb-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Group By</label>
                    <div className="grid grid-cols-4 gap-2">
                        {(["keyword", "location", "department", "priority"] as PacketRule[]).map((r) => (
                            <button key={r} onClick={() => { setRule(r); setKeywords(""); }}
                                className={`py-2 rounded-lg text-xs font-semibold border capitalize transition-all ${rule === r ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                                {r === "keyword" ? "Keyword" : r === "location" ? "Location" : r === "department" ? "Dept" : "Priority"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Keyword / value input */}
                <div className="mb-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">
                        Filter Value <span className="font-normal normal-case text-slate-400">(comma-separated for multiple)</span>
                    </label>
                    {rule === "location" ? (
                        <select value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
                            <option value="">All locations</option>
                            {uniqueLocations.map((l) => <option key={l} value={l.toLowerCase()}>{l}</option>)}
                        </select>
                    ) : rule === "department" ? (
                        <select value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
                            <option value="">All departments</option>
                            {uniqueDepts.map((d) => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                        </select>
                    ) : rule === "priority" ? (
                        <select value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50">
                            <option value="">All priorities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    ) : (
                        <input
                            value={keywords} onChange={(e) => setKeywords(e.target.value)}
                            placeholder="e.g. schemes, north, water, pothole..."
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                        />
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                        Matching: <span className="font-semibold text-blue-600">{matchCount} mail{matchCount !== 1 ? "s" : ""}</span>
                    </p>
                    {/* Live preview */}
                    {matchedMails.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {matchedMails.map(m => (
                                <div key={m.id} className="text-xs text-slate-600 flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span>{deptIcon(m.department)}</span>
                                    <span className="truncate">{m.title}</span>
                                    <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRIORITY_BADGE[m.priority] || PRIORITY_BADGE.Low}`}>{m.priority}</span>
                                </div>
                            ))}
                            {matchCount > 3 && <div className="text-[10px] text-slate-400 text-center">+{matchCount - 3} more</div>}
                        </div>
                    )}
                </div>

                {/* Color */}
                <div className="mb-5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Packet Color</label>
                    <div className="flex gap-2">
                        {PACKET_COLORS.map((c, i) => (
                            <button key={c} onClick={() => setColorIdx(i)}
                                className="w-7 h-7 rounded-full transition-all border-2"
                                style={{ background: c, borderColor: i === colorIdx ? "#0f172a" : "transparent", transform: i === colorIdx ? "scale(1.25)" : "scale(1)" }}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button
                        onClick={save}
                        disabled={!name.trim() || matchCount === 0}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Create ({matchCount})
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Mail Detail Panel ────────────────────────────────────────────────────────
function MailDetail({
    mail,
    onClose,
    onCloseIssue,
}: {
    mail: Mail | null;
    onClose: () => void;
    onCloseIssue: (id: string) => void;
}) {
    const [summary, setSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [closedLocal, setClosedLocal] = useState(false);

    // Auto-generate summary when mail changes
    useEffect(() => {
        setSummary(null);
        setClosedLocal(false);
        if (!mail) return;
        setSummaryLoading(true);
        getSingleMailSummary(mail).then(s => {
            setSummary(s);
            setSummaryLoading(false);
        });
    }, [mail?.id]);

    if (!mail) return (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center text-slate-400">
                <div className="flex justify-center mb-3"><Inbox className="w-12 h-12 text-slate-300" /></div>
                <div className="text-sm font-medium">Select a mail to read</div>
                <div className="text-xs text-slate-300 mt-1">AI summary will auto-generate</div>
            </div>
        </div>
    );

    const pc = PRIORITY_BADGE[mail.priority] || PRIORITY_BADGE["Low"];
    const isClosed = closedLocal || mail.status === "Resolved";
    const aiGranted = mail.grantAIAccess !== false; // default true

    const currentMail = mail; // narrowed: mail is non-null here (null case returned above)

    function handleCloseIssue() {
        setClosedLocal(true);
        onCloseIssue(currentMail.id);
    }

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Action toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-1 flex-wrap">
                {[
                    { label: "Reply", icon: "↩" },
                    { label: "Forward", icon: "↪" },
                    { label: "Delete", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> },
                ].map(a => (
                    <button key={a.label}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                        <span className="text-base">{a.icon}</span>
                        <span className="text-xs">{a.label}</span>
                    </button>
                ))}
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <button
                    onClick={handleCloseIssue}
                    disabled={isClosed}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isClosed
                            ? "bg-green-50 border-green-200 text-green-700 cursor-default"
                            : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                    }`}
                >
                    {isClosed ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Issue Closed</> : <><Lock className="w-3.5 h-3.5" /> Close Issue</>}
                </button>
                <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700 text-xl leading-none px-2">×</button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
                {/* Mail header */}
                <div className="px-6 py-5 border-b border-slate-100">
                    <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold ${avatarColor(mail.userName)}`}>
                            {initials(mail.userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-bold text-slate-900 text-base leading-tight">{mail.userName}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        To: <span className="font-medium text-slate-700">Government Authority</span>
                                        <span className="mx-1">·</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {mail.location}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 shrink-0">{timeAgo(mail.timestamp)}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${pc}`}>{mail.priority} Priority</span>
                                <span className="text-[10px] text-slate-500 border border-slate-200 rounded px-2 py-0.5">{mail.department}</span>
                                {mail.gravity && <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-0.5 font-semibold">AI: {mail.gravity}</span>}
                                {isClosed && <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 font-semibold"><CheckCircle2 className="w-3 h-3" /> Resolved</span>}
                            </div>
                            <h2 className="font-bold text-slate-900 text-sm mt-2 leading-tight">{mail.title}</h2>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* AI Permission banner */}
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                        aiGranted
                            ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}>
                        {aiGranted
                            ? <><Bot className="w-3.5 h-3.5" /> <span>AI Access Granted — AI can read, organise and group this mail</span></>
                            : <><AlertTriangleIcon className="w-3.5 h-3.5" /> <span>No AI Access — Citizen has not granted permission for AI processing</span></>
                        }
                    </div>

                    {/* AI Summary — auto-loaded */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Analysis</div>
                            {summaryLoading && <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin ml-1" />}
                        </div>
                        {summaryLoading ? (
                            <div className="space-y-2 animate-pulse">
                                <div className="h-2.5 bg-blue-200 rounded w-4/5" />
                                <div className="h-2.5 bg-blue-200 rounded w-3/4" />
                                <div className="h-2.5 bg-blue-200 rounded w-2/3" />
                            </div>
                        ) : summary ? (
                            <div className="text-sm text-blue-900 leading-relaxed">{summary}</div>
                        ) : (
                            <div className="text-xs text-blue-400">Processing...</div>
                        )}
                    </div>

                    {/* Official body */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Official Complaint (AI-Formalised)</div>
                        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-800 leading-relaxed border border-slate-100">
                            {mail.description}
                        </div>
                    </div>

                    {/* Original language */}
                    {mail.originalText && mail.originalText !== mail.description && (
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                Original Submission
                                {mail.originalLanguage && (
                                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold normal-case">{mail.originalLanguage}</span>
                                )}
                            </div>
                            <div className="bg-amber-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-amber-100 italic">
                                &quot;{mail.originalText}&quot;
                            </div>
                        </div>
                    )}

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            ["Problem Type", mail.problemType || mail.department],
                            ["Department", mail.department],
                            ["Location", mail.location],
                            ["Status", isClosed ? "Resolved" : mail.status],
                            ["Complaint ID", mail.id],
                            ["Filed By", mail.userName],
                        ].map(([label, value]) => (
                            <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                                <div className="text-sm font-semibold text-slate-800 truncate">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Mail Card ────────────────────────────────────────────────────────────────
function MailCard({
    mail, selected, onClick, packets, readSet,
}: {
    mail: Mail;
    selected: boolean;
    onClick: () => void;
    packets: Packet[];
    readSet: Set<string>;
}) {
    const isRead = readSet.has(mail.id);
    const belongsTo = packets.filter((p) => p.mailIds.includes(mail.id));

    return (
        <div
            onClick={onClick}
            className={`px-4 py-3.5 cursor-pointer transition-all border-b border-slate-100 relative ${
                selected ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-50"
            }`}
        >
            {!isRead && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500" />
            )}
            <div className="flex items-start gap-3 pl-2">
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor(mail.userName)}`}>
                    {initials(mail.userName)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className={`text-sm truncate ${isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>{mail.userName}</div>
                        <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(mail.timestamp)}</span>
                    </div>
                    <div className={`text-xs truncate mb-0.5 ${isRead ? "text-slate-500" : "font-semibold text-slate-800"}`}>{mail.title}</div>
                    <div className="text-[10px] text-slate-400 truncate mb-1.5">{mail.description.slice(0, 70)}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_BADGE[mail.priority] || PRIORITY_BADGE.Low}`}>{mail.priority}</span>
                        <span className="text-[9px] text-slate-400 border border-slate-100 rounded px-1.5 py-0.5">{mail.department}</span>
                        {belongsTo.map((p) => (
                            <span key={p.id} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: p.color + "20", color: p.color }}>
                                {p.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Mail Packets Panel ──────────────────────────────────────────────────
export default function MailPacketsPanel() {
    const [mails, setMails] = useState<Mail[]>([]);
    const [loading, setLoading] = useState(true);
    const [packets, setPackets] = useState<Packet[]>([]);
    const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
    const [showCreatePacket, setShowCreatePacket] = useState(false);
    const [activePacket, setActivePacket] = useState<Packet | null>(null);
    const [searchQ, setSearchQ] = useState("");
    const [mailFilter, setMailFilter] = useState<MailFilter>("All");
    const [readSet, setReadSet] = useState<Set<string>>(new Set());
    const [packetSummary, setPacketSummary] = useState<string | null>(null);
    const [packetSumLoading, setPacketSumLoading] = useState(false);
    const [closedMailIds, setClosedMailIds] = useState<Set<string>>(new Set());
    const [sidebarSection, setSidebarSection] = useState<"inbox" | "important" | "sent" | "drafts">("inbox");

    // Persist read status locally
    useEffect(() => {
        try {
            const saved = localStorage.getItem("bharat_mail_read");
            if (saved) setReadSet(new Set(JSON.parse(saved)));
        } catch (e) {}
    }, []);

    useEffect(() => {
        if (readSet.size > 0) {
            localStorage.setItem("bharat_mail_read", JSON.stringify(Array.from(readSet)));
        }
    }, [readSet]);

    useEffect(() => {
        fetch("/api/complaints")
            .then((r) => r.json())
            .then((d) => setMails(d.all ?? []))
            .catch(() => setMails([]))
            .finally(() => setLoading(false));
    }, []);

    // Auto-load packet summary when switching packets
    useEffect(() => {
        if (!activePacket) { setPacketSummary(null); return; }
        const packetMails = mails.filter(m => activePacket.mailIds.includes(m.id));
        if (!packetMails.length) { setPacketSummary(null); return; }
        setPacketSummary(null);
        setPacketSumLoading(true);
        getAISummary(packetMails, `Packet: ${activePacket.name}`).then(s => {
            setPacketSummary(s);
            setPacketSumLoading(false);
        });
    }, [activePacket?.id]);

    function handleSelectMail(m: Mail) {
        setSelectedMail(m);
        setReadSet(prev => new Set([...prev, m.id]));
    }

    function handleCloseIssue(id: string) {
        setClosedMailIds(prev => new Set([...prev, id]));
        setMails(prev => prev.map(m => m.id === id ? { ...m, status: "Resolved" } : m));
    }

    const displayedMails = (() => {
        // Apply folder filter first (each section shows different data)
        let list: Mail[];
        if (activePacket) {
            list = mails.filter((m) => activePacket.mailIds.includes(m.id));
        } else {
            switch (sidebarSection) {
                case "important":
                    list = mails.filter(m => m.priority === "High" || m.priority === "Critical");
                    break;
                case "sent":
                    list = mails.filter(m => m.status === "Resolved");
                    break;
                case "drafts":
                    list = mails.filter(m => m.status === "Filed");
                    break;
                case "inbox":
                default:
                    list = [...mails];
                    break;
            }
        }
        // Then apply search filter
        if (searchQ.trim()) {
            const q = searchQ.toLowerCase();
            list = list.filter(m =>
                m.title.toLowerCase().includes(q) ||
                m.location.toLowerCase().includes(q) ||
                m.description.toLowerCase().includes(q) ||
                m.department.toLowerCase().includes(q) ||
                m.userName.toLowerCase().includes(q)
            );
        }
        // Then apply read/unread filter
        if (mailFilter === "Read") list = list.filter(m => readSet.has(m.id));
        if (mailFilter === "Unread") list = list.filter(m => !readSet.has(m.id));
        return list;
    })();

    const unreadCount = mails.filter(m => !readSet.has(m.id)).length;

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── LEFT SIDEBAR (light theme) ─────────────────────────── */}
            <div className="w-56 shrink-0 bg-slate-50 flex flex-col border-r border-slate-200">
                {/* Header */}
                <div className="px-4 py-4 border-b border-slate-200">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Mail Inbox</div>
                </div>

                {/* Core nav items */}
                <nav className="px-3 py-3 space-y-0.5">
                    {[
                        { id: "inbox" as const, label: "Inbox", icon: <MailOpen className="w-4 h-4" />, badge: unreadCount },
                        { id: "important" as const, label: "Important", icon: <Star className="w-4 h-4" />, badge: null },
                        { id: "sent" as const, label: "Sent", icon: <Send className="w-4 h-4" />, badge: null },
                        { id: "drafts" as const, label: "Drafts", icon: <FileText className="w-4 h-4" />, badge: null },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setSidebarSection(item.id); setActivePacket(null); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                sidebarSection === item.id && !activePacket
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            <span className="text-sm">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.badge !== null && item.badge > 0 && (
                                <span className="ml-auto text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="mx-3 my-1 border-t border-slate-200" />

                {/* Folders / Packets */}
                <div className="px-3 py-2 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Packets</div>
                        <button
                            onClick={() => setShowCreatePacket(true)}
                            className="text-slate-500 hover:text-slate-900 transition-colors"
                            title="New packet"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>

                    {packets.length === 0 && (
                        <div className="text-[11px] text-slate-500 italic px-1">No packets yet</div>
                    )}
                    {packets.filter(p => !p.closed).map((p) => (
                        <button
                            key={p.id}
                            onClick={() => { setActivePacket(p); setSidebarSection("inbox"); }}
                            className={`group flex items-center gap-2 w-full text-left py-2 px-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                                activePacket?.id === p.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                        >
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                            <span className="truncate text-xs">{p.name}</span>
                            <span className="ml-auto text-[9px] text-slate-500">{p.mailIds.length}</span>
                            <button
                                onClick={e => { e.stopPropagation(); setPackets(prev => prev.filter(x => x.id !== p.id)); if (activePacket?.id === p.id) setActivePacket(null); }}
                                className="hidden group-hover:inline text-slate-400 hover:text-rose-500 text-xs ml-0.5"
                                title="Remove packet"
                            >×</button>
                        </button>
                    ))}
                </div>

                {/* New Packet button */}
                <div className="px-3 py-3 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <button
                        onClick={() => setShowCreatePacket(true)}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        New Packet
                    </button>
                </div>
            </div>

            {/* ── MAIL LIST PANE ────────────────────────────────────────────── */}
            <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-white">
                {/* Pane header */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                    {activePacket ? (
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: activePacket.color }} />
                            <span className="font-bold text-slate-900 text-sm truncate">{activePacket.name}</span>
                            <span className="text-xs text-slate-400 ml-auto shrink-0">{activePacket.mailIds.length} mails</span>
                        </div>
                    ) : (
                        <div className="mb-3">
                            <div className="font-bold text-slate-900 text-sm">
                                {sidebarSection === "inbox" ? "Inbox" : sidebarSection === "important" ? "Important" : sidebarSection === "sent" ? "Sent" : "Drafts"}
                                <span className="text-slate-400 font-normal ml-1.5">({displayedMails.length})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                                {sidebarSection === "inbox" ? "All received complaints" :
                                 sidebarSection === "important" ? "High & Critical priority only" :
                                 sidebarSection === "sent" ? "Resolved complaints" :
                                 "Filed / Pending complaints"}
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative mb-3">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                            placeholder="Search mail..."
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* All / Read / Unread pills */}
                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                        {(["All", "Read", "Unread"] as MailFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setMailFilter(f)}
                                className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all ${mailFilter === f ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                            >{f}</button>
                        ))}
                    </div>
                </div>

                {/* Packet AI summary pinned above list */}
                <AnimatePresence>
                    {activePacket && (packetSummary || packetSumLoading) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mx-3 mt-3 overflow-hidden"
                        >
                            <div className="rounded-xl border border-indigo-200 overflow-hidden shadow-sm">
                                {/* Header bar with mail count */}
                                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-600">
                                    <Bot className="w-4 h-4 text-white" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">AI Packet Summary</span>
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            <Mail className="w-3.5 h-3.5 text-white" /> {activePacket.mailIds.length} mail{activePacket.mailIds.length !== 1 ? "s" : ""} covered
                                        </span>
                                        {packetSumLoading && <span className="w-2.5 h-2.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />}
                                    </div>
                                </div>
                                {/* Summary body */}
                                <div className="px-3 py-2.5 bg-indigo-50">
                                    {packetSumLoading ? (
                                        <div className="space-y-1.5 animate-pulse">
                                            <div className="h-2 bg-indigo-200 rounded w-full" />
                                            <div className="h-2 bg-indigo-200 rounded w-4/5" />
                                            <div className="h-2 bg-indigo-200 rounded w-3/5" />
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-indigo-900 leading-relaxed">{packetSummary}</p>
                                    )}
                                    <button onClick={() => setPacketSummary(null)} className="mt-1.5 text-indigo-400 hover:text-indigo-600 text-[9px] font-medium flex items-center gap-1"><X className="w-2.5 h-2.5" /> Dismiss</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mail list */}
                <div className="flex-1 overflow-y-auto mt-2">
                    {loading ? (
                        <div className="space-y-1 p-3">
                            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />)}
                        </div>
                    ) : displayedMails.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-sm">No mail found</div>
                    ) : (
                        displayedMails.map((m) => (
                            <MailCard
                                key={m.id}
                                mail={m}
                                selected={selectedMail?.id === m.id}
                                onClick={() => handleSelectMail(m)}
                                packets={packets}
                                readSet={readSet}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* ── DETAIL PANE ───────────────────────────────────────────────── */}
            <MailDetail
                mail={selectedMail}
                onClose={() => setSelectedMail(null)}
                onCloseIssue={handleCloseIssue}
            />

            {/* Create Packet Modal */}
            <AnimatePresence>
                {showCreatePacket && (
                    <CreatePacketModal
                        mails={mails}
                        onSave={(p) => setPackets((prev) => [...prev, p])}
                        onClose={() => setShowCreatePacket(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
