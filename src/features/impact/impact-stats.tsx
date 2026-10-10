import { Building2, CheckCircle2, ClipboardList, Clock, Gauge, HandHeart, Sparkles, Timer, Users } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { ImpactStats } from "@/server/services/stats";
import type { Translator } from "@/i18n/translate";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/i18n/config";

/** `scope="organization"` hides platform-wide figures that are not filtered by organization. */
export function ImpactStatsGrid({ stats, t, locale, scope = "platform" }: { stats: ImpactStats; t: Translator; locale: Locale; scope?: "platform" | "organization" }) {
  const platform = scope === "platform";
  const n = (v: number) => formatNumber(locale, v, { notation: v >= 10000 ? "compact" : "standard" });
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${platform ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
      <StatCard label={t("impact.totalRequests")} value={n(stats.totalRequests)} icon={<ClipboardList />} />
      <StatCard label={t("impact.completedRequests")} value={n(stats.completedRequests)} icon={<CheckCircle2 />} tone="accent" />
      {platform && <StatCard label={t("impact.activeVolunteers")} value={n(stats.activeVolunteers)} icon={<HandHeart />} tone="accent" />}
      <StatCard label={t("impact.peopleHelped")} value={n(stats.peopleHelped)} icon={<Users />} tone="rose" />
      {platform && <StatCard label={t("impact.organizations")} value={n(stats.organizations)} icon={<Building2 />} tone="amber" />}
      <StatCard label={t("impact.avgResponse")} value={t("common.minutes", { value: n(stats.avgResponseMinutes) })} icon={<Timer />} tone="slate" />
      <StatCard label={t("impact.successRate")} value={`${stats.successRate}%`} icon={<Gauge />} tone="accent" />
      <StatCard label={t("impact.volunteerHours")} value={n(stats.volunteerHours)} icon={<Clock />} />
      {platform && <StatCard label={t("impact.impactPoints")} value={n(stats.impactPoints)} icon={<Sparkles />} tone="amber" />}
      <StatCard label={t("impact.openRequests")} value={n(stats.openRequests)} icon={<ClipboardList />} tone="slate" />
    </div>
  );
}
