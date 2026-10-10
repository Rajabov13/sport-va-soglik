import { z } from "zod";
import { authRoute, parseJson } from "@/server/http/api";
import { suggestClassification } from "@/server/ai/classify";
import { getCategories } from "@/server/services/catalog";

const schema = z.object({ text: z.string().trim().min(10, "tooShort").max(3000, "tooLong") });

export const POST = authRoute(
  async ({ req }) => {
    const { text } = await parseJson(req, schema);
    const categories = await getCategories();
    const result = await suggestClassification(text, categories.map((c) => c.slug));
    const category = categories.find((c) => c.slug === result.categorySlug) ?? categories.find((c) => c.slug === "other");
    return { categoryId: category?.id ?? null, categorySlug: result.categorySlug, urgency: result.urgency, source: result.source, confidence: result.confidence };
  },
  { rateLimit: { name: "ai", limit: 20, windowMs: 60_000 } },
);
