"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronDown, Crown, Sparkles, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchScore } from "@/components/shared/badges";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { WEIGHTS, matchQuality } from "@/server/services/matching/rule-based";
import type { MatchBreakdownDTO } from "@/types/api";

const PARTS = [
  { key: "location", label: "request.scoreLocation" },
  { key: "skill", label: "request.scoreSkill" },
  { key: "availability", label: "request.scoreAvailability" },
  { key: "urgency", label: "request.scoreUrgency" },
  { key: "experience", label: "request.scoreExperience" },
  { key: "reputation", label: "request.scoreReputation" },
] as const;

const QUALITY_LABEL = { excellent: "request.qualityExcellent", good: "request.qualityGood", fair: "request.qualityFair", low: "request.qualityLow" } as const;

export function ScoreBreakdown({ breakdown }: { breakdown: MatchBreakdownDTO }) {
  const { t } = useI18n();
  return (
    <dl className="grid gap-2.5">
      {PARTS.map((p) => {
        const value = breakdown[p.key];
        const max = WEIGHTS[p.key];
        return (
          <div key={p.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <dt className="text-xs text-muted-foreground">
              {t(p.label)}
              {p.key === "location" && <span className="ml-1">· {t("request.distance", { value: breakdown.distanceKm })}</span>}
            </dt>
            <dd className="text-xs font-semibold tabular-nums">
              {value} / {max}
            </dd>
            <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </dl>
  );
}

export interface MatchRow {
  volunteerId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  rank: number;
  breakdown: MatchBreakdownDTO;
  completedCount: number;
  ratingAvg: number;
}

export function MatchPanel({ matches }: { matches: MatchRow[] }) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState<string | null>(matches[0]?.volunteerId ?? null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden /> {t("request.matching")}
        </CardTitle>
        <CardDescription>{t("request.matchingSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">{t("request.noMatches")}</p>
        ) : (
          <ul className="grid gap-2" data-testid="match-list">
            {matches.map((m, i) => {
              const expanded = open === m.volunteerId;
              const quality = matchQuality(m.score);
              return (
                <li key={m.volunteerId} className={cn("rounded-xl border", i === 0 && "border-accent/40 bg-accent-soft/40")}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : m.volunteerId)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <Avatar name={m.name} src={m.avatarUrl} className="size-9" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {m.name}
                        {i === 0 && <Crown className="size-3.5 shrink-0 text-amber-500" aria-hidden />}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                        {t("request.rating", { rating: (m.ratingAvg || 0).toFixed(1), count: m.completedCount })}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <MatchScore score={m.score} />
                      <span className="hidden text-[11px] text-muted-foreground sm:block">{t(QUALITY_LABEL[quality])}</span>
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", expanded && "rotate-180")} aria-hidden />
                  </button>
                  {expanded && (
                    <div className="border-t px-3 pb-3 pt-3">
                      {i === 0 && <p className="mb-3 text-xs font-semibold text-accent">{t("request.bestMatch")}</p>}
                      <ScoreBreakdown breakdown={m.breakdown} />
                      <Link href={`/volunteers/${m.volunteerId}`} className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">
                        {t("volunteer.publicProfile")}
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
