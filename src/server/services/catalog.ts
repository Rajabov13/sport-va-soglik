import { unstable_cache } from "next/cache";
import { db } from "@/server/db";

async function loadCategories() {
  return db.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } });
}

async function loadLocations() {
  return db.location.findMany({ orderBy: { city: "asc" } });
}

export const getCategories = process.env.VITEST ? loadCategories : unstable_cache(loadCategories, ["categories"], { revalidate: 60, tags: ["categories"] });
export const getLocations = process.env.VITEST ? loadLocations : unstable_cache(loadLocations, ["locations"], { revalidate: 3600, tags: ["locations"] });
