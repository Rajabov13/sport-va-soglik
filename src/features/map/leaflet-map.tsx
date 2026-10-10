"use client";
import "leaflet/dist/leaflet.css";
import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { mapConfig } from "@/config/map";

export type MarkerKind = "request" | "volunteer" | "organization" | "picked";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
  color?: string;
  ring?: string;
  label: string;
  popup?: React.ReactNode;
}

const KIND_COLOR: Record<MarkerKind, string> = {
  request: "#3236a8",
  volunteer: "#16a34a",
  organization: "#d97706",
  picked: "#dc2626",
};

const iconCache = new Map<string, L.DivIcon>();
function markerIcon(kind: MarkerKind, color?: string, ring?: string) {
  const key = `${kind}-${color}-${ring}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const fill = color ?? KIND_COLOR[kind];
  const size = kind === "volunteer" ? 18 : 28;
  const html =
    kind === "volunteer"
      ? `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></span>`
      : kind === "organization"
        ? `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:8px;background:${fill};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);color:#fff;font:700 12px system-ui">★</span>`
        : `<span style="display:block;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${fill};border:3px solid ${ring ?? "#fff"};box-shadow:0 3px 10px rgba(0,0,0,.3)"></span>`;
  const icon = L.divIcon({
    className: "qollab-marker",
    html,
    iconSize: [size, size],
    iconAnchor: kind === "volunteer" || kind === "organization" ? [size / 2, size / 2] : [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
  iconCache.set(key, icon);
  return icon;
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ViewController({ center, zoom, fitBounds }: { center: [number, number]; zoom: number; fitBounds?: [number, number][] }) {
  const map = useMap();
  const boundsKey = fitBounds ? JSON.stringify(fitBounds) : "";
  React.useEffect(() => {
    if (fitBounds && fitBounds.length > 1) map.fitBounds(fitBounds, { padding: [40, 40], maxZoom: 13 });
    else map.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom, boundsKey, map]);
  React.useEffect(() => {
    // Fix grey tiles after layout changes (tabs, sheets, orientation changes).
    const id = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

export interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMapClick?: (lat: number, lng: number) => void;
  fitBounds?: [number, number][];
  className?: string;
  ariaLabel: string;
  scrollWheelZoom?: boolean;
}

export default function LeafletMap({ center, zoom = 12, markers = [], onMapClick, fitBounds, className, ariaLabel, scrollWheelZoom = true }: LeafletMapProps) {
  return (
    <div className={className} role="region" aria-label={ariaLabel}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={scrollWheelZoom} className="size-full rounded-[inherit]" attributionControl>
        <TileLayer url={mapConfig.tileUrl} attribution={mapConfig.attribution} maxZoom={mapConfig.maxZoom} />
        <ViewController center={center} zoom={zoom} fitBounds={fitBounds} />
        <ClickHandler onClick={onMapClick} />
        {markers.map((m) => (
          <Marker key={`${m.kind}-${m.id}`} position={[m.lat, m.lng]} icon={markerIcon(m.kind, m.color, m.ring)} title={m.label} alt={m.label} keyboard>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
