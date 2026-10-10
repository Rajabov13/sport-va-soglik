import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsList } from "@/features/admin/reports-list";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("admin.reportsTitle") };
}

export default async function AdminReportsPage() {
  const t = await getT();
  return (
    <>
      <PageHeader title={t("admin.reportsTitle")} />
      <ReportsList />
    </>
  );
}
