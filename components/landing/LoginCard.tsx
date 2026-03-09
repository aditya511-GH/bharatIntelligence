"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginCard() {
    const [selected, setSelected] = useState<"official" | "user" | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const CREDENTIALS = {
        official: { email: "official@gov.in", password: "official123", hint: "official@gov.in / official123" },
        user: { email: "citizen@india.in", password: "citizen123", hint: "citizen@india.in / citizen123" },
    };

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        setLoading(false);
        if (result?.error) {
            setError("Invalid credentials. Check your email and password.");
        } else {
            router.push(selected === "official" ? "/official" : "/citizen");
        }
    }

    function selectRole(role: "official" | "user") {
        setSelected(role);
        setEmail(CREDENTIALS[role].email);
        setPassword(CREDENTIALS[role].password);
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
                    Select your access level to continue
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
                    🏛️ Official
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
                    🧑‍💼 Citizen
                </motion.button>
            </div>

            {/* Credentials hint */}
            {selected && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 px-3 py-2 rounded-lg text-xs font-mono"
                    style={{ background: "rgba(66,165,245,0.08)", color: "#4DB6AC", border: "1px solid rgba(77,182,172,0.2)" }}
                >
                    Demo: {CREDENTIALS[selected].hint}
                </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                    <label className="text-xs mb-1 block" style={{ color: "#90CAF9" }}>Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                        style={{
                            background: "rgba(13,31,60,0.8)",
                            border: "1px solid rgba(66,165,245,0.3)",
                            color: "#E0F7FA",
                        }}
                    />
                </div>
                <div>
                    <label className="text-xs mb-1 block" style={{ color: "#90CAF9" }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                        style={{
                            background: "rgba(13,31,60,0.8)",
                            border: "1px solid rgba(66,165,245,0.3)",
                            color: "#E0F7FA",
                        }}
                    />
                </div>

                {error && (
                    <div className="text-xs px-3 py-2 rounded-lg badge-critical">{error}</div>
                )}

                <motion.button
                    type="submit"
                    disabled={loading || !selected}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                        background: loading || !selected
                            ? "rgba(13,71,161,0.3)"
                            : "linear-gradient(135deg, #0D47A1, #00695C)",
                        color: loading || !selected ? "#546E7A" : "#E0F7FA",
                        cursor: loading || !selected ? "not-allowed" : "pointer",
                        boxShadow: !loading && selected ? "0 4px 24px rgba(13,71,161,0.4)" : "none",
                    }}
                >
                    {loading ? "Authenticating..." : "Access Platform →"}
                </motion.button>
            </form>
        </motion.div>
    );
}
