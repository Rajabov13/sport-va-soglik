"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Bell, CheckCheck, CheckCircle2, ClipboardCheck, HandHeart, Megaphone, MessageCircle, RefreshCw, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { useI18n } from "@/i18n/provider";
import { api, qs } from "@/lib/api-client";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/api";

interface NotificationDTO {
  id: string;
  type: string;
  data: Record<string, string | number>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const ICONS: Record<string, React.ElementType> = {
  NEW_MATCH: Sparkles,
  REQUEST_ACCEPTED: HandHeart,
  STATUS_CHANGED: RefreshCw,
  NEW_MESSAGE: MessageCircle,
  REQUEST_COMPLETED: CheckCircle2,
  COMPLETION_REQUESTED: ClipboardCheck,
  NEW_REVIEW: Star,
  ACHIEVEMENT_UNLOCKED: Award,
  REQUEST_MODERATED: ShieldCheck,
  ORGANIZATION_UPDATE: Megaphone,
  CAMPAIGN_UPDATE: Megaphone,
};

export function NotificationList() {
  const { t, td, locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const params = { page, pageSize: 15, unread: unreadOnly ? "1" : undefined };
  const query = useQuery({
    queryKey: ["notifications", params],
    queryFn: () => api.get<Paginated<NotificationDTO> & { unread: number }>(`/api/notifications${qs(params)}`),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  const mark = useMutation({
    mutationFn: (ids?: string[]) => api.post("/api/notifications", { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const describe = (n: NotificationDTO) => {
    const vars = { ...n.data } as Record<string, string | number>;
    let body = td(`notifications.types.${n.type}.body`, vars);
    if (n.type === "ACHIEVEMENT_UNLOCKED" && n.data.code) body = `${td(`achievements.${n.data.code}.name`)} — ${body}`;
    if ((n.type === "STATUS_CHANGED" || n.type === "REQUEST_MODERATED") && n.data.status) body = `${body} → ${td(`status.${n.data.status}`)}`;
    return { title: td(`notifications.types.${n.type}.title`, vars), body };
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-soft">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={unreadOnly} onCheckedChange={(v) => { setUnreadOnly(v); setPage(1); }} aria-label={t("notifications.unreadOnly")} />
          {t("notifications.unreadOnly")}
        </label>
        <Button variant="outline" size="sm" disabled={!query.data?.unread} loading={mark.isPending} onClick={() => mark.mutate(undefined)}>
          <CheckCheck /> {t("notifications.markAll")}
        </Button>
      </div>
      {query.isPending ? (
        <CardListSkeleton count={5} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState icon={<Bell />} title={t("notifications.empty")} text={t("notifications.emptyText")} />
      ) : (
        <>
          <ul className="grid gap-2" data-testid="notification-list">
            {query.data.items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const { title, body } = describe(n);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.readAt) mark.mutate([n.id]);
                      if (n.link) router.push(n.link);
                    }}
                    className={cn("flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-soft transition hover:shadow-lift sm:p-4", n.readAt ? "bg-card" : "border-primary/25 bg-primary-soft/40")}
                  >
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", n.readAt ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground")}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(locale, n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
                    </span>
                    {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="•" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={query.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
