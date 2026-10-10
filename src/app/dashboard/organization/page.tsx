import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImpactStatsGrid } from "@/features/impact/impact-stats";
import { ImpactCharts } from "@/features/impact/impact-charts";
import { CampaignFormDialog } from "@/features/organization/campaign-form";
import { CompleteCampaignButton } from "@/features/organization/campaign-actions";
import { TeamManager } from "@/features/organization/team-manager";
import { OrgProfileForm } from "@/features/organization/org-profile-form";
import { DemoGuide } from "@/features/dashboard/demo-guide";
import { getLocale, getT } from "@/i18n/server";
import { requireRole } from "@/server/auth/current-user";
import { getOrganizationDashboard } from "@/server/services/organizations";
import { getChartData } from "@/server/services/stats";
import { formatDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("organization.title") };
}

export default async function OrganizationDashboardPage() {
  const user = await requireRole(["ORGANIZATION"], "/dashboard/organization");
  const [t, locale, dash] = await Promise.all([getT(), getLocale(), getOrganizationDashboard(user.id)]);
  const charts = await getChartData(12, { organizationId: dash.organization.id });
  const org = dash.organization;
  const verified = org.status === "VERIFIED";

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{org.name}</h1>
            <Badge variant={verified ? "success" : org.status === "PENDING" ? "warning" : "danger"}>{t(`admin.orgStatus.${org.status}`)}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{t("dashboard.orgSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {verified && (
            <Button asChild variant="outline">
              <Link href={`/organizations/${org.slug}`}>
                <ExternalLink /> {t("common.profile")}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/dashboard/requests/create">
              <Plus /> {t("requests.create")}
            </Link>
          </Button>
        </div>
      </div>
      <DemoGuide />
      {org.status === "PENDING" && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{t("organization.pendingVerification")}</p>}
      {org.status === "REJECTED" && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{t("organization.rejected")}</p>}

      <ImpactStatsGrid stats={dash.stats} t={t} locale={locale} scope="organization" />

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">{t("organization.campaigns")}</TabsTrigger>
          <TabsTrigger value="team">{t("organization.team")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("organization.analytics")}</TabsTrigger>
          <TabsTrigger value="profile">{t("organization.profile")}</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="grid gap-3">
          <div className="flex justify-end">
            <CampaignFormDialog disabled={!verified} />
          </div>
          {dash.campaigns.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("organizations.noCampaigns")}</p>
          ) : (
            <ul className="grid gap-2">
              {dash.campaigns.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft">
                  <div className="min-w-0 flex-1">
                    <Link href={`/campaigns/${c.slug}`} className="font-semibold hover:text-primary">
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(locale, c.startsAt)} — {c.endsAt ? formatDate(locale, c.endsAt) : t("campaigns.ongoing")} · {t("campaigns.volunteersGoal", { count: c._count.participants, goal: c.goalVolunteers })} · {t("campaigns.requests", { count: c._count.requests })}
                    </p>
                  </div>
                  <Badge variant={c.status === "ACTIVE" ? "success" : "muted"}>{c.status === "ACTIVE" ? t("campaigns.active") : t("campaigns.completed")}</Badge>
                  {c.status === "ACTIVE" && <CompleteCampaignButton id={c.id} />}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="team">
          <TeamManager />
        </TabsContent>
        <TabsContent value="analytics">
          <ImpactCharts data={charts} />
        </TabsContent>
        <TabsContent value="profile">
          <OrgProfileForm
            initial={{
              name: org.name,
              description: org.description,
              type: org.type,
              website: org.website ?? "",
              phone: org.phone ?? "",
              email: org.email ?? "",
              address: org.address ?? "",
              locationId: org.locationId ?? "",
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
