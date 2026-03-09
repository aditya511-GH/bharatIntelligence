"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useScroll,
  useTransform,
  Variants,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { SessionProvider } from "next-auth/react";
import LoginCard from "@/components/landing/LoginCard";

const Hero3D = dynamic(() => import("@/components/landing/Hero3D"), {
  ssr: false,
});

// ─── Data ────────────────────────────────────────────────────────────────────

const domains = [
  {
    icon: "🌐",
    label: "Geopolitics",
    desc: "Cross-border relations & strategic positioning",
  },
  {
    icon: "📈",
    label: "Economics",
    desc: "Macroeconomic trends & trade flows",
  },
  { icon: "🛡️", label: "Defense", desc: "Security posture & threat modeling" },
  {
    icon: "⚡",
    label: "Technology",
    desc: "Innovation & digital infrastructure",
  },
  { icon: "🌿", label: "Climate", desc: "Environmental risks & resilience" },
  { icon: "🏛️", label: "Society", desc: "Human development & welfare" },
] as const;

const features = [
  {
    icon: "🧠",
    title: "Entity Ontology System",
    desc: "Every country, policy, leader, and trade route is an entity with attributes, relationships, and risk scores.",
  },
  {
    icon: "🔗",
    title: "Auto Event Correlation",
    desc: "AI auto-detects relationships between events across domains — no manual linking required.",
  },
  {
    icon: "⚡",
    title: "Causal Reasoning Engine",
    desc: "Trace cause-effect chains: Oil ↑ → Import Cost ↑ → Inflation ↑ — clear dependency graphs.",
  },
  {
    icon: "🎯",
    title: "Alert Priority Engine",
    desc: "Only top-5 critical events shown. Events ranked by Impact × Risk × Urgency score.",
  },
  {
    icon: "📡",
    title: "Live Intelligence Feed",
    desc: "Real-time news from global sources, filtered and analyzed for India-impact relevance.",
  },
  {
    icon: "🗳️",
    title: "Citizen Voice Pipeline",
    desc: "Citizen complaints AI-triaged, image-verified, gravity-scored and routed to officials.",
  },
] as const;

const teamMembers = [
  {
    role: "Analysts",
    icon: "📊",
    title: "Geopolitical Analysts",
    desc: "Decode complex multi-domain events with AI-assisted correlation maps and causal graph overlays.",
  },
  {
    role: "Ministers",
    icon: "🏛️",
    title: "Policy Officials",
    desc: "Get a unified intelligence dashboard: live alerts, entity graphs, strategic insights — all in one command center.",
  },
  {
    role: "Citizens",
    icon: "🧑‍💼",
    title: "Citizens",
    desc: "Browse government schemes, file verified complaints, and use your voice to connect with the system.",
  },
] as const;

const faqs = [
  {
    q: "What is Bharat Intelligence?",
    a: "Bharat Intelligence is India's AI-powered national decision infrastructure that connects geopolitics, economics, defense, and society into one unified intelligence graph for authorized officials and citizens.",
  },
  {
    q: "How does the Citizen Voice Pipeline work?",
    a: "Citizens submit complaints via text or voice. The system AI-triages the submission, verifies attached images, assigns a gravity score, and routes it to the appropriate official for resolution.",
  },
  {
    q: "What data sources power the Live Intelligence Feed?",
    a: "We aggregate from 120+ global news sources, government press releases, satellite data providers, and official trade APIs — all filtered for India-impact relevance in real time.",
  },
  {
    q: "How secure is the platform?",
    a: "All data is end-to-end encrypted. Access is role-gated: officials see classified intelligence views; citizens interact through sandboxed civic portals. Full audit trail on every action.",
  },
] as const;

const skills = [
  { label: "Geopolitical Analysis", value: 92 },
  { label: "Economic Modeling", value: 85 },
  { label: "Defense Intelligence", value: 78 },
  { label: "AI & Causal Reasoning", value: 95 },
  { label: "Citizen Feedback Loop", value: 88 },
  { label: "Real-time Data Fusion", value: 90 },
] as const;

