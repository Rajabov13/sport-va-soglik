"use client";
import * as React from "react";
import { BadgeCheck, Ban, MoreHorizontal, Shield, Trash2, UserCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { useSession } from "@/components/shared/session";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounce";
import { AdminToolbar } from "./admin-toolbar";
import { useAdminAction, useAdminList } from "./use-admin";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  emailVerifiedAt: string | null;
  isDemo: boolean;
  volunteerProfile: { isVerified: boolean; completedCount: number } | null;
  _count: { requests: number; reportsAgainst: number };
}

const ROLES: Role[] = ["USER", "VOLUNTEER", "ORGANIZATION", "ADMIN"];

export function UsersTable({ initialRole = "" }: { initialRole?: string }) {
  const { t, locale } = useI18n();
  const { user: me } = useSession();
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState(initialRole);
  const [status, setStatus] = React.useState("");
  const [sort, setSort] = React.useState("newest");
  const [page, setPage] = React.useState(1);
  const [confirm, setConfirm] = React.useState<{ user: UserRow; action: "suspend" | "delete" | "setRole" } | null>(null);
  const [newRole, setNewRole] = React.useState<Role>("USER");
  const dq = useDebounced(q);
  const list = useAdminList<UserRow>("users", "/api/admin/users", { q: dq, role, status, sort, page, pageSize: 15 });
  const action = useAdminAction("users");
  const run = (u: UserRow, a: "suspend" | "activate" | "verify" | "delete" | "setRole", extra: Record<string, unknown> = {}) =>
    action.mutateAsync({ url: `/api/admin/users/${u.id}`, body: { action: a, ...extra } }).catch(() => undefined);

  const menu = (u: UserRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions")} disabled={u.id === me?.id}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {u.status === "ACTIVE" ? (
          <DropdownMenuItem onSelect={() => setConfirm({ user: u, action: "suspend" })}>
            <Ban /> {t("admin.suspend")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(u, "activate")}>
            <UserCheck /> {t("admin.activate")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => run(u, "verify")}>
          <BadgeCheck /> {t("admin.verify")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setNewRole(u.role);
            setConfirm({ user: u, action: "setRole" });
          }}
        >
          <Shield /> {t("admin.changeRole")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirm({ user: u, action: "delete" })}>
          <Trash2 /> {t("admin.remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const statusBadge = (u: UserRow) => <Badge variant={u.status === "ACTIVE" ? "success" : "danger"}>{u.status === "ACTIVE" ? t("admin.active") : t("admin.suspended")}</Badge>;

  return (
    <div className="grid gap-4">
      <AdminToolbar q={q} onQ={(v) => { setQ(v); setPage(1); }} placeholder={t("admin.searchUsers")}>
        <NativeSelect aria-label={t("admin.role")} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">{t("admin.role")}: {t("common.all")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{t(`roles.${r}`)}</option>
          ))}
        </NativeSelect>
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect aria-label={t("common.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t("common.status")}: {t("common.all")}</option>
            <option value="ACTIVE">{t("admin.active")}</option>
            <option value="SUSPENDED">{t("admin.suspended")}</option>
          </NativeSelect>
          <NativeSelect aria-label={t("common.sortBy")} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">{t("common.newest")}</option>
            <option value="oldest">{t("common.oldest")}</option>
            <option value="name">{t("common.byName")}</option>
          </NativeSelect>
        </div>
      </AdminToolbar>

      {list.isPending ? (
        <CardListSkeleton count={5} />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={t("common.noResults")} />
      ) : (
        <div className={list.isPlaceholderData ? "opacity-60" : ""}>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/70 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">{t("admin.name")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("admin.role")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("common.status")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("admin.joined")}</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">{t("admin.reports")}</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">{t("common.actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} className="size-8" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate font-medium">
                            {u.name}
                            {(u.emailVerifiedAt || u.volunteerProfile?.isVerified) && <BadgeCheck className="size-3.5 text-accent" aria-label={t("admin.verify")} />}
                            {u.isDemo && <Badge variant="warning" className="ml-1">{t("admin.demoBadge")}</Badge>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{t(`roles.${u.role}`)}</td>
                    <td className="px-4 py-3">{statusBadge(u)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(locale, u.createdAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u._count.reportsAgainst}</td>
                    <td className="px-2 py-3 text-right">{menu(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="grid gap-2 md:hidden">
            {list.data.items.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
                <Avatar name={u.name} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge variant="muted">{t(`roles.${u.role}`)}</Badge>
                    {statusBadge(u)}
                  </div>
                </div>
                {menu(u)}
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={list.data.totalPages} onChange={setPage} />
        </div>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{confirm?.action === "setRole" ? t("admin.changeRole") : t("admin.confirmAction")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirm?.user.name} · {confirm?.user.email}
          </p>
          {confirm?.action === "setRole" && (
            <NativeSelect aria-label={t("admin.role")} value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{t(`roles.${r}`)}</option>
              ))}
            </NativeSelect>
          )}
          {confirm?.action === "delete" && <p className="text-sm">{t("admin.confirmDelete")}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>{t("common.cancel")}</Button>
            <Button
              variant={confirm?.action === "setRole" ? "default" : "destructive"}
              loading={action.isPending}
              onClick={async () => {
                if (!confirm) return;
                await run(confirm.user, confirm.action, confirm.action === "setRole" ? { role: newRole } : {});
                setConfirm(null);
              }}
            >
              {confirm?.action === "suspend" ? t("admin.suspend") : confirm?.action === "delete" ? t("admin.remove") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
