import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { RequestForm } from "@/features/requests/request-form";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/current-user";
import { getRequestDetail } from "@/server/services/requests";
import { ApiError } from "@/server/http/errors";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("requests.editTitle") };
}

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/requests/${id}/edit`);
  const detail = await getRequestDetail(user, id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    redirect("/forbidden");
  });
  if (!detail.permissions.canEdit) redirect(`/dashboard/requests/${id}`);
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("requests.editTitle")} />
      <RequestForm
        initial={{
          id: detail.id,
          status: detail.status,
          title: detail.title,
          description: detail.description,
          categoryId: detail.category.id,
          urgency: detail.urgency,
          address: detail.address ?? "",
          locationId: detail.location?.id ?? null,
          latitude: detail.latitude,
          longitude: detail.longitude,
          preferredDate: detail.preferredDate?.toISOString() ?? null,
          contactPreferences: detail.contactPreferences,
          contactPhone: detail.contactPhone,
          additionalInfo: detail.additionalInfo,
          peopleCount: detail.peopleCount,
          estimatedHours: detail.estimatedHours,
          images: detail.images,
          campaignId: detail.campaign?.id ?? null,
        }}
      />
    </div>
  );
}
