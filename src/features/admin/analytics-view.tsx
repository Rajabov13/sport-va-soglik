"use client";
import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { NativeSelect } from "@/components/ui/input";
import { CardListSkeleton, ErrorState } from "@/components/shared/states";
import { ImpactCharts } from "@/features/impact/impact-charts";
import { ImpactStatsGrid } from "@/features/impact/impact-stats";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import type { ChartData, ImpactStats } from "@/server/services/stats";

export function AnalyticsView() {
  const { t, locale } = useI18n();
  const [weeks, setWeeks] = React.useState(12);
  const query = useQuery({
    queryKey: ["admin", "stats", weeks],
    queryFn: () => api.get<{ stats: ImpactStats; charts: ChartData }>(`/api/admin/stats?weeks=${weeks}`),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <label htmlFor="weeks" className="text-sm font-medium">{t("admin.weeks")}</label>
        <NativeSelect id="weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-auto">
          {[4, 12, 26, 52].map((w) => (
            <option key={w} value={w}>{t("admin.lastWeeks", { count: w })}</option>
          ))}
        </NativeSelect>
      </div>
      {query.isPending ? (
        <CardListSkeleton count={2} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : (
        <div className={`grid gap-6 transition-opacity ${query.isPlaceholderData ? "opacity-60" : ""}`}>
          <ImpactStatsGrid stats={query.data.stats} t={t} locale={locale} />
          <ImpactCharts data={query.data.charts} />
        </div>
      )}
    </div>
  );
}
