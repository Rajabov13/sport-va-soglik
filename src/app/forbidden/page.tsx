import type { Metadata } from "next";
import { ErrorPage } from "@/components/shared/error-page";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: "403", robots: { index: false } };

export default async function Forbidden() {
  const t = await getT();
  return <ErrorPage code="403" title={t("errors.title403")} text={t("errors.text403")} homeLabel={t("errors.goHome")} />;
}
