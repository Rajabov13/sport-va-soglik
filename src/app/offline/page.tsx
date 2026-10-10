import type { Metadata } from "next";
import { ErrorPage } from "@/components/shared/error-page";
import { translatorFor } from "@/i18n/dictionaries";
import { DEFAULT_LOCALE } from "@/i18n/config";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };
export const dynamic = "force-static";

/** Precached by the service worker, so it must not depend on cookies/request data. */
export default function Offline() {
  const t = translatorFor(DEFAULT_LOCALE);
  return <ErrorPage code="⌁" title={t("errors.offlineTitle")} text={t("errors.offlineText")} homeLabel={t("errors.goHome")} />;
}
