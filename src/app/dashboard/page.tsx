import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardList, HandHeart, Hourglass, Map, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/states";
import { DemoGuide } from "@/features/dashboard/demo-guide";
import { RequestGrid } from "@/features/dashboard/request-grid";
import { getT, getLocale } from "@/i18n/server";
import { requireUser } from "@/server/auth/current-user";
import { homeForRole } from "@/server/auth/redirects";
import { listRequests } from "@/server/services/requests";
import { getImpactStats } from "@/server/services/stats";
import { db } from "@/server/db";
import { formatNumber } from "@/lib/format";
import { serialize } from "@/types/serialize";
import type { RequestListItemDTO } from "@/types/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.dashboard") };
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  if (user.role !== "USER") redirect(homeForRole(user.role));
  const [t, locale] = await Promise.all([getT(), getLocale()]);

  const [active, completed, total, recent, awaiting, impact] = await Promise.all([
    db.request.count({ where: { requesterId: user.id, deletedAt: null, status: { in: ["PENDING", "VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS"] } } }),
    db.request.count({ where: { requesterId: user.id, deletedAt: null, status: "COMPLETED" } }),
    db.request.count({ where: { requesterId: user.id, deletedAt: null } }),
    listRequests(user, { scope: "mine", page: 1, pageSize: 4, sort: "newest" }),
    listRequests(user, { scope: "mine", page: 1, pageSize: 4, sort: "newest", status: "IN_PROGRESS" }),
    getImpactStats(),
  ]);
  const awaitingIds = await db.requestAssignment.findMany({
    where: { status: "COMPLETION_REQUESTED", requestId: { in: awaiting.items.map((r) => r.id) } },
    select: { requestId: true },
  });
  const awaitingItems = awaiting.items.filter((r) => awaitingIds.some((a) => a.requestId === r.id));
  const n = (v: number) => formatNumber(locale, v);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("dashboard.greeting", { name: user.name.split(" ")[0] })}</h1>
          <p className="mt-1 text-muted-foreground">{t("dashboard.userSubtitle")}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/requests/create">
            <Plus /> {t("requests.create")}
          </Link>
        </Button>
      </div>

      <DemoGuide />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("dashboard.myActive")} value={n(active)} icon={<Hourglass />} />
        <StatCard label={t("dashboard.myCompleted")} value={n(completed)} icon={<CheckCircle2 />} tone="accent" />
        <StatCard label={t("dashboard.myTotal")} value={n(total)} icon={<ClipboardList />} tone="slate" />
        <StatCard label={t("impact.peopleHelped")} value={n(impact.peopleHelped)} icon={<Users />} tone="amber" hint={t("dashboard.platformImpact")} />
      </div>

      {awaitingItems.length > 0 && (
        <section aria-labelledby="awaiting" className="grid gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 p-4">
          <h2 id="awaiting" className="flex items-center gap-2 font-semibold text-accent">
            <CheckCircle2 className="size-5" aria-hidden /> {t("dashboard.awaitingConfirm")}
          </h2>
          <RequestGrid items={serialize(awaitingItems) as unknown as RequestListItemDTO[]} />
        </section>
      )}

      <section aria-labelledby="recent" className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="text-lg font-semibold">{t("dashboard.recentRequests")}</h2>
          {recent.total > 0 && (
            <Link href="/dashboard/requests" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {t("common.viewAll")} <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        {recent.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title={t("dashboard.noRequests")}
            text={t("dashboard.noRequestsText")}
            action={
              <Button asChild>
                <Link href="/dashboard/requests/create">
                  <Plus /> {t("requests.create")}
                </Link>
              </Button>
            }
          />
        ) : (
          <RequestGrid items={serialize(recent.items) as unknown as RequestListItemDTO[]} />
        )}
      </section>

      <section aria-labelledby="quick" className="grid gap-3">
        <h2 id="quick" className="text-lg font-semibold">{t("dashboard.quickActions")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/map", icon: Map, label: t("nav.map"), text: t("map.subtitle") },
            { href: "/campaigns", icon: HandHeart, label: t("nav.campaigns"), text: t("campaigns.subtitle") },
            { href: "/impact", icon: Users, label: t("nav.impact"), text: t("impact.subtitle") },
          ].map((q) => (
            <Link key={q.href} href={q.href} className="flex gap-3 rounded-2xl border bg-card p-4 shadow-soft transition hover:shadow-lift">
              <q.icon className="size-5 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block font-semibold">{q.label}</span>
                <span className="block text-sm text-muted-foreground">{q.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
