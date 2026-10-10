import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationList } from "@/features/notifications/notification-list";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("notifications.title") };
}

export default async function NotificationsPage() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("notifications.title")} subtitle={t("notifications.subtitle")} />
      <NotificationList />
    </div>
  );
}
