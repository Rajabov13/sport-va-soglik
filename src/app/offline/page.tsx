import type { Metadata } from "next";
import { ErrorPage } from "@/components/shared/error-page";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };
export const dynamic = "force-static";

export default async function Offline() {
  const t = await getT();
  return <ErrorPage code="⌁" title={t("errors.offlineTitle")} text={t("errors.offlineText")} homeLabel={t("errors.goHome")} />;
}
