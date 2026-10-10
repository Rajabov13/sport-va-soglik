"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ConversationDTO } from "./types";

export function useConversations() {
  return useQuery({ queryKey: ["conversations"], queryFn: () => api.get<ConversationDTO[]>("/api/conversations"), refetchInterval: 10_000 });
}

export function ConversationList({ activeId }: { activeId: string | null }) {
  const { t, locale } = useI18n();
  const query = useConversations();
  if (query.isPending) return <CardListSkeleton count={4} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (query.data.length === 0) return <EmptyState icon={<MessageCircle />} title={t("messages.empty")} text={t("messages.emptyText")} />;
  return (
    <ul className="grid gap-1" aria-label={t("messages.title")}>
      {query.data.map((c) => {
        const other = c.others[0];
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <Link
              href={`/dashboard/messages?c=${c.id}`}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={cn("flex items-center gap-3 rounded-xl p-3 transition", active ? "bg-primary-soft" : "hover:bg-secondary")}
            >
              <Avatar name={other?.name ?? "?"} src={other?.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{other?.name ?? "—"}</span>
                  {c.lastMessageAt && <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(locale, c.lastMessageAt)}</span>}
                </span>
                {c.request && <span className="block truncate text-xs text-primary">{c.request.title}</span>}
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-xs", c.unread ? "font-semibold text-foreground" : "text-muted-foreground")}>{c.lastMessage?.body || "📷"}</span>
                  {c.unread > 0 && <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-white">{c.unread}</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
