import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { SessionProvider } from "@/components/shared/session";
import { getCurrentUser } from "@/server/auth/current-user";
import { toClientUser } from "@/server/auth/client-user";
import { getT } from "@/i18n/server";
import { env } from "@/config/env";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);
  return (
    <SessionProvider user={toClientUser(user)} demoMode={env.demoMode}>
      <PublicHeader />
      <main id="main">{children}</main>
      <PublicFooter t={t} />
    </SessionProvider>
  );
}
