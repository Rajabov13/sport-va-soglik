import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AnalyticsView } from "@/features/admin/analytics-view";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("admin.analyticsTitle") };
}

export default async function AdminAnalyticsPage() {
  const t = await getT();
  return (
    <>
      <PageHeader title={t("admin.analyticsTitle")} subtitle={t("impact.subtitle")} />
      <AnalyticsView />
    </>
  );
}
