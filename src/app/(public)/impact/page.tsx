import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { ImpactCharts } from "@/features/impact/impact-charts";
import { ImpactStatsGrid } from "@/features/impact/impact-stats";
import { getLocale, getT } from "@/i18n/server";
import { getPublicChartData, getPublicImpactStats } from "@/server/services/stats";
import { env } from "@/config/env";

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("impact.title"), description: t("impact.subtitle") };
}

export default async function ImpactPage() {
  const [t, locale, stats, charts] = await Promise.all([getT(), getLocale(), getPublicImpactStats(), getPublicChartData(12)]);
  return (
    <div className="container py-8 sm:py-12">
      <PageHeader
        title={t("impact.title")}
        subtitle={t("impact.subtitle")}
        actions={env.demoMode ? <Badge variant="warning" title={t("common.demoDataHint")}>{t("common.demoData")}</Badge> : undefined}
      />
      <div className="grid gap-6">
        <ImpactStatsGrid stats={stats} t={t} locale={locale} />
        <ImpactCharts data={charts} />
      </div>
    </div>
  );
}
