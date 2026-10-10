"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { dictionaries } from "./dictionaries";
import { en } from "./dictionaries/en";
import { createTranslator, tDynamic, type Translator, type TranslateVars } from "./translate";
import { INTL_LOCALE, type Locale } from "./config";

interface I18nContextValue {
  locale: Locale;
  t: Translator;
  td: (key: string, vars?: TranslateVars) => string;
  setLocale: (locale: Locale) => void;
  intlLocale: string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);
  const router = useRouter();

  const value = React.useMemo<I18nContextValue>(() => {
    const t = createTranslator(dictionaries[locale], en);
    return {
      locale,
      t,
      td: (key, vars) => tDynamic(t, key, vars),
      intlLocale: INTL_LOCALE[locale],
      setLocale: (next) => {
        setLocaleState(next);
        document.documentElement.lang = next;
        // Persist (cookie + profile) and re-render server components without a full page reload.
        fetch("/api/settings/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        })
          .catch(() => undefined)
          .finally(() => router.refresh());
      },
    };
  }, [locale, router]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
