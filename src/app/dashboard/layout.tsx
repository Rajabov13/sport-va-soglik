import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/components/shared/session";
import { requireUser } from "@/server/auth/current-user";
import { toClientUser } from "@/server/auth/client-user";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  return (
    <SessionProvider user={toClientUser(user)} demoMode={env.demoMode}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
