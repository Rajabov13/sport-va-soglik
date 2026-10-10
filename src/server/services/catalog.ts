import { db } from "@/server/db";

/** Reference data. These tables are tiny and indexed, so they are read directly (always consistent after admin edits or re-seeding). */
export function getCategories() {
  return db.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } });
}

export function getLocations() {
  return db.location.findMany({ orderBy: { city: "asc" } });
}
