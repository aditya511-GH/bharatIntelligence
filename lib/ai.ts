/**
 * lib/ai.ts — Unified AI completion with Groq → NVIDIA fallback chain
 *
 * Key pools (comma-separated in .env.local, supports N keys each):
 *   GROQ_API_KEYS          — primary, shuffled for load balancing
 *   ANTHROPIC_API_KEY      — NVIDIA-hosted fallback (nvapi-... key, Mixtral)
 *   OPENAI_API_KEY         — NVIDIA-hosted final fallback (nvapi-... key, Llama)
 */

export const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
export const GROQ_BASE = "https://api.groq.com/openai/v1";

// ── Key pool helpers (N keys each) ───────────────────────────────────────────
function parseKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getGroqKeys(): string[] {
  const keys = parseKeys(process.env.GROQ_API_KEYS);
  if (keys.length > 0) return shuffle(keys);
  const single = process.env.GROQ_API_KEY;
  if (single) return [single.trim()];
  return [];
}

// NVIDIA keys can also be comma-separated for multiple accounts
export function getNvidiaAnthropicKeys(): string[] {
  return parseKeys(process.env.ANTHROPIC_API_KEY);
}

export function getNvidiaOpenaiKeys(): string[] {
  return parseKeys(process.env.OPENAI_API_KEY);
}

// ── Model names ───────────────────────────────────────────────────────────────
export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const NVIDIA_MODEL_1 = "mistralai/mixtral-8x7b-instruct-v0.1"; // Anthropic key slot
export const NVIDIA_MODEL_2 = "meta/llama-3.3-70b-instruct";           // OpenAI key slot

// ── Low-level fetch helpers ───────────────────────────────────────────────────
interface Message { role: string; content: string }

async function fetchCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
  opts: { temperature?: number; max_tokens?: number; top_p?: number } = {},
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.max_tokens ?? 1200,
        top_p: opts.top_p ?? 0.9,
      }),
    });
    if (res.status === 429 || res.status === 503) return null; // try next key
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ── Main: callAI — tries all Groq keys then NVIDIA fallback ──────────────────
export async function callAI(
  userPrompt: string,
  systemPrompt = "You are a highly capable AI assistant.",
  opts: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // ── 1. Try all Groq keys ─────────────────────────────────────────────────
  for (const key of getGroqKeys()) {
    const result = await fetchCompletion(GROQ_BASE, key, GROQ_MODEL, messages, opts);
    if (result) return result;
  }

  // ── 2. Try all NVIDIA Anthropic-slot keys (Mixtral) ─────────────────────
  for (const key of getNvidiaAnthropicKeys()) {
    const result = await fetchCompletion(NVIDIA_BASE, key, NVIDIA_MODEL_1, messages, opts);
    if (result) return result;
  }

  // ── 3. Try all NVIDIA OpenAI-slot keys (Llama) ───────────────────────────
  for (const key of getNvidiaOpenaiKeys()) {
    const result = await fetchCompletion(NVIDIA_BASE, key, NVIDIA_MODEL_2, messages, opts);
    if (result) return result;
  }

  throw new Error("All AI providers exhausted — Groq, NVIDIA Anthropic, and NVIDIA OpenAI all failed.");
}

// ── Streaming version: returns an AsyncGenerator of string tokens ─────────────
export async function* streamAI(
  messages: Message[],
  opts: { temperature?: number; max_tokens?: number; top_p?: number } = {},
): AsyncGenerator<string> {
  // Try Groq streaming
  for (const key of getGroqKeys()) {
    try {
      const res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.max_tokens ?? 1000,
          stream: true,
        }),
      });
      if (res.status === 429 || !res.ok || !res.body) continue;

      let gotTokens = false;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const token = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? "";
            if (token) { gotTokens = true; yield token; }
          } catch { /* skip */ }
        }
      }
      if (gotTokens) return; // done with Groq
    } catch { /* try next */ }
  }

  // Try NVIDIA keys (Anthropic slot → Mixtral, then OpenAI slot → Llama)
  const nvidiaAttempts: [string[], string][] = [
    [getNvidiaAnthropicKeys(), NVIDIA_MODEL_1],
    [getNvidiaOpenaiKeys(), NVIDIA_MODEL_2],
  ];

  for (const [keys, model] of nvidiaAttempts) {
    for (const key of keys) {
      try {
        const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.4,
            top_p: opts.top_p ?? 0.7,
            max_tokens: opts.max_tokens ?? 1000,
            stream: true,
          }),
        });
        if (!res.ok || !res.body) continue;

        let gotTokens = false;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              const token = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? "";
              if (token) { gotTokens = true; yield token; }
            } catch { /* skip */ }
          }
        }

        if (gotTokens) return;

        // Non-streaming fallback for this key
        const fallback = await fetchCompletion(NVIDIA_BASE, key, model, messages, opts);
        if (fallback) {
          for (const word of fallback.split(" ")) {
            yield word + " ";
            await new Promise((r) => setTimeout(r, 6));
          }
          return;
        }
      } catch { /* try next */ }
    }
  }

  yield "⚠️ All AI providers unavailable. Please try again.";
}
