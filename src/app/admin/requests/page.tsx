import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { RequestsTable } from "@/features/admin/requests-table";
import { getT } from "@/i18n/server";
import { REQUEST_STATUSES } from "@/schemas/request";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("admin.requestsTitle") };
}

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const status = (REQUEST_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : "";
  return (
    <>
      <PageHeader title={t("admin.requestsTitle")} />
      <RequestsTable initialStatus={status} />
    </>
  );
}
