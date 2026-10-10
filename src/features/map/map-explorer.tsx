"use client";
import * as React from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Crosshair, Info, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { Urgency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryChip, UrgencyBadge, StatusBadge, type CategoryLike } from "@/components/shared/badges";
import { useI18n } from "@/i18n/provider";
import { api, qs } from "@/lib/api-client";
import { categoryName } from "@/lib/format";
import { DEFAULT_CENTER } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/use-catalog";
import { URGENCIES } from "@/schemas/request";
import { DynamicMap, type MapMarker } from "./dynamic-map";

interface MapData {
  requests: { id: string; title: string; status: "VERIFIED" | "MATCHING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED"; urgency: Urgency; latitude: number; longitude: number; city: string | null; peopleCount: number; category: CategoryLike }[];
  volunteers: { id: string; name: string; latitude: number; longitude: number; completedCount: number; ratingAvg: number }[];
  organizations: { id: string; slug: string; name: string; latitude: number; longitude: number; city: string | null; type: string }[];
}

const URGENCY_RING: Record<Urgency, string> = { LOW: "#ffffff", MEDIUM: "#ffffff", HIGH: "#f59e0b", CRITICAL: "#dc2626" };

export function MapExplorer({ initialCategory }: { initialCategory?: string }) {
  const { t, locale } = useI18n();
  const { data: categories } = useCategories();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [layers, setLayers] = React.useState({ requests: true, volunteers: true, organizations: true });
  const [category, setCategory] = React.useState(initialCategory ?? "");
  const [urgency, setUrgency] = React.useState("");
  const [status, setStatus] = React.useState<"open" | "active" | "completed" | "all">("open");
  const [radiusKm, setRadiusKm] = React.useState("");
  const [center, setCenter] = React.useState<[number, number]>([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]);
  const [locating, setLocating] = React.useState(false);
  const [zoom, setZoom] = React.useState(11);

  const params = {
    category,
    urgency,
    status,
    layers: Object.entries(layers).filter(([, v]) => v).map(([k]) => k).join(",") || "none",
    lat: radiusKm ? center[0] : undefined,
    lng: radiusKm ? center[1] : undefined,
    radiusKm: radiusKm || undefined,
  };
  const query = useQuery({ queryKey: ["map", params], queryFn: () => api.get<MapData>(`/api/map${qs(params)}`), placeholderData: keepPreviousData });
  const data = query.data;

  const markers: MapMarker[] = React.useMemo(() => {
    if (!data) return [];
    return [
      ...data.organizations.map((o) => ({
        id: o.id,
        lat: o.latitude,
        lng: o.longitude,
        kind: "organization" as const,
        label: o.name,
        popup: (
          <div className="grid min-w-[180px] gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t("map.layerOrganizations")}</p>
            <p className="font-semibold">{o.name}</p>
            {o.city && <p className="text-xs text-muted-foreground">{o.city}</p>}
            <Link href={`/organizations/${o.slug}`} className="text-sm font-semibold text-primary">
              {t("map.viewOrganization")} →
            </Link>
          </div>
        ),
      })),
      ...data.volunteers.map((v) => ({
        id: v.id,
        lat: v.latitude,
        lng: v.longitude,
        kind: "volunteer" as const,
        label: v.name,
        popup: (
          <div className="grid min-w-[160px] gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t("map.layerVolunteers")}</p>
            <Link href={`/volunteers/${v.id}`} className="font-semibold text-foreground">
              {t("map.volunteerPopup", { name: v.name, count: v.completedCount })}
            </Link>
          </div>
        ),
      })),
      ...data.requests.map((r) => ({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        kind: "request" as const,
        color: r.category.color,
        ring: URGENCY_RING[r.urgency],
        label: r.title,
        popup: (
          <div className="grid min-w-[200px] max-w-[240px] gap-2">
            <CategoryChip category={r.category} />
            <p className="font-semibold leading-snug">{r.title}</p>
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={r.status} />
              <UrgencyBadge urgency={r.urgency} />
            </div>
            <p className="text-xs text-muted-foreground">
              {r.city} · {t("common.people", { value: r.peopleCount })}
            </p>
            <Link href={`/dashboard/requests/${r.id}`} className="text-sm font-semibold text-primary">
              {t("map.viewRequest")} →
            </Link>
          </div>
        ),
      })),
    ];
  }, [data, t]);

  const locate = () => {
    if (!navigator.geolocation) return toast.error(t("map.geoDenied"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setCenter([p.coords.latitude, p.coords.longitude]);
        setZoom(13);
        if (!radiusKm) setRadiusKm("10");
      },
      () => {
        setLocating(false);
        toast.error(t("map.geoDenied"));
      },
      { timeout: 10000 },
    );
  };

  const filters = (
    <div className="grid gap-3">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("map.layers")}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["requests", t("map.layerRequests"), "bg-primary"],
              ["volunteers", t("map.layerVolunteers"), "bg-accent"],
              ["organizations", t("map.layerOrganizations"), "bg-amber-600"],
            ] as const
          ).map(([key, label, dot]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
              <Checkbox checked={layers[key]} onCheckedChange={(v) => setLayers((s) => ({ ...s, [key]: v === true }))} />
              <span className={cn("size-2.5 rounded-full", dot)} aria-hidden />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <NativeSelect aria-label={t("requests.fieldCategory")} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t("requests.fieldCategory")}: {t("common.all")}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {categoryName(c, locale)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label={t("requests.fieldUrgency")} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option value="">{t("requests.fieldUrgency")}: {t("common.all")}</option>
          {URGENCIES.map((u) => (
            <option key={u} value={u}>
              {t(`urgency.${u}`)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label={t("common.status")} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="open">{t("map.statusOpen")}</option>
          <option value="active">{t("map.statusActive")}</option>
          <option value="completed">{t("map.statusCompleted")}</option>
          <option value="all">{t("map.statusAll")}</option>
        </NativeSelect>
        <NativeSelect aria-label={t("map.distance")} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)}>
          <option value="">{t("map.anyDistance")}</option>
          {[5, 10, 25, 50, 100].map((km) => (
            <option key={km} value={km}>
              ≤ {t("common.km", { value: km })}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} aria-controls="map-filters">
          <SlidersHorizontal /> {t("common.filters")}
        </Button>
        <Button variant="soft" onClick={locate} loading={locating}>
          {!locating && <Crosshair />} {locating ? t("map.locating") : t("map.nearMe")}
        </Button>
        {data && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("map.results", { requests: data.requests.length, volunteers: data.volunteers.length, organizations: data.organizations.length })}
          </p>
        )}
      </div>
      <div id="map-filters" className={cn("rounded-2xl border bg-card p-3 shadow-soft lg:block", filtersOpen ? "block" : "hidden")}>
        {filters}
      </div>
      <div className={cn("relative h-[calc(100dvh-15rem)] min-h-[360px] overflow-hidden rounded-2xl border shadow-soft lg:h-[600px]", query.isFetching && "opacity-90")}>
        <DynamicMap ariaLabel={t("map.title")} center={center} zoom={zoom} markers={markers} className="size-full" />
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] hidden rounded-xl border bg-card/95 p-2.5 text-xs shadow-soft sm:block">
          <p className="mb-1 font-semibold">{t("map.legend")}</p>
          <p className="flex items-center gap-1.5"><span className="size-2.5 rotate-45 rounded-sm bg-primary" aria-hidden /> {t("map.layerRequests")}</p>
          <p className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent" aria-hidden /> {t("map.layerVolunteers")}</p>
          <p className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-600" aria-hidden /> {t("map.layerOrganizations")}</p>
          <p className="mt-1 flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-red-600" aria-hidden /> {t("urgency.CRITICAL")}</p>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="size-3.5" aria-hidden /> {t("map.privacy")}
      </p>
    </div>
  );
}
