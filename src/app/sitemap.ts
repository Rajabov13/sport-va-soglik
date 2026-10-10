import type { MetadataRoute } from "next";
import { env } from "@/config/env";
import { db } from "@/server/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl.replace(/\/$/, "");
  const staticPages = ["", "/map", "/organizations", "/campaigns", "/impact", "/auth/register"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  try {
    const [orgs, campaigns] = await Promise.all([
      db.organization.findMany({ where: { status: "VERIFIED", deletedAt: null }, select: { slug: true, updatedAt: true } }),
      db.campaign.findMany({ where: { deletedAt: null, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...staticPages,
      ...orgs.map((o) => ({ url: `${base}/organizations/${o.slug}`, lastModified: o.updatedAt })),
      ...campaigns.map((c) => ({ url: `${base}/campaigns/${c.slug}`, lastModified: c.updatedAt })),
    ];
  } catch {
    return staticPages;
  }
}
