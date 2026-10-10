import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { MapExplorer } from "@/features/map/map-explorer";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("map.title"), description: t("map.subtitle") };
}

export default async function MapPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [t, sp] = await Promise.all([getT(), searchParams]);
  return (
    <div className="container py-6 sm:py-10">
      <PageHeader title={t("map.title")} subtitle={t("map.subtitle")} className="mb-4" />
      <MapExplorer initialCategory={typeof sp.category === "string" ? sp.category.slice(0, 40) : undefined} />
    </div>
  );
}
