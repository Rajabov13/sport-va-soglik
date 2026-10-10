import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/features/admin/users-table";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("admin.usersTitle") };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const role = ["USER", "VOLUNTEER", "ORGANIZATION", "ADMIN"].includes(sp.role ?? "") ? sp.role : "";
  return (
    <>
      <PageHeader title={t("admin.usersTitle")} />
      <UsersTable initialRole={role} />
    </>
  );
}
