/**
 * /api/ai-complete — Server-side proxy for client components
 * Implements full Groq → NVIDIA fallback chain so client code never
 * needs to expose NVIDIA keys via NEXT_PUBLIC_*.
 *
 * POST body: { messages: [{role, content}], system?: string, temperature?, max_tokens?, stream? }
 */
import { NextRequest } from "next/server";
import { callAI, streamAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // ── Vision Check: verify if image is AI-generated ──────────────────────────
  if (body?.type === "vision-check") {
    const { imageBase64, mimeType } = body;
    const GEMINI_KEY = process.env.CHATBOT_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY || !imageBase64) {
      return Response.json({ isAIGenerated: false, isRelevant: true });
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `You are an image validator for India's citizen grievance portal. ONLY detect AI-generated/synthetic images. Answer JSON only: {"isAIGenerated": boolean, "isRelevant": true, "reason": "brief"}.\n\nRULES:\n- isAIGenerated: true ONLY for AI art, CGI renders, cartoons, Midjourney-style images, or obvious digital illustrations.\n- isAIGenerated: false for ALL real photographs, even if blurry, dark, partial, or not obviously related to infrastructure.\n- isRelevant: ALWAYS true.\n- When in doubt → isAIGenerated: false. Being lenient is correct.` },
                { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
          }),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned);
      return Response.json({ ...result, isRelevant: true });
    } catch {
      return Response.json({ isAIGenerated: false, isRelevant: true });
    }
  }

  const {
    messages = [],
    system,
    temperature,
    max_tokens,
    stream: wantStream = false,
  } = body ?? {};

  // Build messages array, prepend system if provided separately
  const normalized = system
    ? [{ role: "system", content: system }, ...messages]
    : messages;

  // ── Streaming response ─────────────────────────────────────────────────────
  if (wantStream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of streamAI(normalized, { temperature, max_tokens })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
          }
        } catch (e) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token: `⚠️ ${e instanceof Error ? e.message : "Error"}` })}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // ── Non-streaming response ─────────────────────────────────────────────────
  try {
    // Extract system from normalized if present
    const sysMsg = normalized.find((m: { role: string; content: string }) => m.role === "system");
    const userMsgs = normalized.filter((m: { role: string; content: string }) => m.role !== "system");
    const lastUser = userMsgs[userMsgs.length - 1]?.content ?? "";

    const result = await callAI(lastUser, sysMsg?.content, { temperature, max_tokens });
    return Response.json({ content: result });
  } catch (e) {
    return Response.json({ error: String(e), content: "⚠️ All AI providers unavailable." }, { status: 503 });
  }
}
