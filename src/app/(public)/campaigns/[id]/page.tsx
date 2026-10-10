import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Target, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { JoinCampaignButton } from "@/features/campaigns/join-campaign-button";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCampaign, isCampaignParticipant } from "@/server/services/organizations";
import { ApiError } from "@/server/http/errors";
import { categoryName, formatDate } from "@/lib/format";
import { db } from "@/server/db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await db.campaign.findFirst({ where: { OR: [{ id }, { slug: id }], deletedAt: null }, select: { title: true, description: true } });
  return c ? { title: c.title, description: c.description.slice(0, 160), openGraph: { title: c.title, description: c.description.slice(0, 160) } } : { title: "404" };
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, locale, user] = await Promise.all([getT(), getLocale(), getCurrentUser()]);
  const c = await getCampaign(id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const joined = user?.role === "VOLUNTEER" ? await isCampaignParticipant(user.id, c.id) : false;
  const helpsPct = Math.round((c.completedHelps / Math.max(1, c.goalHelps)) * 100);
  const volPct = Math.round((c._count.participants / Math.max(1, c.goalVolunteers)) * 100);

  return (
    <div className="container py-8 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid h-fit gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={c.status === "ACTIVE" ? "success" : "muted"}>{c.status === "ACTIVE" ? t("campaigns.active") : t("campaigns.completed")}</Badge>
              {c.category && <Badge variant="soft">{categoryName(c.category, locale)}</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{c.title}</h1>
            <p className="mt-2 text-muted-foreground">
              <Link href={`/organizations/${c.organization.slug}`} className="font-medium text-primary hover:underline">
                {t("campaigns.by", { name: c.organization.name })}
              </Link>
            </p>
          </div>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <p className="whitespace-pre-line leading-relaxed">{c.description}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" aria-hidden />
                  {t("campaigns.dates", { start: formatDate(locale, c.startsAt), end: c.endsAt ? formatDate(locale, c.endsAt) : t("campaigns.ongoing") })}
                </span>
                {c.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden /> {c.location.city}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Target className="size-4" aria-hidden /> {t("campaigns.requests", { count: c._count.requests })}
                </span>
              </div>
            </CardContent>
          </Card>
          {c.participants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("campaigns.participants")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-3">
                  {c.participants.map((p) => (
                    <li key={p.id}>
                      <Link href={`/volunteers/${p.user.id}`} className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm hover:border-primary/40">
                        <Avatar name={p.user.name} src={p.user.avatarUrl} className="size-7" /> {p.user.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <Card>
            <CardContent className="grid gap-5 p-5">
              <div className="grid gap-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{t("campaigns.progress", { done: c.completedHelps, goal: c.goalHelps })}</span>
                  <span className="text-muted-foreground">{helpsPct}%</span>
                </div>
                <Progress value={helpsPct} indicatorClassName="bg-accent" label={t("campaigns.progress", { done: c.completedHelps, goal: c.goalHelps })} />
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Users className="size-4" aria-hidden /> {t("campaigns.volunteersGoal", { count: c._count.participants, goal: c.goalVolunteers })}
                  </span>
                  <span className="text-muted-foreground">{volPct}%</span>
                </div>
                <Progress value={volPct} label={t("campaigns.volunteersGoal", { count: c._count.participants, goal: c.goalVolunteers })} />
              </div>
              {c.status === "ACTIVE" &&
                (user?.role === "VOLUNTEER" ? (
                  <JoinCampaignButton campaignId={c.id} joined={joined} />
                ) : !user ? (
                  <Button asChild size="lg" variant="accent">
                    <Link href={`/auth/login?next=/campaigns/${c.slug}`}>{t("campaigns.loginToJoin")}</Link>
                  </Button>
                ) : null)}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
