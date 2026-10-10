import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import type { Translator } from "@/i18n/translate";

export function PublicFooter({ t }: { t: Translator }) {
  return (
    <footer className="mt-20 border-t bg-card">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo label={t("brand.name")} />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t("brand.slogan")} {t("meta.description")}</p>
        </div>
        <nav className="grid gap-2 text-sm" aria-label={t("nav.explore")}>
          <Link className="hover:text-primary" href="/map">{t("nav.map")}</Link>
          <Link className="hover:text-primary" href="/campaigns">{t("nav.campaigns")}</Link>
          <Link className="hover:text-primary" href="/organizations">{t("nav.organizations")}</Link>
          <Link className="hover:text-primary" href="/impact">{t("nav.impact")}</Link>
        </nav>
        <nav className="grid gap-2 text-sm" aria-label={t("common.profile")}>
          <Link className="hover:text-primary" href="/auth/register">{t("landing.ctaVolunteer")}</Link>
          <Link className="hover:text-primary" href="/dashboard/requests/create">{t("landing.ctaHelp")}</Link>
          <Link className="hover:text-primary" href="/auth/login">{t("nav.login")}</Link>
        </nav>
      </div>
      <div className="border-t">
        <div className="container flex flex-col gap-1 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>{t("landing.footerRights", { year: new Date().getFullYear() })}</span>
          <span>{t("landing.footerPrivacy")}</span>
        </div>
      </div>
    </footer>
  );
}
