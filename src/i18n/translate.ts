import type { Dictionary } from "./dictionaries/en";

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = T extends string ? never : { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];

export type TranslationKey = Paths<Dictionary>;
export type TranslateVars = Record<string, string | number>;
export type Translator = (key: TranslationKey, vars?: TranslateVars) => string;

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export function interpolate(template: string, vars?: TranslateVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

export function createTranslator(dict: Dictionary, fallback?: Dictionary): Translator {
  return (key, vars) => {
    const value = lookup(dict, key) ?? (fallback ? lookup(fallback, key) : undefined);
    // Missing keys fall back to the key itself rather than "undefined".
    return interpolate(value ?? key, vars);
  };
}

/** Translate a dynamic key (e.g. built from an enum value). */
export function tDynamic(t: Translator, key: string, vars?: TranslateVars) {
  return t(key as TranslationKey, vars);
}
