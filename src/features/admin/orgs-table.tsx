"use client";
import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Ban, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounce";
import { AdminToolbar } from "./admin-toolbar";
import { useAdminAction, useAdminList } from "./use-admin";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  description: string;
  createdAt: string;
  owner: { name: string; email: string };
  location: { city: string } | null;
  _count: { campaigns: number; requests: number; members: number };
}

const VARIANT = { PENDING: "warning", VERIFIED: "success", REJECTED: "danger", SUSPENDED: "danger" } as const;

export function OrgsTable({ initialStatus = "" }: { initialStatus?: string }) {
  const { t, locale } = useI18n();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState(initialStatus);
  const [page, setPage] = React.useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<OrgRow>("orgs", "/api/admin/organizations", { q: dq, status, page, pageSize: 12 });
  const action = useAdminAction("orgs");
  const run = (o: OrgRow, a: "verify" | "reject" | "suspend") => action.mutate({ url: `/api/admin/organizations/${o.id}`, body: { action: a } });

  return (
    <div className="grid gap-4">
      <AdminToolbar q={q} onQ={(v) => { setQ(v); setPage(1); }} placeholder={t("admin.searchOrgs")}>
        <NativeSelect aria-label={t("common.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const).map((s) => (
            <option key={s} value={s}>{t(`admin.orgStatus.${s}`)}</option>
          ))}
        </NativeSelect>
      </AdminToolbar>
      {list.isPending ? (
        <CardListSkeleton count={3} />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={t("common.noResults")} />
      ) : (
        <div className={list.isPlaceholderData ? "opacity-60" : ""}>
          <ul className="grid gap-3 md:grid-cols-2">
            {list.data.items.map((o) => (
              <li key={o.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {o.status === "VERIFIED" ? (
                      <Link href={`/organizations/${o.slug}`} className="font-semibold hover:text-primary">{o.name}</Link>
                    ) : (
                      <p className="font-semibold">{o.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{o.type} · {o.location?.city ?? "—"} · {formatDate(locale, o.createdAt)}</p>
                  </div>
                  <Badge variant={VARIANT[o.status]}>{t(`admin.orgStatus.${o.status}`)}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{o.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.owner")}: {o.owner.name} · {o.owner.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("organizations.campaigns", { count: o._count.campaigns })} · {t("campaigns.requests", { count: o._count.requests })} · {t("organizations.members", { count: o._count.members })}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
                  {o.status !== "VERIFIED" && (
                    <Button size="sm" variant="accent" onClick={() => run(o, "verify")} disabled={action.isPending}>
                      <BadgeCheck /> {t("admin.verify")}
                    </Button>
                  )}
                  {o.status === "PENDING" && (
                    <Button size="sm" variant="outline" onClick={() => run(o, "reject")} disabled={action.isPending}>
                      <X /> {t("admin.reject")}
                    </Button>
                  )}
                  {o.status === "VERIFIED" && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => run(o, "suspend")} disabled={action.isPending}>
                      <Ban /> {t("admin.suspend")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={list.data.totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
