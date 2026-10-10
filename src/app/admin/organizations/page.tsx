import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { OrgsTable } from "@/features/admin/orgs-table";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("admin.organizationsTitle") };
}

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const status = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"].includes(sp.status ?? "") ? sp.status : "";
  return (
    <>
      <PageHeader title={t("admin.organizationsTitle")} />
      <OrgsTable initialStatus={status} />
    </>
  );
}
