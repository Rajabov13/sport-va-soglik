import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { RequestForm } from "@/features/requests/request-form";
import { getT } from "@/i18n/server";
import { requireRole } from "@/server/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("requests.createTitle") };
}

export default async function CreateRequestPage() {
  await requireRole(["USER", "ORGANIZATION", "ADMIN"], "/dashboard/requests/create");
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("requests.createTitle")} subtitle={t("requests.createSubtitle")} />
      <RequestForm />
    </div>
  );
}
