"use client";
import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { ConversationList, useConversations } from "./conversation-list";
import { ChatThread } from "./chat-thread";

export function MessagesView() {
  const { t } = useI18n();
  const params = useSearchParams();
  const activeId = params.get("c");
  const { data } = useConversations();
  const active = data?.find((c) => c.id === activeId) ?? null;

  return (
    <div className="-mx-4 -mt-6 grid h-[calc(100dvh-4rem-4rem)] overflow-hidden border-y bg-card sm:mx-0 sm:mt-0 sm:rounded-2xl sm:border lg:h-[calc(100dvh-4rem-4rem)] lg:grid-cols-[320px_1fr]">
      <aside className={cn("min-h-0 overflow-y-auto border-r p-2", activeId ? "hidden lg:block" : "block")}>
        <h1 className="px-2 pb-2 pt-1 text-lg font-bold">{t("messages.title")}</h1>
        <ConversationList activeId={activeId} />
      </aside>
      <div className={cn("min-h-0", activeId ? "block" : "hidden lg:block")}>
        {active ? (
          <ChatThread key={active.id} conversation={active} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
            <MessageCircle className="size-10" aria-hidden />
            <p>{t("messages.select")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
