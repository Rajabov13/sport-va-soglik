import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/components/shared/session";
import { requireRole } from "@/server/auth/current-user";
import { toClientUser } from "@/server/auth/client-user";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN"], "/admin");
  return (
    <SessionProvider user={toClientUser(user)} demoMode={env.demoMode}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
