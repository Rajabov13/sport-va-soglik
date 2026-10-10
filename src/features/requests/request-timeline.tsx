"use client";
import { Check, X } from "lucide-react";
import type { RequestStatus } from "@prisma/client";
import { useI18n } from "@/i18n/provider";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS: RequestStatus[] = ["PENDING", "VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

export function RequestTimeline({ status, timeline }: { status: RequestStatus; timeline: { status: RequestStatus; at: string; note: string | null }[] }) {
  const { t, locale } = useI18n();
  const terminalBad = status === "CANCELLED" || status === "REJECTED";
  const reached = new Map<RequestStatus, string>();
  for (const h of timeline) reached.set(h.status, h.at);
  const currentIndex = status === "DRAFT" ? -1 : STEPS.indexOf(status);
  const lastReachedIndex = terminalBad ? Math.max(...STEPS.map((s, i) => (reached.has(s) ? i : -1))) : currentIndex;

  return (
    <ol className="grid gap-0" aria-label={t("request.timeline")}>
      {STEPS.map((s, i) => {
        const done = i < lastReachedIndex || (i === lastReachedIndex && (s === "COMPLETED" || terminalBad));
        const current = !terminalBad && i === currentIndex && s !== "COMPLETED";
        const at = reached.get(s);
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
            {i < STEPS.length - 1 && <span className={cn("absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5", i < lastReachedIndex ? "bg-accent" : "bg-border")} aria-hidden />}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                done ? "border-accent bg-accent text-white" : current ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              {current && <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-primary" aria-hidden />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-sm font-medium", !done && !current && "text-muted-foreground")}>{t(`status.${s}`)}</p>
              {at && <p className="text-xs text-muted-foreground">{formatDateTime(locale, at)}</p>}
            </div>
          </li>
        );
      })}
      {terminalBad && (
        <li className="relative mt-3 flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive text-white">
            <X className="size-3.5" strokeWidth={3} />
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-medium text-destructive">{t(`status.${status}`)}</p>
            {reached.get(status) && <p className="text-xs text-muted-foreground">{formatDateTime(locale, reached.get(status)!)}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}
