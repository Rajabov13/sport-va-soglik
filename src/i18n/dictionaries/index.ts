import { en } from "./en";
import { ru } from "./ru";
import { uz } from "./uz";
import type { Locale } from "../config";
import { createTranslator } from "../translate";

export const dictionaries = { uz, ru, en } as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.uz;
}

export function translatorFor(locale: Locale) {
  return createTranslator(getDictionary(locale), en);
}
