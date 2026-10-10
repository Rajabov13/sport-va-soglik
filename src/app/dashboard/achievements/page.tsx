import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { BadgeGrid, type BadgeDTO } from "@/features/achievements/badge-grid";
import { Leaderboard } from "@/features/achievements/leaderboard";
import { LevelCard } from "@/features/volunteer/level-card";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/current-user";
import { getVolunteerProfile } from "@/server/services/volunteers";
import { getLeaderboard } from "@/server/services/stats";
import { serialize } from "@/types/serialize";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("achievements.title") };
}

export default async function AchievementsPage() {
  const user = await requireUser("/dashboard/achievements");
  const [t, leaders] = await Promise.all([getT(), getLeaderboard(20)]);
  const profile = user.role === "VOLUNTEER" ? await getVolunteerProfile(user.id) : null;

  return (
    <>
      <PageHeader title={t("achievements.title")} subtitle={t("achievements.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid h-fit gap-4">
          {profile ? (
            <>
              <LevelCard xp={profile.stats.xp} {...profile.stats.level} />
              <BadgeGrid badges={serialize(profile.badges) as BadgeDTO[]} />
            </>
          ) : (
            <Card>
              <CardContent className="grid gap-4 p-6">
                <p className="text-muted-foreground">{t("achievements.onlyVolunteers")}</p>
                <Button asChild className="w-fit">
                  <Link href="/campaigns">{t("nav.campaigns")}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("achievements.leaderboard")}</CardTitle>
            <CardDescription>{t("achievements.leaderboardSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Leaderboard rows={leaders} t={t} highlightId={user.id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
