"use client";
import * as React from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

export interface LegendItem {
  label: string;
  color: string;
  shape?: "rect" | "line";
}

export interface TableSpec {
  columns: string[];
  rows: (string | number)[][];
}

/** Chart container with legend and an accessible table view (values never gated behind hover). */
export function ChartCard({ title, legend, table, empty, children, className }: { title: string; legend?: LegendItem[]; table: TableSpec; empty?: boolean; children: React.ReactNode; className?: string }) {
  const { t } = useI18n();
  const [showTable, setShowTable] = React.useState(false);
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {legend && legend.length > 1 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {legend.map((l) => (
                <li key={l.label} className="flex items-center gap-1.5">
                  <span aria-hidden className={l.shape === "line" ? "h-0.5 w-3 rounded" : "size-2.5 rounded-sm"} style={{ backgroundColor: l.color }} />
                  {l.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          aria-pressed={showTable}
          aria-label={showTable ? t("impact.showChart") : t("impact.showTable")}
          onClick={() => setShowTable((s) => !s)}
        >
          {showTable ? <BarChart3 /> : <Table2 />}
        </Button>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">{t("impact.noData")}</p>
        ) : showTable ? (
          <div className="max-h-[260px] overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary text-left text-xs text-muted-foreground">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    {r.map((cell, j) => (
                      <td key={j} className={`px-3 py-1.5 ${j > 0 ? "tabular-nums" : ""}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[240px] w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
