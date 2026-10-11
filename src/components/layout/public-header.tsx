"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Logo } from "@/components/shared/logo";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { InstallButton } from "@/components/shared/install-button";
import { useSession } from "@/components/shared/session";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/map", label: "nav.map" },
  { href: "/campaigns", label: "nav.campaigns" },
  { href: "/organizations", label: "nav.organizations" },
  { href: "/impact", label: "nav.impact" },
] as const;

export function PublicHeader() {
  const { t } = useI18n();
  const { user } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const dashboard = user?.role === "ADMIN" ? "/admin" : user?.role === "VOLUNTEER" ? "/dashboard/volunteer" : user?.role === "ORGANIZATION" ? "/dashboard/organization" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        {t("common.skipToContent")}
      </a>
      <div className="container flex h-16 items-center gap-4">
        <Logo label={t("brand.name")} />
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label={t("common.menu")}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className={cn("rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition hover:bg-secondary hover:text-foreground", pathname.startsWith(l.href) && "text-primary")}
            >
              {t(l.label)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <InstallButton />
          <LanguageSwitcher />
          {user ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href={dashboard}>{t("nav.dashboard")}</Link>
              </Button>
              <UserMenu />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/auth/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/auth/register">{t("nav.register")}</Link>
              </Button>
            </>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("common.openMenu")}>
                <Menu className="size-5" />
              </Button>
            </DialogTrigger>
            <SheetContent closeLabel={t("common.close")}>
              <DialogTitle className="sr-only">{t("common.menu")}</DialogTitle>
              <Logo label={t("brand.name")} className="mb-4 px-2" />
              <nav className="flex flex-col gap-1">
                {LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-secondary">
                    {t(l.label)}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto grid gap-2 pt-6">
                {user ? (
                  <Button asChild>
                    <Link href={dashboard} onClick={() => setOpen(false)}>{t("nav.dashboard")}</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline">
                      <Link href="/auth/login" onClick={() => setOpen(false)}>{t("nav.login")}</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/auth/register" onClick={() => setOpen(false)}>{t("nav.register")}</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
