"use client";
import * as React from "react";
import { Crosshair } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { DynamicMap } from "./dynamic-map";

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  center: [number, number];
  onChange: (lat: number, lng: number) => void;
  invalid?: boolean;
}

export function LocationPicker({ latitude, longitude, center, onChange, invalid }: LocationPickerProps) {
  const { t } = useI18n();
  const [locating, setLocating] = React.useState(false);
  const hasPoint = typeof latitude === "number" && typeof longitude === "number" && !Number.isNaN(latitude);
  const viewCenter: [number, number] = hasPoint ? [latitude!, longitude!] : center;

  const locate = () => {
    if (!navigator.geolocation) return toast.error(t("map.geoDenied"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)));
      },
      () => {
        setLocating(false);
        toast.error(t("map.geoDenied"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="grid gap-2">
      <div className={`relative h-64 overflow-hidden rounded-xl border sm:h-72 ${invalid ? "border-destructive ring-1 ring-destructive" : ""}`}>
        <DynamicMap
          ariaLabel={t("requests.fieldMap")}
          center={viewCenter}
          zoom={hasPoint ? 15 : 12}
          className="size-full rounded-xl"
          scrollWheelZoom={false}
          onMapClick={(lat, lng) => onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))}
          markers={hasPoint ? [{ id: "picked", lat: latitude!, lng: longitude!, kind: "picked", label: t("requests.fieldMap") }] : []}
        />
        <Button type="button" size="sm" variant="outline" onClick={locate} loading={locating} className="absolute bottom-3 right-3 z-[400] bg-card shadow-soft">
          {!locating && <Crosshair />} {locating ? t("map.locating") : t("requests.useMyLocation")}
        </Button>
      </div>
      {hasPoint && (
        <p className="text-xs tabular-nums text-muted-foreground">
          {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
        </p>
      )}
    </div>
  );
}
