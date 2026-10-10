"use client";
import Link from "next/link";
import { LogOut, Repeat, Settings, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/provider";
import { useSession } from "@/components/shared/session";
import { useAuthActions } from "@/hooks/use-auth-actions";
import type { DemoPersona } from "@/config/demo";

const PERSONAS: { persona: DemoPersona; label: "auth.demoUser" | "auth.demoVolunteer" | "auth.demoOrganization" | "auth.demoAdmin" }[] = [
  { persona: "user", label: "auth.demoUser" },
  { persona: "volunteer", label: "auth.demoVolunteer" },
  { persona: "organization", label: "auth.demoOrganization" },
  { persona: "admin", label: "auth.demoAdmin" },
];

export function UserMenu() {
  const { user, demoMode } = useSession();
  const { t } = useI18n();
  const { logout, demoLogin } = useAuthActions();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("common.profile")}>
        <Avatar name={user.name} src={user.avatarUrl} className="size-9" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs font-medium text-primary">{t(`roles.${user.role}`)}</p>
        </div>
        <DropdownMenuSeparator />
        {user.role === "VOLUNTEER" && (
          <DropdownMenuItem asChild>
            <Link href={`/volunteers/${user.id}`}>
              <UserIcon /> {t("volunteer.publicProfile")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings /> {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        {demoMode && user.isDemo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              <Repeat className="mr-1 inline size-3" /> {t("auth.switchAccount")}
            </DropdownMenuLabel>
            {PERSONAS.map((p) => (
              <DropdownMenuItem key={p.persona} onSelect={() => demoLogin(p.persona)}>
                <span className="size-2 rounded-full bg-accent" aria-hidden /> {t(p.label)}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
          <LogOut /> {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
