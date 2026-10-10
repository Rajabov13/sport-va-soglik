import type { Urgency } from "@prisma/client";
import { env } from "@/config/env";
import { classifyRequest, type Classification } from "@/server/domain/classifier";

const URGENCIES: Urgency[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TIMEOUT_MS = 7000;

type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

async function callGemini(model: string, prompt: string): Promise<{ category?: string; urgency?: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.ai.geminiApiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as GeminiResponse;
    const raw = json.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === "string")?.text ?? "";
    return JSON.parse(raw) as { category?: string; urgency?: string };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Suggest category + urgency. Uses Google Gemini when GEMINI_API_KEY is configured — the primary model
 * first, then a lighter fallback model (overload / quota errors are common) — and otherwise, or on any
 * failure, the transparent keyword classifier.
 */
export async function suggestClassification(text: string, categorySlugs: string[]): Promise<Classification> {
  const fallback = classifyRequest(text);
  if (!env.ai.geminiApiKey) return fallback;

  const prompt =
    `Classify this social help request from Uzbekistan (it may be written in Uzbek, Russian or English). ` +
    `Reply with JSON only: {"category": one of ${JSON.stringify(categorySlugs)}, "urgency": one of ${JSON.stringify(URGENCIES)}}.\n\n` +
    `Request:\n${text.slice(0, 3000)}`;

  const models = Array.from(new Set([env.ai.geminiModel, env.ai.geminiFallbackModel].filter(Boolean)));
  for (const model of models) {
    const parsed = await callGemini(model, prompt);
    if (!parsed) continue;
    const categorySlug = parsed.category && categorySlugs.includes(parsed.category) ? parsed.category : fallback.categorySlug;
    const urgency = URGENCIES.includes(parsed.urgency as Urgency) ? (parsed.urgency as Urgency) : fallback.urgency;
    return { categorySlug, urgency, confidence: 0.8, source: "ai" };
  }
  return fallback;
}
