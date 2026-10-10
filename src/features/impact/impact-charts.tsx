"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n/provider";
import { categoryName, formatDate } from "@/lib/format";
import type { ChartData } from "@/server/services/stats";
import { ChartCard } from "./chart-card";
import { ChartTooltip } from "./chart-tooltip";
import { chartTheme as c } from "./chart-theme";

const axisProps = { stroke: c.axis, fontSize: 11, tickLine: false, axisLine: false } as const;

export function ImpactCharts({ data }: { data: ChartData }) {
  const { t, locale } = useI18n();
  const week = (w: string) => formatDate(locale, w, { day: "numeric", month: "short" });
  const created = t("impact.created");
  const completed = t("impact.completed");
  const totalOverTime = data.overTime.reduce((s, r) => s + r.created + r.completed, 0);
  const totalActivity = data.volunteerActivity.reduce((s, r) => s + r.volunteers, 0);
  const categories = data.categories.map((x) => ({ name: categoryName(x, locale), count: x.count }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title={t("impact.chartOverTime")}
        className="lg:col-span-2"
        empty={totalOverTime === 0}
        legend={[
          { label: created, color: c.series1, shape: "line" },
          { label: completed, color: c.series2, shape: "line" },
        ]}
        table={{ columns: [t("admin.weeks"), created, completed], rows: data.overTime.map((r) => [week(r.week), r.created, r.completed]) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.overTime} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={1} />
            <XAxis dataKey="week" tickFormatter={week} {...axisProps} minTickGap={24} />
            <YAxis allowDecimals={false} {...axisProps} width={36} />
            <Tooltip cursor={{ stroke: c.axis, strokeWidth: 1 }} content={<ChartTooltip labelFormatter={(l) => week(String(l))} />} />
            <Area type="monotone" name={created} dataKey="created" stroke={c.series1} strokeWidth={2} fill={c.series1} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }} />
            <Area type="monotone" name={completed} dataKey="completed" stroke={c.series2} strokeWidth={2} fill={c.series2} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={t("impact.chartActivity")}
        empty={totalActivity === 0}
        table={{ columns: [t("admin.weeks"), t("impact.volunteers"), t("impact.hours")], rows: data.volunteerActivity.map((r) => [week(r.week), r.volunteers, r.hours]) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.volunteerActivity} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="week" tickFormatter={week} {...axisProps} minTickGap={16} />
            <YAxis allowDecimals={false} {...axisProps} width={36} />
            <Tooltip
              cursor={{ fill: "rgba(79,91,213,0.06)" }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => week(String(l))}
                  extra={(l) => {
                    const row = data.volunteerActivity.find((r) => r.week === l);
                    return row ? `${t("impact.hours")}: ${row.hours}` : null;
                  }}
                />
              }
            />
            <Bar dataKey="volunteers" name={t("impact.volunteers")} fill={c.series1} maxBarSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={t("impact.chartCategories")}
        empty={categories.length === 0}
        table={{ columns: [t("requests.fieldCategory"), t("impact.requests")], rows: categories.map((r) => [r.name, r.count]) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barCategoryGap={4}>
            <CartesianGrid horizontal={false} stroke={c.grid} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="name" {...axisProps} width={112} tick={{ fill: c.textSecondary, fontSize: 11 }} />
            <Tooltip cursor={{ fill: "rgba(79,91,213,0.06)" }} content={<ChartTooltip />} />
            <Bar dataKey="count" name={t("impact.requests")} fill={c.series1} maxBarSize={18} radius={[0, 4, 4, 0]} label={{ position: "right", fill: c.textSecondary, fontSize: 11 }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={t("impact.chartGeo")}
        className="lg:col-span-2"
        empty={data.geography.length === 0}
        legend={[
          { label: t("impact.requests"), color: c.series1 },
          { label: completed, color: c.series2 },
        ]}
        table={{ columns: [t("requests.fieldCity"), t("impact.requests"), completed], rows: data.geography.map((g) => [g.city, g.requests, g.completed]) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.geography} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="city" {...axisProps} interval={0} tick={{ fill: c.textSecondary, fontSize: 10 }} />
            <YAxis allowDecimals={false} {...axisProps} width={36} />
            <Tooltip cursor={{ fill: "rgba(79,91,213,0.06)" }} content={<ChartTooltip />} />
            <Bar dataKey="requests" name={t("impact.requests")} fill={c.series1} maxBarSize={20} radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name={completed} fill={c.series2} maxBarSize={20} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
