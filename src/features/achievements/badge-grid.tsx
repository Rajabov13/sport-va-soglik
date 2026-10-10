"use client";
import { Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DynamicIcon } from "@/components/shared/icons";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BadgeDTO {
  code: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { value: number; target: number };
}

export function BadgeGrid({ badges, compact }: { badges: BadgeDTO[]; compact?: boolean }) {
  const { t, td, locale } = useI18n();
  return (
    <ul className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {badges.map((b) => (
        <li
          key={b.code}
          data-testid={`badge-${b.code}`}
          data-unlocked={b.unlocked}
          className={cn("flex gap-3 rounded-2xl border p-4 shadow-soft", b.unlocked ? "bg-card" : "bg-secondary/40")}
        >
          <span
            className={cn(
              "relative flex size-12 shrink-0 items-center justify-center rounded-2xl",
              b.unlocked ? "bg-gradient-to-br from-primary to-indigo-500 text-white shadow-lift" : "bg-muted text-muted-foreground",
            )}
          >
            <DynamicIcon name={b.icon} className="size-6" />
            {!b.unlocked && <Lock className="absolute -bottom-1 -right-1 size-4 rounded-full bg-card p-0.5 text-muted-foreground" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{td(`achievements.${b.code}.name`)}</p>
            {!compact && <p className="text-xs text-muted-foreground">{td(`achievements.${b.code}.description`)}</p>}
            {b.unlocked ? (
              <p className="mt-1 text-xs font-medium text-accent">{b.unlockedAt ? t("achievements.unlocked", { date: formatDate(locale, b.unlockedAt) }) : t("achievements.xpReward", { xp: b.xpReward })}</p>
            ) : (
              <div className="mt-2 grid gap-1">
                <Progress value={(b.progress.value / b.progress.target) * 100} label={td(`achievements.${b.code}.name`)} className="h-1.5" />
                <span className="text-[11px] text-muted-foreground">
                  {t("achievements.progress", { value: b.progress.value, target: b.progress.target })} · {t("achievements.xpReward", { xp: b.xpReward })}
                </span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
