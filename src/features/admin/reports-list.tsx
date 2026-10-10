"use client";
import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { useI18n } from "@/i18n/provider";
import { relativeTime } from "@/lib/format";
import { useAdminAction, useAdminList } from "./use-admin";

interface ReportRow {
  id: string;
  targetType: "REQUEST" | "USER" | "CONVERSATION" | "MESSAGE";
  reason: "FAKE_REQUEST" | "ABUSE" | "INAPPROPRIATE_CONTENT" | "SUSPICIOUS_USER" | "OTHER";
  details: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  resolutionNote: string | null;
  reporter: { id: string; name: string };
  reportedUser: { id: string; name: string; status: string } | null;
  request: { id: string; title: string; status: string } | null;
  message: { id: string; body: string } | null;
  resolvedBy: { name: string } | null;
}

export function ReportsList() {
  const { t, locale } = useI18n();
  const [status, setStatus] = React.useState("OPEN");
  const [page, setPage] = React.useState(1);
  const [resolving, setResolving] = React.useState<ReportRow | null>(null);
  const [note, setNote] = React.useState("");
  const [suspendUser, setSuspendUser] = React.useState(false);
  const [removeContent, setRemoveContent] = React.useState(false);
  const list = useAdminList<ReportRow>("reports", "/api/admin/reports", { status, page, pageSize: 12 });
  const action = useAdminAction("reports");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-soft">
        <NativeSelect aria-label={t("common.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-56">
          <option value="">{t("common.all")}</option>
          {(["OPEN", "RESOLVED", "DISMISSED"] as const).map((s) => (
            <option key={s} value={s}>{t(`admin.reportStatus.${s}`)}</option>
          ))}
        </NativeSelect>
      </div>
      {list.isPending ? (
        <CardListSkeleton count={3} />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={<ShieldAlert />} title={t("common.noResults")} />
      ) : (
        <div className={list.isPlaceholderData ? "opacity-60" : ""}>
          <ul className="grid gap-3 lg:grid-cols-2">
            {list.data.items.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="danger">{t(`admin.reportReason.${r.reason}`)}</Badge>
                  <Badge variant="muted">{t(`admin.reportTarget.${r.targetType}`)}</Badge>
                  <Badge variant={r.status === "OPEN" ? "warning" : r.status === "RESOLVED" ? "success" : "muted"}>{t(`admin.reportStatus.${r.status}`)}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{relativeTime(locale, r.createdAt)}</span>
                </div>
                {r.details && <p className="text-sm">{r.details}</p>}
                <dl className="grid gap-1 text-xs text-muted-foreground">
                  <div>
                    <dt className="inline font-medium">{t("admin.reporter")}: </dt>
                    <dd className="inline">{r.reporter.name}</dd>
                  </div>
                  {r.reportedUser && (
                    <div>
                      <dt className="inline font-medium">{t("admin.target")}: </dt>
                      <dd className="inline">
                        {r.reportedUser.name} {r.reportedUser.status === "SUSPENDED" && <Badge variant="danger" className="ml-1">{t("admin.suspended")}</Badge>}
                      </dd>
                    </div>
                  )}
                  {r.request && (
                    <div>
                      <dt className="inline font-medium">{t("admin.reportTarget.REQUEST")}: </dt>
                      <dd className="inline">
                        <Link href={`/dashboard/requests/${r.request.id}`} className="text-primary hover:underline">{r.request.title}</Link>
                      </dd>
                    </div>
                  )}
                  {r.message && <p className="rounded-lg bg-secondary/70 p-2 text-foreground">“{r.message.body}”</p>}
                  {r.resolutionNote && <p>{r.resolvedBy?.name}: {r.resolutionNote}</p>}
                </dl>
                {r.status === "OPEN" && (
                  <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
                    <Button size="sm" onClick={() => { setResolving(r); setNote(""); setSuspendUser(false); setRemoveContent(false); }}>
                      <CheckCircle2 /> {t("admin.resolve")}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={action.isPending} onClick={() => action.mutate({ url: `/api/admin/reports/${r.id}`, body: { action: "dismiss" } })}>
                      <XCircle /> {t("admin.dismiss")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={list.data.totalPages} onChange={setPage} />
        </div>
      )}
      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("admin.resolve")}</DialogTitle>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm">
            {t("admin.reason")}
            <Textarea rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </label>
          {resolving?.reportedUser && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={suspendUser} onCheckedChange={(v) => setSuspendUser(v === true)} /> {t("admin.suspendUser")}
            </label>
          )}
          {(resolving?.request || resolving?.message) && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={removeContent} onCheckedChange={(v) => setRemoveContent(v === true)} /> {t("admin.removeContent")}
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)}>{t("common.cancel")}</Button>
            <Button
              loading={action.isPending}
              onClick={async () => {
                if (!resolving) return;
                await action.mutateAsync({ url: `/api/admin/reports/${resolving.id}`, body: { action: "resolve", note: note || undefined, suspendUser, removeContent } }).catch(() => undefined);
                setResolving(null);
              }}
            >
              {t("admin.resolve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
