import Link from "next/link";
import { HandHeart, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { homeForRole } from "@/server/auth/redirects";
import { getPublicImpactStats } from "@/server/services/stats";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  const [t, stats] = await Promise.all([getT(), getPublicImpactStats()]);
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-accent/30 blur-3xl" aria-hidden />
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <HandHeart className="size-5" aria-hidden />
          </span>
          QO‘LLAB
        </Link>
        <div className="relative mt-auto max-w-md">
          <p className="text-4xl font-bold leading-tight">{t("landing.heroTitle")}</p>
          <p className="mt-4 text-primary-foreground/75">{t("brand.slogan")}</p>
          <dl className="mt-10 grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-primary-foreground/70">{t("landing.statsCompleted")}</dt>
              <dd className="text-2xl font-bold">{stats.completedRequests}</dd>
            </div>
            <div>
              <dt className="text-xs text-primary-foreground/70">{t("landing.statsVolunteers")}</dt>
              <dd className="text-2xl font-bold">{stats.activeVolunteers}</dd>
            </div>
            <div>
              <dt className="text-xs text-primary-foreground/70">{t("landing.statsHelped")}</dt>
              <dd className="text-2xl font-bold">{stats.peopleHelped}</dd>
            </div>
          </dl>
          <ul className="mt-10 grid gap-3 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-2"><Sparkles className="size-4" aria-hidden /> {t("landing.featureMatchingText")}</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4" aria-hidden /> {t("landing.featureSafetyText")}</li>
          </ul>
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Logo label={t("brand.name")} className="lg:invisible" />
          <LanguageSwitcher />
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 sm:items-center sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
