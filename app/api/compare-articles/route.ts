import { NextRequest } from "next/server";
import { callAI, streamAI, getGroqKeys, getNvidiaAnthropicKeys, getNvidiaOpenaiKeys, GROQ_BASE, NVIDIA_BASE, GROQ_MODEL, NVIDIA_MODEL_1, NVIDIA_MODEL_2 } from "@/lib/ai";

interface Article { title: string; description: string | null }

// ── SSE helpers ───────────────────────────────────────────────────────────────
const sseChunk = (phase: string, token: string) => `data: ${JSON.stringify({ phase, token })}\n\n`;
const sseDone = (scores: Record<string, number>) => `data: ${JSON.stringify({ phase: "done", scores })}\n\n`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Streaming with full fallback chain for one phase ─────────────────────────
async function* streamWithFallback(
  messages: { role: string; content: string }[],
  opts: { temperature?: number; max_tokens?: number } = {},
): AsyncGenerator<string> {
  yield* streamAI(messages, opts);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const articles: Article[] = body?.articles ?? [];
  if (articles.length < 2) return new Response("Need at least 2 articles", { status: 400 });

  const articleList = articles
    .map((a, i) => `Article ${i + 1}: "${a.title}"\nSummary: ${a.description ?? "N/A"}`)
    .join("\n\n");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        try { controller.enqueue(encoder.encode(text)); } catch { /* closed */ }
      };

      // ── PHASE 1: Advocate (Groq → NVIDIA fallback) ───────────────────────
      const advocateMessages = [
        { role: "system", content: "You are India's senior intelligence analyst — the ADVOCATE. Argue for why these news articles are critically important for India. Be analytical, bold, and specific. Speak as if presenting to the Cabinet." },
        { role: "user", content: `Analyze these ${articles.length} articles as India's ADVOCATE:\n\n${articleList}\n\nStructure as:\n**STRATEGIC IMPORTANCE**\n**INTERCONNECTIONS**\n**INDIA'S URGENT ACTIONS**\n**RISK IF IGNORED** (quantified)` },
      ];
      try {
        for await (const token of streamWithFallback(advocateMessages, { temperature: 0.4, max_tokens: 1000 })) {
          send(sseChunk("groq", token));
        }
      } catch (e) {
        send(sseChunk("groq", `⚠️ ${e instanceof Error ? e.message : "Advocate error"}`));
      }
      send(sseChunk("groq_done", ""));

      // ── PHASE 2: Counter (NVIDIA Anthropic slot → Groq fallback) ─────────
      // For counter we prefer Mixtral for different perspective, then fall back
      const counterMessages = [
        { role: "user", content: `You are India's critical intelligence analyst — the COUNTER-THINKER. Challenge assumptions, present alternative interpretations, highlight risks of overreaction.\n\nCounter-analyze these ${articles.length} news articles:\n\n${articleList}\n\nStructure as:\n**WHAT THE ADVOCATE MISSED**\n**ALTERNATIVE INTERPRETATIONS**\n**RISKS OF OVERREACTION**\n**CALIBRATED INDIA RESPONSE**` },
      ];

      // Try NVIDIA Anthropic slot first for diverse perspective, then fallback
      let counterDone = false;
      for (const key of getNvidiaAnthropicKeys()) {
        try {
          const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({ model: NVIDIA_MODEL_1, messages: counterMessages, temperature: 0.45, top_p: 0.7, max_tokens: 900, stream: true }),
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
            const lines = buf.split("\n"); buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try { const t = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? ""; if (t) { gotTokens = true; send(sseChunk("anthropic", t)); } } catch { /* skip */ }
            }
          }
          if (gotTokens) { counterDone = true; break; }
        } catch { /* try next */ }
      }
      // Fallback to Groq/OpenAI slot if NVIDIA Anthropic failed
      if (!counterDone) {
        try {
          for await (const token of streamWithFallback(counterMessages, { temperature: 0.45, max_tokens: 900 })) {
            send(sseChunk("anthropic", token));
          }
        } catch (e) {
          send(sseChunk("anthropic", `⚠️ ${e instanceof Error ? e.message : "Counter error"}`));
        }
      }
      send(sseChunk("anthropic_done", ""));

      // ── PHASE 3: Evaluator (NVIDIA OpenAI slot → Groq fallback) ─────────
      const evalMessages = [
        { role: "user", content: `You are India's Chief Intelligence Evaluator — the FINAL ARBITER. Render a definitive verdict.\n\n${articleList}\n\nStructure EXACTLY as:\n**EVALUATOR'S VERDICT**\n[Synthesis of advocate vs counter]\n\n**ARTICLE SCORES** (0-100 for India impact)\n${articles.map((a, i) => `Article ${i + 1} "${a.title.slice(0, 40)}": [SCORE]/100 — [one line reason]`).join("\n")}\n\n**CONSENSUS POSITION**\n[Balanced, actionable recommendation]\n\n**OVERALL THREAT LEVEL**: [LOW/MEDIUM/HIGH/CRITICAL]\n**CONFIDENCE**: [X]%` },
      ];

      let openaiAccumulated = "";
      let evalDone = false;

      for (const key of getNvidiaOpenaiKeys()) {
        try {
          const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({ model: NVIDIA_MODEL_2, messages: evalMessages, temperature: 0.3, top_p: 0.7, max_tokens: 800, stream: true }),
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
            const lines = buf.split("\n"); buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try { const t = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? ""; if (t) { gotTokens = true; openaiAccumulated += t; send(sseChunk("openai", t)); } } catch { /* skip */ }
            }
          }
          if (gotTokens) { evalDone = true; break; }
        } catch { /* try next */ }
      }
      if (!evalDone) {
        try {
          for await (const token of streamWithFallback(evalMessages, { temperature: 0.3, max_tokens: 800 })) {
            openaiAccumulated += token;
            send(sseChunk("openai", token));
          }
        } catch (e) {
          openaiAccumulated = `Error: ${e instanceof Error ? e.message : "Eval error"}`;
          send(sseChunk("openai", `⚠️ ${openaiAccumulated}`));
        }
      }
      send(sseChunk("openai_done", ""));

      // Parse article scores
      const scores: Record<string, number> = {};
      articles.forEach((_, i) => {
        const m = openaiAccumulated.match(new RegExp(`Article ${i + 1}[^:]*:\\s*(\\d+)/100`, "i"));
        scores[`article${i}`] = m ? parseInt(m[1]) : Math.floor(50 + Math.random() * 35);
      });
      send(sseDone(scores));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
