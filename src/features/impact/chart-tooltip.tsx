"use client";
import type { TooltipProps } from "recharts";
import { chartTheme } from "./chart-theme";

/** Tooltip: values lead (strong), series names follow (secondary), keyed with a short line in the series color. */
export function ChartTooltip({ active, payload, label, labelFormatter, extra }: TooltipProps<number, string> & { extra?: (label: string) => string | null }) {
  if (!active || !payload?.length) return null;
  const heading = labelFormatter ? labelFormatter(label, payload) : label;
  const extraText = extra?.(String(label));
  return (
    <div className="min-w-[140px] rounded-xl border bg-card px-3 py-2 text-xs shadow-lift">
      <p className="mb-1.5 font-medium" style={{ color: chartTheme.textSecondary }}>
        {heading}
      </p>
      <ul className="grid gap-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 rounded" style={{ backgroundColor: p.color }} />
            <span className="text-sm font-semibold tabular-nums" style={{ color: chartTheme.textPrimary }}>
              {p.value}
            </span>
            <span style={{ color: chartTheme.textSecondary }}>{p.name}</span>
          </li>
        ))}
      </ul>
      {extraText && <p className="mt-1.5" style={{ color: chartTheme.textSecondary }}>{extraText}</p>}
    </div>
  );
}
