"use client";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { useSession } from "@/components/shared/session";

const STEPS = ["dashboard.demoStep1", "dashboard.demoStep2", "dashboard.demoStep3", "dashboard.demoStep4", "dashboard.demoStep5", "dashboard.demoStep6"] as const;

export function DemoGuide() {
  const { t } = useI18n();
  const { user, demoMode } = useSession();
  if (!demoMode || !user?.isDemo) return null;
  return (
    <section className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-4 sm:p-5" aria-labelledby="demo-guide">
      <h2 id="demo-guide" className="flex items-center gap-2 font-semibold text-primary">
        <Sparkles className="size-4" aria-hidden /> {t("dashboard.demoGuideTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.demoGuideText")}</p>
      <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
            <span>{t(s)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
