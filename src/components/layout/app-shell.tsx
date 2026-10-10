"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useSession } from "@/components/shared/session";
import { useI18n } from "@/i18n/provider";
import { useSummary } from "@/hooks/use-summary";
import { cn } from "@/lib/utils";
import { bottomNavForRole, navForRole, type NavItem } from "./nav-config";
import { UserMenu } from "./user-menu";

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function CountBadge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-accent-foreground", className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useSession();
  const { t } = useI18n();
  const pathname = usePathname();
  const { data } = useSummary(!!user);
  if (!user) return null;
  return (
    <nav className="flex flex-col gap-6" aria-label={t("common.menu")}>
      {navForRole(user.role).map((section, i) => (
        <div key={i} className="flex flex-col gap-1">
          {section.title && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t(section.title)}</p>}
          {section.items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/80 hover:bg-secondary",
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                <span className="truncate">{t(item.label)}</span>
                {item.badge && <CountBadge count={data?.[item.badge]} />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function BottomNav() {
  const { user } = useSession();
  const { t } = useI18n();
  const pathname = usePathname();
  const { data } = useSummary(!!user);
  if (!user) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur lg:hidden" aria-label={t("common.menu")}>
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {bottomNavForRole(user.role).map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          const count = item.badge ? data?.[item.badge] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={t(item.label)}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium", active ? "text-primary" : "text-muted-foreground")}
              >
                {item.primary ? (
                  <span className="-mt-6 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift ring-4 ring-background">
                    <Icon className="size-5" aria-hidden />
                  </span>
                ) : (
                  <Icon className="size-5" aria-hidden />
                )}
                <span className="max-w-full truncate px-0.5">{t(item.label)}</span>
                {!!count && <span className="absolute right-[22%] top-2 size-2.5 rounded-full bg-accent ring-2 ring-card" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const { user } = useSession();
  const { data } = useSummary(!!user);
  const home = user?.role === "ADMIN" ? "/admin" : user?.role === "VOLUNTEER" ? "/dashboard/volunteer" : user?.role === "ORGANIZATION" ? "/dashboard/organization" : "/dashboard";

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift">
        {t("common.skipToContent")}
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card px-3 py-5 lg:flex">
        <Logo href={home} label={t("brand.name")} className="mb-6 px-3" />
        <div className="flex-1 overflow-y-auto pr-1">
          <SidebarNav />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("common.openMenu")}>
                <Menu className="size-5" />
              </Button>
            </DialogTrigger>
            <SheetContent closeLabel={t("common.close")}>
              <DialogTitle className="sr-only">{t("common.menu")}</DialogTitle>
              <Logo href={home} label={t("brand.name")} className="mb-4 px-2" />
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Dialog>
          <Logo href={home} label={t("brand.name")} className="lg:hidden [&>span]:hidden min-[380px]:[&>span]:inline" />
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/dashboard/notifications" aria-label={t("notifications.open")}>
                <Bell className="size-5" />
                {!!data?.notifications && (
                  <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-white">
                    {data.notifications > 9 ? "9+" : data.notifications}
                  </span>
                )}
              </Link>
            </Button>
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
