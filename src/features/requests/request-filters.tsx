"use client";
import { Search, X } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { useCategories } from "@/hooks/use-catalog";
import { categoryName } from "@/lib/format";
import { REQUEST_STATUSES, URGENCIES } from "@/schemas/request";

export interface RequestFilterState {
  q: string;
  status: string;
  category: string;
  urgency: string;
  sort: "newest" | "oldest" | "urgency";
}

export const EMPTY_FILTERS: RequestFilterState = { q: "", status: "", category: "", urgency: "", sort: "newest" };

export function RequestFilters({ value, onChange, showStatus = true }: { value: RequestFilterState; onChange: (v: RequestFilterState) => void; showStatus?: boolean }) {
  const { t, locale } = useI18n();
  const { data: categories } = useCategories();
  const set = (patch: Partial<RequestFilterState>) => onChange({ ...value, ...patch });
  const active = value.q || value.status || value.category || value.urgency;
  return (
    <div className="grid gap-2 rounded-2xl border bg-card p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)_auto]">
      <label className="relative sm:col-span-2 lg:col-span-1">
        <span className="sr-only">{t("common.search")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={value.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("requests.searchPlaceholder")} className="pl-9" type="search" />
      </label>
      {showStatus && (
        <NativeSelect aria-label={t("common.status")} value={value.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </NativeSelect>
      )}
      <NativeSelect aria-label={t("requests.fieldCategory")} value={value.category} onChange={(e) => set({ category: e.target.value })}>
        <option value="">{t("requests.fieldCategory")}: {t("common.all")}</option>
        {categories?.map((c) => (
          <option key={c.id} value={c.slug}>{categoryName(c, locale)}</option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label={t("requests.fieldUrgency")} value={value.urgency} onChange={(e) => set({ urgency: e.target.value })}>
        <option value="">{t("requests.fieldUrgency")}: {t("common.all")}</option>
        {URGENCIES.map((u) => (
          <option key={u} value={u}>{t(`urgency.${u}`)}</option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label={t("common.sortBy")} value={value.sort} onChange={(e) => set({ sort: e.target.value as RequestFilterState["sort"] })}>
        <option value="newest">{t("common.newest")}</option>
        <option value="oldest">{t("common.oldest")}</option>
        <option value="urgency">{t("common.byUrgency")}</option>
      </NativeSelect>
      {active ? (
        <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)} className="sm:col-span-2 lg:col-span-1">
          <X /> {t("common.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
