"use client";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, MapPin, Star } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { CategoryChip, MatchScore, UrgencyBadge, type CategoryLike } from "@/components/shared/badges";
import { Avatar } from "@/components/ui/avatar";
import type { Urgency } from "@prisma/client";

export interface HeroRequest {
  title: string;
  city: string | null;
  urgency: Urgency;
  category: CategoryLike;
  matches: { name: string; score: number; completed: number; rating: number }[];
}

export function HeroVisual({ request }: { request: HeroRequest | null }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  if (!request) return null;
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-transparent to-accent/15 blur-2xl" aria-hidden />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="rounded-3xl border bg-card p-5 shadow-lift"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CategoryChip category={request.category} />
          <UrgencyBadge urgency={request.urgency} />
        </div>
        <p className="mt-3 text-lg font-semibold leading-snug">{request.title}</p>
        {request.city && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> {request.city}
          </p>
        )}
        <div className="mt-4 rounded-2xl bg-secondary/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("request.matching")}</p>
          <ul className="grid gap-2">
            {request.matches.map((m, i) => (
              <motion.li
                key={m.name}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.15 }}
                className="flex items-center gap-3 rounded-xl bg-card p-2.5 shadow-sm"
              >
                <Avatar name={m.name} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                    {t("request.rating", { rating: m.rating.toFixed(1), count: m.completed })}
                  </p>
                </div>
                <MatchScore score={m.score} />
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="absolute -bottom-5 -left-3 flex items-center gap-2 rounded-2xl border bg-card px-3 py-2 text-sm font-medium shadow-lift sm:-left-8"
      >
        <CheckCircle2 className="size-5 text-accent" aria-hidden />
        {t("request.bestMatch")}
      </motion.div>
    </div>
  );
}
