import Link from "next/link";
import { ArrowRight, BarChart3, Clock, HandHeart, Map, MessageCircle, Search, ShieldCheck, Sparkles, Star, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { FadeIn } from "@/components/shared/motion";
import { DynamicIcon } from "@/components/shared/icons";
import { HeroVisual, type HeroRequest } from "@/features/landing/hero-visual";
import { getT, getLocale } from "@/i18n/server";
import { getImpactStats, getLeaderboard } from "@/server/services/stats";
import { listCampaigns } from "@/server/services/organizations";
import { db } from "@/server/db";
import { categoryName, formatNumber } from "@/lib/format";
import { env } from "@/config/env";

export const revalidate = 30;

async function heroRequest(): Promise<HeroRequest | null> {
  const r = await db.request.findFirst({
    where: { status: "MATCHING", deletedAt: null, matches: { some: {} } },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    include: {
      category: true,
      location: true,
      matches: { where: { declinedAt: null }, orderBy: { rank: "asc" }, take: 3, include: { volunteer: { select: { name: true, volunteerProfile: { select: { completedCount: true, ratingAvg: true } } } } } },
    },
  });
  if (!r) return null;
  return {
    title: r.title,
    city: r.location?.city ?? null,
    urgency: r.urgency,
    category: r.category,
    matches: r.matches.map((m) => ({ name: m.volunteer.name, score: m.score, completed: m.volunteer.volunteerProfile?.completedCount ?? 0, rating: m.volunteer.volunteerProfile?.ratingAvg || 5 })),
  };
}

export default async function LandingPage() {
  const [t, locale, stats, leaders, campaigns, hero, categories] = await Promise.all([
    getT(),
    getLocale(),
    getImpactStats(),
    getLeaderboard(3),
    listCampaigns({ status: "ACTIVE", page: 1, pageSize: 3 }),
    heroRequest(),
    db.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { requests: { where: { status: { not: "DRAFT" }, deletedAt: null } } } } } }),
  ]);
  const n = (v: number) => formatNumber(locale, v);

  const statItems = [
    { value: stats.completedRequests, label: t("landing.statsCompleted") },
    { value: stats.activeVolunteers, label: t("landing.statsVolunteers") },
    { value: stats.peopleHelped, label: t("landing.statsHelped") },
    { value: stats.volunteerHours, label: t("landing.statsHours") },
    { value: stats.organizations, label: t("landing.statsOrganizations") },
  ];

  const flow = [
    { icon: Search, title: t("landing.flowProblem"), text: t("landing.flowProblemText") },
    { icon: Target, title: t("landing.flowMatching"), text: t("landing.flowMatchingText") },
    { icon: HandHeart, title: t("landing.flowHelp"), text: t("landing.flowHelpText") },
    { icon: BarChart3, title: t("landing.flowImpact"), text: t("landing.flowImpactText") },
  ];

  const features = [
    { icon: Sparkles, title: t("landing.featureMatching"), text: t("landing.featureMatchingText") },
    { icon: Map, title: t("landing.featureMap"), text: t("landing.featureMapText") },
    { icon: ShieldCheck, title: t("landing.featureSafety"), text: t("landing.featureSafetyText") },
    { icon: BarChart3, title: t("landing.featureImpact"), text: t("landing.featureImpactText") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,hsl(var(--primary-soft))_0%,transparent_70%),radial-gradient(40%_40%_at_90%_30%,hsl(var(--accent-soft))_0%,transparent_70%)]" aria-hidden />
        <div className="container grid items-center gap-12 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
          <FadeIn>
            <Badge variant="soft" className="mb-5 px-3 py-1 text-xs">
              <HandHeart aria-hidden /> {t("landing.heroBadge")}
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">{t("landing.heroTitle")}</h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">{t("landing.heroSubtitle")}</p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard/requests/create">
                  {t("landing.ctaHelp")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="accent">
                <Link href="/auth/register?role=VOLUNTEER">
                  <HandHeart /> {t("landing.ctaVolunteer")}
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              {env.demoMode && (
                <Link href="/auth/login#demo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <Sparkles className="size-4" aria-hidden /> {t("landing.ctaDemo")}
                </Link>
              )}
            <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              {t("landing.helpedToday", { count: n(stats.helpedToday) })}
            </p>
            </div>
          </FadeIn>
          <HeroVisual request={hero} />
        </div>
      </section>

      {/* Impact numbers */}
      <section aria-labelledby="stats-title" className="container">
        <h2 id="stats-title" className="sr-only">{t("impact.title")}</h2>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-soft sm:grid-cols-3 lg:grid-cols-5">
          {statItems.map((s, i) => (
            <div key={i} className={`bg-card p-5 sm:p-6 ${i === statItems.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
              <p className="text-3xl font-extrabold tabular-nums text-primary sm:text-4xl">{n(s.value)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        {env.demoMode && (
          <p className="mt-3 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground sm:flex-row">
            <Badge variant="warning">{t("common.demoData")}</Badge> {t("common.demoDataHint")}
          </p>
        )}
      </section>

      {/* Flow */}
      <section className="container mt-24" aria-labelledby="flow-title">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 id="flow-title" className="text-3xl font-bold sm:text-4xl">{t("landing.flowTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.flowSubtitle")}</p>
        </FadeIn>
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {flow.map((step, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <li className="relative h-full rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
                {i < flow.length - 1 && (
                  <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden size-7 -translate-y-1/2 rounded-full border bg-card p-1.5 text-primary md:block" aria-hidden />
                )}
              </li>
            </FadeIn>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="container mt-24" aria-labelledby="features-title">
        <h2 id="features-title" className="text-center text-3xl font-bold sm:text-4xl">{t("landing.featuresTitle")}</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="h-full rounded-2xl border bg-card p-6 shadow-soft">
                <f.icon className="size-6 text-accent" aria-hidden />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mt-24" aria-labelledby="cat-title">
        <h2 id="cat-title" className="text-2xl font-bold sm:text-3xl">{t("landing.categoriesTitle")}</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/map?category=${c.slug}`} className="flex h-full items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
                  <DynamicIcon name={c.icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{categoryName(c, locale)}</span>
                  <span className="text-xs text-muted-foreground">{n(c._count.requests)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Roles */}
      <section className="container mt-24" aria-labelledby="roles-title">
        <h2 id="roles-title" className="text-2xl font-bold sm:text-3xl">{t("landing.rolesTitle")}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MessageCircle, role: t("roles.USER"), text: t("landing.roleUser") },
            { icon: HandHeart, role: t("roles.VOLUNTEER"), text: t("landing.roleVolunteer") },
            { icon: Users, role: t("roles.ORGANIZATION"), text: t("landing.roleOrganization") },
            { icon: ShieldCheck, role: t("roles.ADMIN"), text: t("landing.roleAdmin") },
          ].map((r) => (
            <div key={r.role} className="rounded-2xl bg-primary-soft/70 p-5">
              <r.icon className="size-6 text-primary" aria-hidden />
              <h3 className="mt-3 font-semibold">{r.role}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard + campaigns */}
      <section className="container mt-24 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-bold">{t("landing.leaderboardTitle")}</h2>
          <ol className="mt-4 grid gap-3">
            {leaders.map((l) => (
              <li key={l.userId}>
                <Link href={`/volunteers/${l.userId}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary">
                  <span className="w-5 text-center text-sm font-bold text-muted-foreground">{l.rank}</span>
                  <Avatar name={l.name} src={l.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{t("achievements.helps", { count: l.completedCount })} · {t("common.hours", { value: l.hoursTotal })}</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden /> {l.ratingAvg.toFixed(1)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold">{t("landing.campaignsTitle")}</h2>
            <Link href="/campaigns" className="text-sm font-semibold text-primary hover:underline">{t("common.viewAll")}</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {campaigns.items.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.slug}`} className="group rounded-2xl border bg-card p-4 shadow-soft transition hover:shadow-lift">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold group-hover:text-primary">{c.title}</p>
                  <Badge variant="success">{t("campaigns.active")}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{t("campaigns.by", { name: c.organization.name })}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" aria-hidden /> {c._count.participants}</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" aria-hidden /> {t("campaigns.progress", { done: c.completedHelps, goal: c.goalHelps })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mt-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <h2 className="relative text-3xl font-bold sm:text-4xl">{t("landing.ctaTitle")}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">{t("landing.ctaText")}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link href="/auth/register?role=VOLUNTEER">{t("landing.ctaVolunteer")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link href="/dashboard/requests/create">{t("landing.ctaHelp")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
