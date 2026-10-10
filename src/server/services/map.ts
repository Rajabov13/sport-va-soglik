import type { Prisma, RequestStatus } from "@prisma/client";
import { db } from "@/server/db";
import { distanceKm } from "@/lib/geo";
import { listVolunteersForMap } from "./volunteers";

const STATUS_GROUPS: Record<string, RequestStatus[]> = {
  open: ["VERIFIED", "MATCHING"],
  active: ["ACCEPTED", "IN_PROGRESS"],
  completed: ["COMPLETED"],
  all: ["VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"],
};

export interface MapQuery {
  category?: string;
  urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "open" | "active" | "completed" | "all";
  lat?: number;
  lng?: number;
  radiusKm?: number;
  layers?: string;
}

/** Public map data. Request coordinates are coarsened (~1 km) — exact addresses are never exposed here. */
export async function getMapData(q: MapQuery) {
  const layers = new Set((q.layers ?? "requests,volunteers,organizations").split(","));
  const where: Prisma.RequestWhereInput = {
    deletedAt: null,
    status: { in: STATUS_GROUPS[q.status] },
    ...(q.category ? { category: { slug: q.category } } : {}),
    ...(q.urgency ? { urgency: q.urgency } : {}),
  };

  const [requests, volunteers, organizations] = await Promise.all([
    layers.has("requests")
      ? db.request.findMany({
          where,
          take: 500,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, title: true, status: true, urgency: true, latitude: true, longitude: true, createdAt: true, peopleCount: true,
            category: { select: { slug: true, color: true, icon: true, nameUz: true, nameRu: true, nameEn: true } },
            location: { select: { city: true } },
          },
        })
      : [],
    layers.has("volunteers") ? listVolunteersForMap() : [],
    layers.has("organizations")
      ? db.organization.findMany({
          where: { deletedAt: null, status: "VERIFIED", latitude: { not: null } },
          select: { id: true, slug: true, name: true, latitude: true, longitude: true, type: true, location: { select: { city: true } } },
        })
      : [],
  ]);

  const inRadius = (lat: number, lng: number) =>
    q.lat === undefined || q.lng === undefined || !q.radiusKm || distanceKm({ lat: q.lat, lng: q.lng }, { lat, lng }) <= q.radiusKm;

  return {
    requests: requests
      .map((r) => ({ ...r, city: r.location?.city ?? null, latitude: Math.round(r.latitude * 100) / 100, longitude: Math.round(r.longitude * 100) / 100 }))
      .filter((r) => inRadius(r.latitude, r.longitude)),
    volunteers: volunteers.filter((v) => inRadius(v.latitude, v.longitude)),
    organizations: organizations
      .map((o) => ({ ...o, city: o.location?.city ?? null, latitude: o.latitude!, longitude: o.longitude! }))
      .filter((o) => inRadius(o.latitude, o.longitude)),
  };
}
