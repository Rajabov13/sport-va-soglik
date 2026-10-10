import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CheckCircle2, Clock, MapPin, Star, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { DynamicIcon } from "@/components/shared/icons";
import { BadgeGrid, type BadgeDTO } from "@/features/achievements/badge-grid";
import { SkillList } from "@/features/volunteer/skill-list";
import { getLocale, getT } from "@/i18n/server";
import { getVolunteerProfile } from "@/server/services/volunteers";
import { ApiError } from "@/server/http/errors";
import { categoryName, formatDate } from "@/lib/format";
import { serialize } from "@/types/serialize";
import { db } from "@/server/db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = await db.user.findFirst({ where: { id, role: "VOLUNTEER", deletedAt: null }, select: { name: true } });
  return { title: u?.name ?? "404" };
}

export default async function VolunteerPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const p = await getVolunteerProfile(id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const s = p.stats;
  return (
    <div className="container py-8 sm:py-12">
      <div className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:p-8">
        <Avatar name={p.name} src={p.avatarUrl} className="size-20 text-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{p.name}</h1>
            {p.isVerified && (
              <Badge variant="success">
                <BadgeCheck aria-hidden /> {t("volunteer.verified")}
              </Badge>
            )}
            {p.isAvailableNow && <Badge variant="soft">{t("volunteer.available")}</Badge>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {p.city && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden /> {p.city}
              </span>
            )}
            <span>{t("volunteer.memberSince", { date: formatDate(locale, p.memberSince, { month: "short", year: "numeric" }) })}</span>
            <span className="font-medium text-primary">{t("volunteer.level", { level: s.level.level })} · {s.xp} XP</span>
          </p>
          {p.bio && <p className="mt-3 max-w-2xl text-sm">{p.bio}</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("volunteer.completed")} value={s.completedCount} icon={<CheckCircle2 />} tone="accent" />
        <StatCard label={t("volunteer.hours")} value={s.hoursTotal} icon={<Clock />} />
        <StatCard label={t("volunteer.rating")} value={s.ratingAvg ? s.ratingAvg.toFixed(2) : "—"} icon={<Star />} tone="amber" />
        <StatCard label={t("volunteer.peopleHelped")} value={s.peopleHelped} icon={<Users />} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("volunteer.badges")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeGrid badges={serialize(p.badges) as BadgeDTO[]} compact />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("volunteer.reviews")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {p.reviews.length === 0 && <p className="text-sm text-muted-foreground">{t("volunteer.noReviews")}</p>}
              {p.reviews.map((r) => (
                <div key={r.id} className="rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={r.author.name} src={r.author.avatarUrl} className="size-8" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.author.name}</p>
                      <p className="flex gap-0.5" aria-label={`${r.rating} ★`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} aria-hidden />
                        ))}
                      </p>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDate(locale, r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <aside className="grid h-fit gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("volunteer.skills")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <SkillList skills={p.skills} />
              <div className="flex flex-wrap gap-2">
                {p.categories.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
                    <DynamicIcon name={c.icon} className="size-3.5" style={{ color: c.color }} /> {categoryName(c, locale)}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
