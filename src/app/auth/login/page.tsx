import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { getT } from "@/i18n/server";
import { env } from "@/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.login"), robots: { index: false } };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm demoMode={env.demoMode} />
    </Suspense>
  );
}
