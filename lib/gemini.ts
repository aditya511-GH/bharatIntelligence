// ─── AI Client (server-side) ──────────────────────────────────────────────────
// All AI calls use callAI() from lib/ai.ts which implements:
//   Groq (N keys, shuffled) → NVIDIA/Mixtral (ANTHROPIC_API_KEY) → NVIDIA/Llama (OPENAI_API_KEY)
import type { NewsArticle } from "./news";
import { callAI } from "./ai";

// ─── Domain-specific analysis ─────────────────────────────────────────────────
export async function analyzeDomainNews(
  domain: string,
  articles: Pick<
    NewsArticle,
    "title" | "description" | "url" | "publishedAt"
  >[],
): Promise<{
  entities: { id: string; label: string; type: string; riskScore: number }[];
  edges: { source: string; target: string; label: string; weight: number }[];
  insights: {
    strategy: string;
    transparency: string;
    nationalAdvantage: string;
  };
  causalChain: string;
  topRisk: number;
}> {
  const articleSummary = articles
    .slice(0, 8)
    .map((a, i) => `${i + 1}. ${a.title}: ${a.description ?? ""}`)
    .join("\n");

  const prompt = `Analyze these ${domain} news articles and return ONLY valid JSON (no markdown, no explanation):

ARTICLES:
${articleSummary}

Return this exact JSON structure:
{
  "entities": [
    {"id": "unique_id", "label": "Entity Name", "type": "country|org|policy|event", "riskScore": 0-100}
  ],
  "edges": [
    {"source": "entity_id", "target": "entity_id", "label": "relationship type", "weight": 0.1-1.0}
  ],
  "insights": {
    "strategy": "One strategic insight for India (1-2 sentences)",
    "transparency": "One transparency/accountability insight (1-2 sentences)",
    "nationalAdvantage": "One national advantage opportunity for India (1-2 sentences)"
  },
  "causalChain": "Brief causal chain explaining how these events connect and affect India",
  "topRisk": 0-100
}

Include 3-8 entities and 2-6 edges. Make them real, based on provided articles.`;

  const raw = await callAI(
    prompt,
    "You are an AI analyst for India's national security and policy. Return only valid JSON.",
    { temperature: 0.3, max_tokens: 2048 },
  );
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── Scheme summarizer ────────────────────────────────────────────────────────
export async function summarizeScheme(
  schemeName: string,
  description: string,
): Promise<string> {
  const result = await callAI(
    `Summarize this Indian government scheme in exactly ONE clear sentence (max 20 words) for citizens:\nScheme: ${schemeName}\nDescription: ${description}\nReturn only the one-line summary, nothing else.`,
    "You are a helpful assistant that summarizes Indian government schemes clearly and concisely.",
    { temperature: 0.5, max_tokens: 60 },
  );
  return result.trim();
}

// ─── Complaint analyzer ───────────────────────────────────────────────────────
export async function analyzeComplaint(
  complaintText: string,
  department: string,
  _imageBase64?: string,
): Promise<{
  gravity: "Low" | "Medium" | "High" | "Critical";
  problemType: string;
  refinedText: string;
  imageMatchesText: boolean;
  isImageAIGenerated: boolean;
  imageAnalysis: string;
}> {
  const raw = await callAI(
    `You are an AI that processes Indian government complaints. Analyze this complaint:\n\nCOMPLAINT TEXT: "${complaintText}"\nDEPARTMENT: ${department}\n\nReturn ONLY valid JSON (no markdown):\n{\n  "gravity": "Low|Medium|High|Critical",\n  "problemType": "Brief category",\n  "refinedText": "Professionally rewritten complaint",\n  "imageMatchesText": true,\n  "isImageAIGenerated": false,\n  "imageAnalysis": "No image provided"\n}\n\nGravity: Critical=life threat, High=urgent, Medium=significant, Low=minor.`,
    "You are an AI complaint processor for Indian government services. Return only valid JSON.",
    { temperature: 0.3, max_tokens: 800 },
  );
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ─── ARIA-X Chatbot ────────────────────────────────────────────────────────────
const GEMINI_CHAT_API_KEY = process.env.CHATBOT_GEMINI_API_KEY;
const GEMINI_CHAT_MODEL = "gemini-2.0-flash";

/** ARIA-X system prompt — matches user's exact specification */
function buildARIAXSystemInstruction(context: string): string {
  const now = new Date();
  const dateIST = now.toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const timeIST = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata",
  });

  return `You are ARIA-X (Adaptive Real-time Intelligence Assistant), an AI system integrated into India's National Intelligence Platform (Bharat Intelligence), with access to live internet data via Google Search.

CURRENT DATE & TIME: ${dateIST}, ${timeIST} IST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE DIRECTIVE:
- NEVER rely solely on pre-trained knowledge for dynamic or time-sensitive queries.
- ALWAYS fetch real-time data when the query involves:
  • Prices (currency, stocks, commodities, crypto)
  • Weather or climate events
  • Current date/time
  • News or recent events (within last 12 months)
  • Live statistics, rankings, or indices

REAL-TIME BEHAVIOR:
- You have Google Search tool access. USE IT for any time-sensitive query.
- If real-time access returns data → cite the source type (e.g. "based on recent market data", "as per Reuters", "IMF April 2026 report").
- If real-time access fails → say: "⚠️ Real-time data fetch failed. Please try again or check your network."

ANTI-HALLUCINATION CLAUSE:
- DO NOT guess or approximate live values (exchange rates, prices, live scores, etc.).
- DO NOT fabricate numbers, names, or statistics.
- If data is unavailable → respond: "data unavailable — please verify from a live source."
- NEVER invent news headlines or events.

PRECISION MODE:
- Prefer external verified data over internal training memory for dynamic queries.
- Static facts (PM of India, capital cities, historical events) → use internal knowledge.
- Always distinguish between "as of [date]" vs "as of training data".

FALLBACK RULE:
- If API/tool fails → inform the user instead of generating potentially outdated info.
- Example: "I couldn't access live data for USD/INR right now. The rate as of my training data was approximately X, but this may be outdated — please check xe.com or RBI."

TONE:
- Concise, intelligent, and factual.
- No generic AI disclaimers like "as a language model" or "I'm just an AI".
- Sound like a senior intelligence analyst briefing a minister.
- Use bullet points for lists, bold for key figures.

QUERY ROUTING:
• "USD to INR today" → MUST trigger Google Search
• "What is the weather in Delhi?" → MUST trigger Google Search
• "Latest news on India-China" → MUST trigger Google Search
• "Who is PM of India" → use internal knowledge (static fact)
• "Hello / Hi" → respond normally, no search needed
• "India's GDP 2024" → trigger Google Search for latest figure
• "What is 2+2" → answer directly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN EXPERTISE (India-focused intelligence):
• Geopolitics: LAC/LoC tensions, QUAD, SCO, BRICS, UN voting patterns
• Economy: RBI policy, CPI/WPI, fiscal deficit, INR dynamics, FDI flows
• Defense: military modernisation, DRDO, cyber threats, nuclear doctrine
• Energy: Brent crude, Russia oil imports, solar capacity, coal dependency
• Technology: DPDP Act, semiconductor PLI, ISRO missions, AI policy
• Climate: IMD forecasts, monsoon deficits, heat waves, net-zero targets
• Global: G20, IMF/World Bank metrics, US Fed, ECB, OPEC decisions

DASHBOARD CONTEXT (live platform data):
${context || "No specific dashboard context loaded. Answer based on general intelligence briefing mode."}`;
}