const testimonials = [
  {
    quote:
      "Bharat Intelligence transformed how our ministry processes global signals. What used to take days of manual analysis now surfaces in minutes with full causal context.",
    author: "Naveen Shankar",
    role: "Citizen, Chandigarh",
  },
  {
    quote:
      "The entity graph alone is worth it. Seeing how a trade decision in Brussels ripples into inflation in Bengaluru — visually, in real time — is remarkable.",
    author: "Dr. Deepika",
    role: "Senior Geopolitical Analyst, Chandigarh University",
  },
  {
    quote:
      "Filing a complaint used to feel like shouting into the void. Now I get a gravity-score receipt and a resolution timeline. This is governance that listens.",
    author: "Rahul Sharma",
    role: "Citizen, Gharuan",
  },
] as const;

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

// ─── Magnetic Button ─────────────────────────────────────────────────────────

const Magnetic = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 15, stiffness: 150, mass: 0.1 });
  const sy = useSpring(y, { damping: 15, stiffness: 150, mass: 0.1 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    x.set((clientX - (left + width / 2)) * 0.2);
    y.set((clientY - (top + height / 2)) * 0.2);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
};

// ─── Navbar ───────────────────────────────────────────────────────────────────

const navLinks = [
  { label: "Platform", href: "#features" },
  { label: "Domains", href: "#domains" },
  { label: "Who It's For", href: "#audience" },
  { label: "Contact", href: "#contact" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-black/5"
          : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          className={`font-display font-black text-lg tracking-tight transition-colors ${scrolled ? "text-slate-900" : "text-white"}`}
        >
          Bharat<span className="text-blue-500">Intelligence</span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className={`text-sm font-medium transition-colors hover:text-blue-400 ${scrolled ? "text-slate-700" : "text-white/80"}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href="#login"
          className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          Access Platform
        </a>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`md:hidden flex flex-col gap-1.5 p-2 ${scrolled ? "text-slate-900" : "text-white"}`}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-current transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block w-5 h-0.5 bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-5 h-0.5 bg-current transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-black/5 px-6 py-4 flex flex-col gap-4"
          >
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#login"
              onClick={() => setMenuOpen(false)}
              className="inline-flex justify-center items-center py-2 rounded-full text-sm font-semibold bg-blue-600 text-white"
            >
              Access Platform
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function Hero() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #1a2a6c 40%, #0F52BA 70%, #23a6d5 100%)",
      }}
    >
      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-400 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-500 blur-[100px] animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyan-400 blur-[80px] opacity-40" />
      </div>

      {/* 3D element */}
      <motion.div
        style={{ y: parallaxY, opacity: fadeOut }}
        className="absolute inset-0 z-0 flex items-center justify-center opacity-30 mix-blend-screen"
      >
        <Hero3D />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-8 px-6 max-w-5xl mx-auto pt-20">
        {/* Live badge */}
        <Magnetic>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 px-5 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white/80 text-xs font-mono font-semibold tracking-widest"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            LIVE BETA • NATIONAL INTELLIGENCE PLATFORM
          </motion.div>
        </Magnetic>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9 }}
        >
          <h1 className="font-display font-black leading-tight text-white text-[clamp(2.8rem,7vw,5.5rem)] tracking-tight drop-shadow-2xl mb-4">
            Bharat Intelligence
          </h1>
          <div className="font-display font-medium text-xl text-blue-200 tracking-wide mb-6">
            National Ontology Engine
          </div>
          <p className="max-w-2xl mx-auto text-lg text-white/70 leading-relaxed">
            India&apos;s AI-powered national decision infrastructure. Connecting
            geopolitics, economics, defense, and society into one unified
            intelligence graph.
          </p>
        </motion.div>

        {/* Domain pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {domains.map((d) => (
            <motion.div
              key={d.label}
              whileHover={{ y: -2, scale: 1.04 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/10 backdrop-blur-md border border-white/20 text-white/85 hover:bg-white/20 cursor-default transition-all"
            >
              <span className="text-base">{d.icon}</span> {d.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Login Card */}
        <motion.div
          id="login"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65, type: "spring", stiffness: 200 }}
          className="w-full flex justify-center"
        >
          <LoginCard />
        </motion.div>

        {/* Scroll cue */}
        <motion.a
          href="#features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors mt-4"
        >
          <span className="text-xs font-mono tracking-widest">
            SCROLL TO EXPLORE
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
            className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent"
          />
        </motion.a>
      </div>
    </section>
  );
}

// ─── Feature Strip ────────────────────────────────────────────────────────────

function FeatureStrip() {
  const strips = [
    {
      icon: "🧠",
      label: "Ontology Engine",
      desc: "Entity-level intelligence graph.",
    },
    {
      icon: "🔗",
      label: "Auto Correlation",
      desc: "Cross-domain event linking.",
    },
    {
      icon: "⚡",
      label: "Causal Chains",
      desc: "Traceable cause-effect paths.",
    },
    {
      icon: "🗳️",
      label: "Citizen Pipeline",
      desc: "AI-triaged civic complaints.",
    },
  ];

  return (
    <section
      id="features"
      className="py-20 px-6 bg-white border-y border-slate-100"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {strips.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="flex flex-col items-center text-center p-8 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl mb-4 shadow-inner">
                {s.icon}
              </div>
              <h3 className="font-display font-bold text-slate-900 mb-1 text-base">
                {s.label}
              </h3>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── About / Mission Section ──────────────────────────────────────────────────

function AboutSection() {
  return (
    <section id="about" className="relative py-0 overflow-hidden">
      <div className="grid md:grid-cols-2 min-h-[520px]">
        {/* Image / visual side */}
        <div
          className="relative min-h-[300px] md:min-h-full"
          style={{
            background:
              "linear-gradient(135deg, #0f0c29 0%, #1a2a6c 50%, #0F52BA 100%)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-25">
            <Hero3D />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white text-center">
            <div className="text-7xl mb-6 drop-shadow-2xl">🇮🇳</div>
            <div className="font-display font-black text-3xl mb-2">
              India First
            </div>
            <div className="text-blue-200 text-sm font-mono tracking-widest">
              INTELLIGENCE FOR THE BILLION
            </div>
          </div>
        </div>

        {/* Text side */}
        <div className="flex items-center bg-white px-10 md:px-16 py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="text-xs font-mono tracking-widest text-blue-600 font-bold uppercase mb-4">
              The Mission
            </div>
            <h2 className="font-display font-black text-[clamp(1.8rem,3.5vw,2.8rem)] text-slate-900 leading-tight mb-6">
              Imagine Being the
              <br />
              President of India
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              You are not just reading events — you are{" "}
              <em className="text-blue-700 not-italic font-bold">
                answering them
              </em>
              . What is happening? Why? Who is connected? What comes next? What
              must we monitor?
            </p>
            <p className="text-slate-600 leading-relaxed mb-8">
              Bharat Intelligence takes the entire national signal —
              geopolitics, economics, defense, technology, climate, society —
              and compresses it into one coherent, actionable intelligence
              layer, powered by AI.
            </p>
            <div className="flex flex-wrap gap-3">
              {["6 Domains", "120+ Sources", "Real-time", "AI-Verified"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Domains Section ──────────────────────────────────────────────────────────

function DomainsSection() {
  return (
    <section
      id="domains"
      className="py-28 px-6 bg-slate-50 border-y border-slate-100"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="text-xs font-mono tracking-widest text-teal-600 font-bold uppercase mb-3">
            Intelligence Domains
          </div>
          <h2 className="font-display font-bold text-[clamp(1.8rem,4vw,3rem)] text-slate-900">
            Everything Connected. Nothing Siloed.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {domains.map((d) => (
            <motion.div
              key={d.label}
              variants={fadeUp}
              whileHover={{
                y: -6,
                boxShadow: "0 20px 40px rgba(15,82,186,0.10)",
              }}
              className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all duration-300 cursor-default"
            >
              <div className="text-4xl mb-5 w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-50 transition-colors">
                {d.icon}
              </div>
              <div className="font-display font-bold text-xl mb-2 text-slate-900">
                {d.label}
              </div>
              <div className="text-sm text-slate-500 leading-relaxed">
                {d.desc}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Platform Capabilities ────────────────────────────────────────────────────

function CapabilitiesSection() {
  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="text-xs font-mono tracking-widest text-blue-600 font-bold uppercase mb-3">
            Platform Capabilities
          </div>
          <h2 className="font-display font-bold text-[clamp(1.8rem,4vw,3rem)] text-slate-900">
            Built for National Decision Intelligence
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group relative p-8 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden"
            >
              {/* Subtle gradient glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-50/80 to-transparent rounded-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="text-3xl mb-4">{f.icon}</div>
                <div className="font-display font-bold text-lg mb-3 text-slate-900">
                  {f.title}
                </div>
                <div className="text-sm leading-relaxed text-slate-500">
                  {f.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Call To Action Bar ───────────────────────────────────────────────────────

function CtaBar() {
  return (
    <section className="py-14 px-6 bg-gradient-to-r from-[#0f0c29] via-[#1a2a6c] to-[#0F52BA]">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-display font-bold text-2xl text-white mb-1">
            Want early access to the dashboard?
          </h3>
          <p className="text-blue-200 text-sm">
            We are always open to authorized analysts, officials, and research
            institutions.
          </p>
        </div>
        <a
          href="#contact"
          className="flex-shrink-0 px-8 py-3 rounded-full bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg"
        >
          Request Access →
        </a>
      </div>
    </section>
  );
}

// ─── Audience / Team Section ──────────────────────────────────────────────────

function AudienceSection() {
  return (
    <section
      id="audience"
      className="py-28 px-6 bg-slate-50 border-y border-slate-100"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="text-xs font-mono tracking-widest text-teal-600 font-bold uppercase mb-3">
            Who It&apos;s For
          </div>
          <h2 className="font-display font-bold text-[clamp(1.8rem,4vw,3rem)] text-slate-900">
            Built for Every Stakeholder
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {teamMembers.map((m) => (
            <motion.div
              key={m.role}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-400"
            >
              {/* Top color strip */}
              <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <div className="p-8">
                <div className="text-4xl mb-5">{m.icon}</div>
                <h3 className="font-display font-bold text-xl mb-3 text-slate-900">
                  {m.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {m.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── FAQ + Skills Section ─────────────────────────────────────────────────────

function FaqAndSkills() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">
        {/* FAQ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h4 className="font-display font-bold text-2xl text-slate-900 mb-8">
            Frequently Asked Questions
          </h4>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-slate-100 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-sm"
                >
                  <span>{faq.q}</span>
                  <motion.span
                    animate={{ rotate: openIdx === i ? 45 : 0 }}
                    className="text-blue-600 text-xl leading-none flex-shrink-0 ml-4"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openIdx === i && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Skills / Progress */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h4 className="font-display font-bold text-2xl text-slate-900 mb-8">
            Platform Expertise
          </h4>
          <div className="space-y-6">
            {skills.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                  <span>{s.label}</span>
                  <span className="text-blue-600">{s.value}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.value}%` }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 1.2,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.1,
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i + 1) % testimonials.length),
      5000,
    );
    return () => clearInterval(t);
  }, []);

  const t = testimonials[idx];

  return (
    <section
      className="py-32 px-6 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #1a2a6c 50%, #0F52BA 100%)",
      }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-blue-400 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-500 blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="text-6xl text-white/20 font-serif mb-6">&ldquo;</div>

        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <blockquote className="font-display text-xl md:text-2xl text-white/90 leading-relaxed mb-8 italic">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <div className="font-semibold text-white">{t.author}</div>
            <div className="text-blue-300 text-sm mt-1">{t.role}</div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-10">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-8 bg-white" : "w-2 bg-white/30"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact Section ──────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    org: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production this would call an API route
    setSent(true);
  };

  return (
    <section
      id="contact"
      className="py-28 px-6 bg-slate-50 border-t border-slate-100"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="text-xs font-mono tracking-widest text-blue-600 font-bold uppercase mb-3">
            Get In Touch
          </div>
          <h2 className="font-display font-bold text-[clamp(1.8rem,4vw,3rem)] text-slate-900">
            Request Platform Access
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-12 items-start">
          {/* Form */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="md:col-span-3"
          >
            {sent ? (
              <div className="p-10 rounded-3xl bg-white border border-slate-100 shadow-sm text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                  Request Received
                </h3>
                <p className="text-slate-500 text-sm">
                  We&apos;ll review your credentials and get back within 48
                  hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {[
                  {
                    id: "name",
                    label: "Full Name",
                    type: "text",
                    placeholder: "Your full name",
                  },
                  {
                    id: "email",
                    label: "Email Address",
                    type: "email",
                    placeholder: "you@example.com",
                  },
                  {
                    id: "org",
                    label: "Organization",
                    type: "text",
                    placeholder: "Ministry / Company / Institution",
                  },
                ].map((field) => (
                  <div key={field.id}>
                    <label
                      className="block text-sm font-semibold text-slate-700 mb-1.5"
                      htmlFor={field.id}
                    >
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      required
                      value={(form as any)[field.id]}
                      onChange={(e) =>
                        setForm({ ...form, [field.id]: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                  </div>
                ))}
                <div>
                  <label
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                    htmlFor="message"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    placeholder="Tell us about your use case and why you need access..."
                    required
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                >
                  Submit Request →
                </button>
              </form>
            )}
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="md:col-span-2 space-y-8"
          >
            {[
              {
                icon: "📍",
                title: "Headquarters",
                body: "National Data Infrastructure Council\nNew Delhi, India 110001",
              },
              {
                icon: "📧",
                title: "Email",
                body: "intelligence@bharatgov.example.in\nSupport: help@bharatgov.example.in",
              },
              {
                icon: "🔒",
                title: "Security & Compliance",
                body: "Platform is classified infrastructure. All access is audited under the IT Act 2000 and Data Protection Act 2023.",
              },
            ].map((info) => (
              <div key={info.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                  {info.icon}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm mb-1">
                    {info.title}
                  </div>
                  <div className="text-slate-500 text-sm whitespace-pre-line">
                    {info.body}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const footerLinks = {
    Platform: [
      "Intelligence Dashboard",
      "Citizen Portal",
      "Entity Graph",
      "Alert Engine",
    ],
    Domains: ["Geopolitics", "Economics", "Defense", "Climate"],
    Legal: [
      "Privacy Policy",
      "Terms of Use",
      "Security",
      "Data Act Compliance",
    ],
  };

  return (
    <footer className="bg-[#0a0a14] text-white px-6 pt-20 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand */}
          <div>
            <div className="font-display font-black text-xl mb-3">
              Bharat<span className="text-blue-400">Intelligence</span>
            </div>
            <div className="text-xs font-mono text-blue-400 tracking-widest mb-4">
              NATIONAL ONTOLOGY ENGINE
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              India&apos;s unified AI decision platform for government
              officials, analysts, and engaged citizens.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h5 className="text-white font-bold text-sm mb-4">{section}</h5>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/50 text-sm hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-xs">
          <p>
            © 2026 National Intelligence Consortium. Platform for authorized use
            only.
          </p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Security"].map((l) => (
              <a
                key={l}
                href="#"
                className="hover:text-white/60 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <SessionProvider>
      <main className="bg-[#FAF9F6] text-[#1A1D20] min-h-screen overflow-x-hidden font-sans selection:bg-[#0F52BA] selection:text-white">
        <Navbar />
        <Hero />
        <FeatureStrip />
        <AboutSection />
        <DomainsSection />
        <CapabilitiesSection />
        <CtaBar />
        <AudienceSection />
        <FaqAndSkills />
        <Testimonials />
        <ContactSection />
        <Footer />
      </main>
    </SessionProvider>
  );
}
