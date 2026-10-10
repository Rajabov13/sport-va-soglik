import type { Urgency } from "@prisma/client";

/**
 * Keyword-based classifier (uz / ru / en) that suggests a category and urgency
 * for a new request. Used as the default and as a fallback when no AI provider is configured.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  medicine: ["dori", "dorixona", "shifokor", "kasal", "лекарств", "аптек", "врач", "болен", "medicine", "pharmacy", "doctor", "medical", "insulin", "tabletka"],
  elderly: ["keksa", "qariya", "nuroniy", "buvi", "bobo", "пожил", "бабушк", "дедушк", "пенсионер", "elderly", "senior", "grandma", "grandpa"],
  disability: ["nogiron", "aravacha", "imkoniyati cheklangan", "инвалид", "коляск", "ограничен", "disab", "wheelchair", "blind", "ko'r", "ko‘r"],
  education: ["dars", "o'qish", "o‘qish", "maktab", "repetitor", "kitob", "урок", "учеб", "школ", "репетитор", "education", "tutor", "school", "homework", "lesson"],
  food: ["oziq", "ovqat", "non", "mahsulot", "продукт", "еда", "питани", "food", "groceries", "meal", "hungry"],
  emergency: ["yong'in", "yong‘in", "suv bosdi", "favqulodda", "avariya", "пожар", "затоп", "авари", "срочно", "emergency", "fire", "flood", "accident"],
  children: ["bola", "bolalar", "yetim", "chaqaloq", "ребен", "дет", "сирот", "child", "kids", "orphan", "baby"],
  environment: ["daraxt", "chiqindi", "tozalash", "ekolog", "дерев", "мусор", "уборк", "эколог", "tree", "trash", "clean", "environment", "recycl"],
};

const URGENCY_KEYWORDS: Record<Exclude<Urgency, "LOW">, string[]> = {
  CRITICAL: ["juda shoshilinch", "hayotiy", "darhol", "o'lim", "критич", "немедленно", "жизн", "critical", "life-threatening", "immediately"],
  HIGH: ["shoshilinch", "tezda", "bugun", "срочно", "сегодня", "быстро", "urgent", "today", "asap"],
  MEDIUM: ["ertaga", "shu hafta", "завтра", "на этой неделе", "tomorrow", "this week", "soon"],
};

export interface Classification {
  categorySlug: string;
  urgency: Urgency;
  confidence: number;
  source: "keywords" | "ai";
}

export function classifyRequest(text: string): Classification {
  const lower = text.toLowerCase();
  let best = { slug: "other", hits: 0 };
  for (const [slug, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > best.hits) best = { slug, hits };
  }
  let urgency: Urgency = "LOW";
  for (const level of ["CRITICAL", "HIGH", "MEDIUM"] as const) {
    if (URGENCY_KEYWORDS[level].some((w) => lower.includes(w))) {
      urgency = level;
      break;
    }
  }
  if (urgency === "LOW" && (best.slug === "emergency" || best.slug === "medicine")) urgency = "HIGH";
  return { categorySlug: best.slug, urgency, confidence: Math.min(1, best.hits / 3), source: "keywords" };
}
