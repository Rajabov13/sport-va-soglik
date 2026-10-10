import { db } from "@/server/db";
import { asStringArray } from "@/lib/utils";

/** Reference data. These tables are tiny and indexed, so they are read directly (always consistent after admin edits or re-seeding). */
export async function getCategories() {
  const rows = await db.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } });
  return rows.map((c) => ({ ...c, relatedSkills: asStringArray(c.relatedSkills) }));
}

export function getLocations() {
  return db.location.findMany({ orderBy: { city: "asc" } });
}
