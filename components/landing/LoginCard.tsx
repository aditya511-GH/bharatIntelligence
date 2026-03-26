"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase-client";
import { Landmark, UserCircle, Zap }  from "lucide-react";

export default function LoginCard() {
    const [selected, setSelected] = useState<"official" | "user" | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ─── Google OAuth via Supabase ──────────────────────────────────────────
    async function handleGoogleLogin() {
        if (!selected) {
            setError("Please select Official or Citizen before proceeding.");
            return;
        }
        setLoading(true);
        setError("");

        const redirectTo =
            typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?role=${selected}`
                : `http://localhost:3000/auth/callback?role=${selected}`;

        const { error: authError } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo,
                queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
        }
        // On success: browser redirects to Google → then to /auth/callback
    }

    // ─── Demo bypass (for local testing) ─────────────────────────────────
    function handleDemoLogin(role: "official" | "user") {
        setLoading(true);
        window.location.href = role === "official" ? "/official" : "/citizen";
    }

    function selectRole(role: "official" | "user") {
        setSelected(role);
        setError("");
    }

    return (
        <motion.div
            className="glass-card gradient-border glow-blue"
            style={{
                width: "100%",
                maxWidth: 420,
                padding: "36px 32px",
                position: "relative",
                zIndex: 10,
            }}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            whileHover={{ scale: 1.01 }}
        >
            {/* Header */}
            <div className="text-center mb-6">
                <div className="text-xs font-mono tracking-widest mb-2" style={{ color: "#4DB6AC" }}>
                    NATIONAL ONTOLOGY ENGINE
                </div>
                <h2 className="font-display font-bold text-2xl" style={{ color: "#E0F7FA" }}>
                    Secure Access Portal
                </h2>
                <p className="text-sm mt-1" style={{ color: "#90CAF9" }}>
                    Select your access level and sign in with Google
                </p>
            </div>

            {/* Role selector */}
            <div className="flex gap-3 mb-6">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectRole("official")}
                    className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                    style={{
                        background: selected === "official"
                            ? "linear-gradient(135deg, #0D47A1, #1565C0)"
                            : "rgba(13,71,161,0.15)",
                        border: selected === "official" ? "1px solid #42A5F5" : "1px solid rgba(66,165,245,0.2)",
                        color: selected === "official" ? "#E0F7FA" : "#90CAF9",
                        boxShadow: selected === "official" ? "0 0 20px rgba(13,71,161,0.4)" : "none",
                    }}
                >
                    <Landmark className="inline-block w-4 h-4 mr-1.5 -mt-0.5" /> Official
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectRole("user")}
                    className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                    style={{
                        background: selected === "user"
                            ? "linear-gradient(135deg, #00695C, #00897B)"
                            : "rgba(0,137,123,0.15)",
                        border: selected === "user" ? "1px solid #4DB6AC" : "1px solid rgba(77,182,172,0.2)",
                        color: selected === "user" ? "#E0F7FA" : "#80CBC4",
                        boxShadow: selected === "user" ? "0 0 20px rgba(0,137,123,0.4)" : "none",
                    }}
                >
                    <UserCircle className="inline-block w-4 h-4 mr-1.5 -mt-0.5" /> Citizen
                </motion.button>
            </div>

            {/* Google Sign In */}
            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs px-3 py-2 rounded-lg"
                            style={{ background: "rgba(239,83,80,0.1)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)" }}
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all"
                    style={{
                        background: loading
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#E0F7FA",
                        cursor: loading ? "not-allowed" : "pointer",
                        backdropFilter: "blur(8px)",
                        boxShadow: loading ? "none" : "0 4px 24px rgba(0,0,0,0.2)",
                    }}
                >
                    {loading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Connecting to Google...
                        </>
                    ) : (
                        <>
                            {/* Google G logo */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Sign in with Google
                        </>
                    )}
                </motion.button>

                {!selected && (
                    <p className="text-center text-[11px]" style={{ color: "rgba(144,202,249,0.5)" }}>
                        Select a role above to continue
                    </p>
                )}
            </div>

            {/* Demo / Testing Bypass Area */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: "rgba(77,182,172,0.12)" }}>
                <div
                    className="rounded-xl p-4 space-y-3"
                    style={{
                        background: "rgba(234,179,8,0.05)",
                        border: "1px solid rgba(234,179,8,0.2)",
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span
                            className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider"
                            style={{ background: "rgba(234,179,8,0.15)", color: "#FCD34D", border: "1px solid rgba(234,179,8,0.25)" }}
                        >
                            <Zap className="inline-block w-3 h-3 mr-1 -mt-0.5" /> DEMO ACCESS
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: "rgba(148,163,184,0.5)" }}>
                            Bypasses credential verification
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => handleDemoLogin("official")}
                            className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all outline-none"
                            style={{
                                background: "rgba(59,130,246,0.12)",
                                border: "1px solid rgba(59,130,246,0.35)",
                                color: "#93C5FD",
                            }}
                        >
                            <Landmark className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" /> Official Dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDemoLogin("user")}
                            className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all outline-none"
                            style={{
                                background: "rgba(20,184,166,0.12)",
                                border: "1px solid rgba(20,184,166,0.35)",
                                color: "#5EEAD4",
                            }}
                        >
                            <UserCircle className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" /> Citizen Portal
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}