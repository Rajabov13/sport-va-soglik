"use client";
import { dictionaries } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import "./globals.css";

function currentLocale() {
  if (typeof document === "undefined") return "uz";
  const match = document.cookie.match(/(?:^|; )qollab_locale=([^;]+)/);
  return match && isLocale(match[1]) ? match[1] : "uz";
}

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const locale = currentLocale();
  const d = dictionaries[locale];
  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <p className="text-7xl font-extrabold text-primary">500</p>
        <h1 className="mt-4 text-2xl font-bold">{d.errors.title500}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{d.errors.text500}</p>
        <button onClick={reset} className="mt-6 h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white">
          {d.common.retry}
        </button>
      </body>
    </html>
  );
}
