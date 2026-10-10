import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2, ClipboardList, Flag, HandHeart, Hourglass, ShieldAlert, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ImpactCharts } from "@/features/impact/impact-charts";
import { getLocale, getT } from "@/i18n/server";
import { requireRole } from "@/server/auth/current-user";
import { getAdminOverview } from "@/server/services/admin";
import { getChartData } from "@/server/services/stats";
import { formatNumber, relativeTime } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("admin.title") };
}

export default async function AdminPage() {
  await requireRole(["ADMIN"], "/admin");
  const [t, locale, o, charts] = await Promise.all([getT(), getLocale(), getAdminOverview(), getChartData(12)]);
  const n = (v: number) => formatNumber(locale, v);
  const cards = [
    { href: "/admin/users", label: t("admin.users"), value: o.users, icon: <Users />, tone: "primary" as const },
    { href: "/admin/users?role=VOLUNTEER", label: t("admin.volunteers"), value: o.volunteers, icon: <HandHeart />, tone: "accent" as const },
    { href: "/admin/organizations", label: t("admin.organizations"), value: o.organizations, icon: <Building2 />, tone: "amber" as const },
    { href: "/admin/requests", label: t("admin.requests"), value: o.requests, icon: <ClipboardList />, tone: "slate" as const },
    { href: "/admin/requests?status=PENDING", label: t("admin.pendingModeration"), value: o.pending, icon: <Hourglass />, tone: "amber" as const },
    { href: "/admin/requests?status=COMPLETED", label: t("admin.completedTasks"), value: o.completed, icon: <CheckCircle2 />, tone: "accent" as const },
    { href: "/admin/reports", label: t("admin.reports"), value: o.reports, icon: <Flag />, tone: "rose" as const },
    { href: "/admin/organizations?status=PENDING", label: t("admin.pendingOrgs"), value: o.pendingOrgs, icon: <ShieldAlert />, tone: "rose" as const },
  ];
  return (
    <div className="grid gap-6">
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} className="mb-0" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring">
            <StatCard label={c.label} value={n(c.value)} icon={c.icon} tone={c.tone} className="h-full hover:shadow-lift" />
          </Link>
        ))}
      </div>
      <ImpactCharts data={charts} />
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {o.recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noActivity")}</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {o.recentAudit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{a.actor?.name ?? t("common.system")}</span> <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{a.action}</code>
                  </span>
                  <span className="text-xs text-muted-foreground">{relativeTime(locale, a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
