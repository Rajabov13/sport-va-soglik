import { ErrorPage } from "@/components/shared/error-page";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return <ErrorPage code="404" title={t("errors.title404")} text={t("errors.text404")} homeLabel={t("errors.goHome")} />;
}
