import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Translator } from "@/i18n/translate";
import type { Locale } from "@/i18n/config";
import { categoryName, formatDate } from "@/lib/format";

export interface CampaignCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string | null;
  goalHelps: number;
  goalVolunteers: number;
  completedHelps: number;
  organization: { name: string };
  category: { nameUz: string; nameRu: string; nameEn: string; color: string } | null;
  location: { city: string } | null;
  _count: { participants: number; requests: number };
}

export function CampaignCard({ c, t, locale }: { c: CampaignCardData; t: Translator; locale: Locale }) {
  const pct = Math.round((c.completedHelps / Math.max(1, c.goalHelps)) * 100);
  return (
    <Link href={`/campaigns/${c.slug}`} className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-snug">{c.title}</p>
        <Badge variant={c.status === "ACTIVE" ? "success" : "muted"} className="shrink-0">
          {c.status === "ACTIVE" ? t("campaigns.active") : t("campaigns.completed")}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{t("campaigns.by", { name: c.organization.name })}</p>
      <p className="line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
      <div className="mt-auto grid gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="font-medium">{t("campaigns.progress", { done: c.completedHelps, goal: c.goalHelps })}</span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} indicatorClassName="bg-accent" label={t("campaigns.progress", { done: c.completedHelps, goal: c.goalHelps })} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {c.category && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ backgroundColor: c.category.color }} aria-hidden /> {categoryName(c.category, locale)}
          </span>
        )}
        {c.location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden /> {c.location.city}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> {t("campaigns.volunteersGoal", { count: c._count.participants, goal: c.goalVolunteers })}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="size-3.5" aria-hidden />
          {t("campaigns.dates", { start: formatDate(locale, c.startsAt), end: c.endsAt ? formatDate(locale, c.endsAt) : t("campaigns.ongoing") })}
        </span>
      </div>
    </Link>
  );
}
