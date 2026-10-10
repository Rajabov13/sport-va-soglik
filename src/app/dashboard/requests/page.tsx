import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { RequestList } from "@/features/requests/request-list";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/current-user";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("requests.title") };
}

export default async function RequestsPage() {
  const user = await requireUser("/dashboard/requests");
  if (user.role === "VOLUNTEER") redirect("/dashboard/volunteer/tasks");
  const t = await getT();
  return (
    <>
      <PageHeader
        title={t("requests.title")}
        subtitle={t("requests.subtitle")}
        actions={
          <Button asChild>
            <Link href="/dashboard/requests/create">
              <Plus /> {t("requests.create")}
            </Link>
          </Button>
        }
      />
      <RequestList scope="mine" />
    </>
  );
}
