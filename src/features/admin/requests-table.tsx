"use client";
import * as React from "react";
import Link from "next/link";
import { Check, Flag, RefreshCw, Trash2, X } from "lucide-react";
import type { RequestStatus, Urgency } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryChip, MatchScore, StatusBadge, UrgencyBadge, type CategoryLike } from "@/components/shared/badges";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { useI18n } from "@/i18n/provider";
import { relativeTime } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounce";
import { REQUEST_STATUSES } from "@/schemas/request";
import { AdminToolbar } from "./admin-toolbar";
import { useAdminAction, useAdminList } from "./use-admin";

interface RequestRow {
  id: string;
  title: string;
  status: RequestStatus;
  urgency: Urgency;
  moderationNote: string | null;
  createdAt: string;
  category: CategoryLike;
  location: { city: string } | null;
  requester: { id: string; name: string; email: string };
  matches: { score: number; volunteer: { name: string } }[];
  _count: { reports: number; matches: number };
}

type Action = "approve" | "reject" | "delete" | "rematch";

export function RequestsTable({ initialStatus = "" }: { initialStatus?: string }) {
  const { t, td, locale } = useI18n();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState(initialStatus);
  const [sort, setSort] = React.useState("newest");
  const [page, setPage] = React.useState(1);
  const [dialog, setDialog] = React.useState<{ row: RequestRow; action: Action } | null>(null);
  const [note, setNote] = React.useState("");
  const dq = useDebounced(q);
  const list = useAdminList<RequestRow>("requests", "/api/admin/requests", { q: dq, status, sort, page, pageSize: 12 });
  const action = useAdminAction("requests");
  const run = (row: RequestRow, a: Action, n?: string) => action.mutateAsync({ url: `/api/admin/requests/${row.id}`, body: { action: a, note: n } }).catch(() => undefined);

  return (
    <div className="grid gap-4">
      <AdminToolbar q={q} onQ={(v) => { setQ(v); setPage(1); }} placeholder={t("admin.searchRequests")}>
        <NativeSelect aria-label={t("common.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {REQUEST_STATUSES.filter((s) => s !== "DRAFT").map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label={t("common.sortBy")} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">{t("common.newest")}</option>
          <option value="oldest">{t("common.oldest")}</option>
          <option value="name">{t("common.byName")}</option>
        </NativeSelect>
      </AdminToolbar>
      {list.isPending ? (
        <CardListSkeleton count={4} />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={t("common.noResults")} />
      ) : (
        <div className={list.isPlaceholderData ? "opacity-60" : ""}>
          <ul className="grid gap-3 lg:grid-cols-2">
            {list.data.items.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft" data-testid="admin-request-row">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryChip category={r.category} />
                  <StatusBadge status={r.status} />
                  <UrgencyBadge urgency={r.urgency} />
                  {r._count.reports > 0 && (
                    <Badge variant="danger">
                      <Flag aria-hidden /> {r._count.reports}
                    </Badge>
                  )}
                </div>
                <Link href={`/dashboard/requests/${r.id}`} className="font-semibold leading-snug hover:text-primary">
                  {r.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {r.requester.name} · {r.requester.email} · {r.location?.city ?? "—"} · {relativeTime(locale, r.createdAt)}
                </p>
                {r.moderationNote && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{t("admin.flags")}:</span>
                    {r.moderationNote.split(",").map((f) => (
                      <Badge key={f} variant="warning">{td(`moderationFlags.${f}`)}</Badge>
                    ))}
                  </div>
                )}
                {r.matches[0] && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t("admin.topMatch")}: <span className="font-medium text-foreground">{r.matches[0].volunteer.name}</span> <MatchScore score={r.matches[0].score} />
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
                  {r.status === "PENDING" && (
                    <Button size="sm" variant="accent" onClick={() => run(r, "approve")} disabled={action.isPending} data-testid="admin-approve">
                      <Check /> {t("admin.approve")}
                    </Button>
                  )}
                  {["PENDING", "VERIFIED", "MATCHING"].includes(r.status) && (
                    <Button size="sm" variant="outline" onClick={() => { setNote(""); setDialog({ row: r, action: "reject" }); }}>
                      <X /> {t("admin.reject")}
                    </Button>
                  )}
                  {r.status === "MATCHING" && (
                    <Button size="sm" variant="ghost" onClick={() => run(r, "rematch")} disabled={action.isPending}>
                      <RefreshCw /> {t("admin.rematch")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDialog({ row: r, action: "delete" })}>
                    <Trash2 /> {t("admin.remove")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={list.data.totalPages} onChange={setPage} />
        </div>
      )}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{dialog?.action === "reject" ? t("admin.reject") : t("admin.confirmDelete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{dialog?.row.title}</p>
          {dialog?.action === "reject" && (
            <label className="grid gap-1.5 text-sm">
              {t("admin.reason")}
              <Textarea rows={3} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              loading={action.isPending}
              onClick={async () => {
                if (!dialog) return;
                await run(dialog.row, dialog.action, note || undefined);
                setDialog(null);
              }}
            >
              {dialog?.action === "reject" ? t("admin.reject") : t("admin.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
