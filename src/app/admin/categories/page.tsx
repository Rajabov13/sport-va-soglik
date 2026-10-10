import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CategoriesManager } from "@/features/admin/categories-manager";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("admin.categoriesTitle") };
}

export default async function AdminCategoriesPage() {
  const t = await getT();
  return (
    <>
      <PageHeader title={t("admin.categoriesTitle")} />
      <CategoriesManager />
    </>
  );
}
