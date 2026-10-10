"use client";
import { Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/provider";

export function LevelCard({ xp, level, current, needed, percent }: { xp: number; level: number; current: number; needed: number; percent: number }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-sm text-primary-foreground/80">{t("volunteer.level", { level })}</span>
        <Award className="size-5 text-accent-soft" aria-hidden />
      </div>
      <div className="text-3xl font-bold tabular-nums">
        {xp} <span className="text-base font-medium text-primary-foreground/70">{t("volunteer.xp")}</span>
      </div>
      <div className="grid gap-1.5">
        <Progress value={percent} className="bg-white/20" indicatorClassName="bg-accent" label={t("volunteer.nextLevel", { current, needed })} />
        <span className="text-xs text-primary-foreground/75">{t("volunteer.nextLevel", { current, needed })}</span>
      </div>
    </div>
  );
}
