import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { CampaignCard } from "@/features/campaigns/campaign-card";
import { JoinTeamButton } from "@/features/organizations/join-team-button";
import { getLocale, getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getOrganizationPublic, membershipStatus } from "@/server/services/organizations";
import { ApiError } from "@/server/http/errors";
import { db } from "@/server/db";

async function load(id: string) {
  try {
    return await getOrganizationPublic(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const org = await db.organization.findFirst({ where: { OR: [{ id }, { slug: id }], status: "VERIFIED", deletedAt: null }, select: { name: true, description: true } });
  return org ? { title: org.name, description: org.description.slice(0, 160), openGraph: { title: org.name, description: org.description.slice(0, 160) } } : { title: "404" };
}

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, locale, org, user] = await Promise.all([getT(), getLocale(), load(id), getCurrentUser()]);
  const membership = user?.role === "VOLUNTEER" ? await membershipStatus(user.id, org.id) : null;
  const completedByCampaign = await db.request.groupBy({ by: ["campaignId"], where: { campaignId: { in: org.campaigns.map((c) => c.id) }, status: "COMPLETED" }, _count: { _all: true } });
  const done = new Map(completedByCampaign.map((c) => [c.campaignId, c._count._all]));

  return (
    <div className="container py-8 sm:py-12">
      <div className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:p-8">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
          <Building2 className="size-8" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{org.name}</h1>
            <Badge variant="success">
              <BadgeCheck aria-hidden /> {t("organizations.verified")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {org.type} {org.location && `· ${org.location.city}`}
          </p>
        </div>
        {user?.role === "VOLUNTEER" && <JoinTeamButton orgId={org.id} status={membership} />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("organizations.about")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-muted-foreground">{org.description}</p>
            </CardContent>
          </Card>
          <section className="grid gap-3" aria-labelledby="org-campaigns">
            <h2 id="org-campaigns" className="text-lg font-semibold">{t("organizations.activeCampaigns")}</h2>
            {org.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("organizations.noCampaigns")}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {org.campaigns.map((c) => (
                  <CampaignCard key={c.id} t={t} locale={locale} c={{ ...c, organization: { name: org.name }, location: org.location, completedHelps: done.get(c.id) ?? 0 }} />
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="grid h-fit gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t("impact.completedRequests")} value={org.stats.completedRequests} tone="accent" />
            <StatCard label={t("impact.peopleHelped")} value={org.stats.peopleHelped} tone="rose" />
            <StatCard label={t("impact.volunteerHours")} value={org.stats.volunteerHours} />
            <StatCard label={t("impact.volunteers")} value={org._count.members} tone="amber" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("organizations.contacts")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {org.address && (
                <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden /> {org.address}</p>
              )}
              {org.phone && (
                <a href={`tel:${org.phone.replace(/\s/g, "")}`} className="flex gap-2 hover:text-primary"><Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden /> {org.phone}</a>
              )}
              {org.email && (
                <a href={`mailto:${org.email}`} className="flex gap-2 break-all hover:text-primary"><Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden /> {org.email}</a>
              )}
              {org.website && (
                <a href={org.website} target="_blank" rel="noopener noreferrer nofollow" className="flex gap-2 break-all hover:text-primary"><Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden /> {t("organizations.website")}</a>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
