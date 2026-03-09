// ─── Gemini API Client ────────────────────────────────────────────────
import type { NewsArticle } from "./news";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// parse a comma-separated list from env into an array
function parseKeys(envVar?: string): string[] {
  if (!envVar) return [];
  return envVar
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

// pick a key randomly from the pool (round‑robin could also be used, but
// serverless deployments may not preserve state between invocations)
function getGeminiKey(): string {
  const keys = parseKeys(process.env.GEMINI_API_KEYS);
  if (keys.length > 0) {
    return keys[Math.floor(Math.random() * keys.length)];
  }
  // fall back to the legacy single-key variable for backwards compatibility
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  throw new Error("Gemini API key(s) not set");
}

export async function callGemini(
  prompt: string,
  imageBase64?: string,
): Promise<string> {
  // build list of keys up front (including fallback legacy key)
  let keys = parseKeys(process.env.GEMINI_API_KEYS);
  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys = [process.env.GEMINI_API_KEY];
  }
  if (keys.length === 0) {
    throw new Error("Gemini API key(s) not set");
  }

  // shuffle order for randomness
  const pool = keys.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const parts: {
    text?: string;
    inline_data?: { mime_type: string; data: string };
  }[] = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });
  }

  let lastError: Error | null = null;
  for (const apiKey of pool) {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });

    if (res.status === 429) {
      // hit rate limit on this key, try the next one
      lastError = new Error("Gemini rate limit (429)");
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  // all keys failed with 429
  throw lastError || new Error("Gemini API error");
}

// ─── Domain-specific analysis ─────────────────────────────────────────
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

  const prompt = `You are an AI analyst for India's national security and policy. Analyze these ${domain} news articles and return ONLY valid JSON (no markdown, no explanation):

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

  const raw = await callGemini(prompt);
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── Scheme summarizer ────────────────────────────────────────────────
export async function summarizeScheme(
  schemeName: string,
  description: string,
): Promise<string> {
  const prompt = `Summarize this Indian government scheme in exactly ONE clear sentence (max 20 words) for citizens:
Scheme: ${schemeName}
Description: ${description}
Return only the one-line summary, nothing else.`;
  const result = await callGemini(prompt);
  return result.trim();
}

// ─── Complaint analyzer ───────────────────────────────────────────────
export async function analyzeComplaint(
  complaintText: string,
  department: string,
  imageBase64?: string,
): Promise<{
  gravity: "Low" | "Medium" | "High" | "Critical";
  problemType: string;
  refinedText: string;
  imageMatchesText: boolean;
  isImageAIGenerated: boolean;
  imageAnalysis: string;
}> {
  const prompt = `You are an AI that processes Indian government complaints. Analyze this complaint${imageBase64 ? " and the attached image" : ""}:

COMPLAINT TEXT: "${complaintText}"
DEPARTMENT: ${department}
${imageBase64 ? "IMAGE: [attached]" : "IMAGE: None provided"}

Return ONLY valid JSON (no markdown):
{
  "gravity": "Low|Medium|High|Critical",
  "problemType": "Brief category (e.g., Infrastructure, Health, Corruption, Safety)",
  "refinedText": "Professionally rewritten complaint text, clear and formal, preserving all facts",
  "imageMatchesText": true|false,
  "isImageAIGenerated": true|false,
  "imageAnalysis": "Brief description of what the image shows and if it matches the complaint"
}

Gravity guide: Critical=life threat/mass impact, High=urgent public issue, Medium=significant local issue, Low=minor grievance.`;

  const raw = await callGemini(prompt, imageBase64);
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ─── Chatbot context-aware ────────────────────────────────────────────
export async function chatWithContext(
  userMessage: string,
  context: string,
  history: { role: "user" | "model"; text: string }[],
): Promise<string> {
  // reuse key pool logic from callGemini so we can retry on 429
  let keys = parseKeys(process.env.GEMINI_API_KEYS);
  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys = [process.env.GEMINI_API_KEY];
  }
  if (keys.length === 0) {
    throw new Error("Gemini API key(s) not set");
  }

  // shuffle order
  const pool = keys.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const systemContext = `You are ARIA (Adaptive Reasoning Intelligence Assistant), an AI strategic analyst embedded in India's National Intelligence Platform. You have deep expertise in geopolitics, economics, defense, technology, climate, and society.

CURRENT CONTEXT:
${context}

Answer concisely and clearly. For officials: provide strategic, data-driven insights. Be direct. Use facts only.`;

  const contents = [
    { role: "user", parts: [{ text: systemContext }] },
    {
      role: "model",
      parts: [
        {
          text: "Understood. I am ARIA, ready to assist with strategic analysis.",
        },
      ],
    },
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let lastError: Error | null = null;
  for (const apiKey of pool) {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
      }),
    });

    if (res.status === 429) {
      lastError = new Error("Gemini rate limit (429)");
      continue;
    }

    if (!res.ok) throw new Error("Gemini API error");
    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "I couldn't generate a response. Please try again."
    );
  }

  throw lastError || new Error("Gemini API error");
}