/**
 * Call Gemini with Google Search grounding.
 * Tries `google_search` (v2 format), falls back to `googleSearch` (v1 camelCase).
 */
async function callGeminiGrounded(
  history: { role: "user" | "model"; text: string }[],
  userMessage: string,
  systemInstruction: string,
  useGrounding = true,
): Promise<string | null> {
  if (!GEMINI_CHAT_API_KEY) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${GEMINI_CHAT_API_KEY}`;

  // Build native Gemini multi-turn contents
  const contents = [
    ...history.map((h) => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    ...(useGrounding
      ? {
          tools: [{ google_search: {} }],          // Gemini 2.0 grounding format
          toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        }
      : {}),
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1536,
      topP: 0.92,
      topK: 40,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[ARIA-X] Gemini ${useGrounding ? "grounded" : "plain"} error:`, res.status, errText);
      return null;
    }

    const data = await res.json();
    // Grounded responses may have multiple parts — join all text parts
    const parts: { text?: string }[] = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("").trim();

    // Include grounding citations if available
    const sources: { uri?: string; title?: string }[] =
      data.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
        (c: { web?: { uri?: string; title?: string } }) => c.web ?? {},
      ) ?? [];

    if (text && sources.length > 0) {
      const citationBlock = sources
        .slice(0, 3)
        .filter((s) => s.uri)
        .map((s, i) => `[${i + 1}] ${s.title ?? s.uri}`)
        .join("\n");
      return citationBlock ? `${text}\n\n**Sources:**\n${citationBlock}` : text;
    }

    return text || null;
  } catch (e) {
    console.error("[ARIA-X] Gemini call exception:", e);
    return null;
  }
}

export async function chatWithContext(
  userMessage: string,
  context: string,
  history: { role: "user" | "model"; text: string }[],
): Promise<string> {
  const systemInstruction = buildARIAXSystemInstruction(context);

  // ── 1. Gemini 2.0 Flash + Google Search grounding (primary, real-time) ──────
  const grounded = await callGeminiGrounded(history, userMessage, systemInstruction, true);
  if (grounded) return grounded;

  // ── 2. Plain Gemini (no grounding) — if grounding call failed ───────────────
  const plain = await callGeminiGrounded(history, userMessage, systemInstruction, false);
  if (plain) return plain;

  // ── 3. Groq/NVIDIA fallback ──────────────────────────────────────────────────
  const fallbackSys = `You are ARIA-X, a strategic intelligence analyst for India's National Intelligence Platform. Today is ${new Date().toDateString()} IST.
ANTI-HALLUCINATION: Do NOT fabricate live statistics, prices, or recent events. If unsure, say "data unavailable".
CONTEXT: ${context || "General briefing mode."}`;
  const historyText = history.map((h) => `${h.role === "model" ? "Assistant" : "User"}: ${h.text}`).join("\n");
  const fullPrompt = history.length > 0 ? `${historyText}\nUser: ${userMessage}` : userMessage;
  return await callAI(fullPrompt, fallbackSys, { temperature: 0.65, max_tokens: 1024 });
}


