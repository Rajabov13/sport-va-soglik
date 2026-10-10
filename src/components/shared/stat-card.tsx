import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, icon, hint, tone = "primary", className }: { label: string; value: React.ReactNode; icon?: React.ReactNode; hint?: React.ReactNode; tone?: "primary" | "accent" | "amber" | "rose" | "slate"; className?: string }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-secondary text-secondary-foreground",
  };
  return (
    <div className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
        {icon && <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", tones[tone])}>{icon}</span>}
      </div>
      <div className="truncate text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
