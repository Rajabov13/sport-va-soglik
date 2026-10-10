import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { translatorFor } from "./dictionaries";
import { LOCALE_COOKIE } from "@/server/auth/constants";

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  // Uzbek is the default; users switch language explicitly (stored in a cookie and their profile).
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
});

export async function getT() {
  return translatorFor(await getLocale());
}
