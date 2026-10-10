import type { Urgency } from "@prisma/client";
import { env } from "@/config/env";
import { classifyRequest, type Classification } from "@/server/domain/classifier";

const URGENCIES: Urgency[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/**
 * Suggest category + urgency. Uses Google Gemini when GEMINI_API_KEY is configured,
 * otherwise (or on any failure) the transparent keyword classifier.
 */
export async function suggestClassification(text: string, categorySlugs: string[]): Promise<Classification> {
  const fallback = classifyRequest(text);
  if (!env.ai.geminiApiKey) return fallback;
  try {
    const prompt =
      `Classify this social help request from Uzbekistan. Reply with JSON only: ` +
      `{"category": one of ${JSON.stringify(categorySlugs)}, "urgency": one of ${JSON.stringify(URGENCIES)}}.\n\n` +
      `Request:\n${text.slice(0, 3000)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.ai.geminiModel)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.ai.geminiApiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeout));
    if (!res.ok) return fallback;
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(raw) as { category?: string; urgency?: string };
    const categorySlug = parsed.category && categorySlugs.includes(parsed.category) ? parsed.category : fallback.categorySlug;
    const urgency = URGENCIES.includes(parsed.urgency as Urgency) ? (parsed.urgency as Urgency) : fallback.urgency;
    return { categorySlug, urgency, confidence: 0.8, source: "ai" };
  } catch {
    return fallback;
  }
}
