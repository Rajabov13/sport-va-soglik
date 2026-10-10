import type { Metadata } from "next";
import { History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { RequestGrid } from "@/features/dashboard/request-grid";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/current-user";
import { listRequests, listVolunteerTasks } from "@/server/services/requests";
import { serialize } from "@/types/serialize";
import type { RequestListItemDTO } from "@/types/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.title") };
}

export default async function HistoryPage() {
  const user = await requireUser("/dashboard/history");
  const t = await getT();
  let items: unknown[];
  if (user.role === "VOLUNTEER") {
    items = (await listVolunteerTasks(user.id, "completed")).map((a) => a.request);
  } else {
    const [completed, cancelled, rejected] = await Promise.all(
      (["COMPLETED", "CANCELLED", "REJECTED"] as const).map((status) => listRequests(user, { scope: "mine", page: 1, pageSize: 50, sort: "newest", status })),
    );
    items = [...completed.items, ...cancelled.items, ...rejected.items];
  }
  return (
    <>
      <PageHeader title={t("history.title")} subtitle={t("history.subtitle")} />
      {items.length === 0 ? (
        <EmptyState icon={<History />} title={t("history.empty")} text={t("history.emptyText")} />
      ) : (
        <RequestGrid items={serialize(items) as unknown as RequestListItemDTO[]} />
      )}
    </>
  );
}
