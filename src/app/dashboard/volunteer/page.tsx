import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, ListChecks, Star, Users } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoGuide } from "@/features/dashboard/demo-guide";
import { RequestGrid } from "@/features/dashboard/request-grid";
import { AvailabilityToggle } from "@/features/volunteer/availability-toggle";
import { MatchedRequests } from "@/features/volunteer/matched-requests";
import { LevelCard } from "@/features/volunteer/level-card";
import { RequestList } from "@/features/requests/request-list";
import { getT, getLocale } from "@/i18n/server";
import { requireRole } from "@/server/auth/current-user";
import { getVolunteerProfile } from "@/server/services/volunteers";
import { listVolunteerTasks } from "@/server/services/requests";
import { formatNumber } from "@/lib/format";
import { serialize } from "@/types/serialize";
import type { RequestListItemDTO } from "@/types/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("volunteer.title") };
}

export default async function VolunteerHubPage() {
  const user = await requireRole(["VOLUNTEER"], "/dashboard/volunteer");
  const [t, locale, profile, active] = await Promise.all([getT(), getLocale(), getVolunteerProfile(user.id), listVolunteerTasks(user.id, "active")]);
  const s = profile.stats;
  const n = (v: number) => formatNumber(locale, v);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("dashboard.greeting", { name: user.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-muted-foreground">{t("dashboard.volunteerSubtitle")}</p>
      </div>
      <DemoGuide />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <LevelCard xp={s.xp} {...s.level} />
        <StatCard label={t("volunteer.completed")} value={n(s.completedCount)} icon={<CheckCircle2 />} tone="accent" />
        <StatCard label={t("volunteer.hours")} value={n(s.hoursTotal)} icon={<Clock />} />
        <StatCard label={t("volunteer.rating")} value={s.ratingAvg ? s.ratingAvg.toFixed(2) : "—"} icon={<Star />} tone="amber" hint={`${s.ratingCount} ${t("volunteer.reviews").toLowerCase()}`} />
        <StatCard label={t("volunteer.peopleHelped")} value={n(s.peopleHelped)} icon={<Users />} tone="rose" />
      </div>
      <AvailabilityToggle initial={profile.isAvailableNow} />

      {active.length > 0 && (
        <section aria-labelledby="active-tasks" className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 id="active-tasks" className="flex items-center gap-2 text-lg font-semibold">
              <ListChecks className="size-5 text-primary" aria-hidden /> {t("volunteer.tasksActive")}
            </h2>
            <Link href="/dashboard/volunteer/tasks" className="text-sm font-semibold text-primary hover:underline">{t("common.viewAll")}</Link>
          </div>
          <RequestGrid items={serialize(active.map((a) => a.request)) as unknown as RequestListItemDTO[]} />
        </section>
      )}

      <Tabs defaultValue="suggested">
        <TabsList>
          <TabsTrigger value="suggested">{t("volunteer.suggested")}</TabsTrigger>
          <TabsTrigger value="browse">{t("volunteer.browse")}</TabsTrigger>
        </TabsList>
        <TabsContent value="suggested">
          <MatchedRequests />
        </TabsContent>
        <TabsContent value="browse">
          <RequestList scope="open" emptyAction={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
