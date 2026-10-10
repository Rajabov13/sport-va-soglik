"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Leaflet touches `window`, so it is loaded client-side only. */
export const DynamicMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full min-h-[240px] rounded-[inherit]" />,
});

export type { MapMarker } from "./leaflet-map";
