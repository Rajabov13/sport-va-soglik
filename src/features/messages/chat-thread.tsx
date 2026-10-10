"use client";
import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, CheckCheck, Flag, ImagePlus, Loader2, SendHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { ReportDialog } from "@/features/shared-report-dialog";
import { useSession } from "@/components/shared/session";
import { useI18n } from "@/i18n/provider";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChat } from "./use-chat";
import type { ConversationDTO } from "./types";

export function ChatThread({ conversation }: { conversation: ConversationDTO }) {
  const { t, locale } = useI18n();
  const { user } = useSession();
  const me = { id: user!.id, name: user!.name, avatarUrl: user!.avatarUrl };
  const chat = useChat(conversation.id, me.id);
  const [text, setText] = React.useState("");
  const [sendingFile, setSendingFile] = React.useState(false);
  const scroller = React.useRef<HTMLDivElement>(null);
  const textarea = React.useRef<HTMLTextAreaElement>(null);
  const other = conversation.others[0];
  const otherRead = chat.readBy.find((r) => r.userId === other?.id)?.lastReadAt;

  React.useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.loading]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    textarea.current?.focus();
    await chat.send(body, me);
  };

  let lastDay = "";
  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={t("messages.title")}>
      <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="lg:hidden" aria-label={t("messages.backToList")}>
          <Link href="/dashboard/messages" scroll={false}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <Avatar name={other?.name ?? "?"} src={other?.avatarUrl} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{other?.name}</p>
          {conversation.request && (
            <Link href={`/dashboard/requests/${conversation.request.id}`} className="block truncate text-xs text-primary hover:underline">
              {t("messages.request", { title: conversation.request.title })}
            </Link>
          )}
        </div>
        <ReportDialog
          targetType="CONVERSATION"
          targetId={conversation.id}
          defaultReason="ABUSE"
          trigger={
            <Button variant="ghost" size="icon" aria-label={t("messages.report")}>
              <Flag className="size-4" />
            </Button>
          }
        />
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto bg-secondary/30 px-3 py-4 sm:px-5" aria-live="polite" aria-relevant="additions">
        {chat.loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : chat.error ? (
          <ErrorState onRetry={chat.reload} />
        ) : (
          <>
            {chat.hasMore && (
              <div className="mb-3 text-center">
                <Button variant="ghost" size="sm" onClick={chat.loadOlder}>
                  {t("messages.loadOlder")}
                </Button>
              </div>
            )}
            {chat.messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("messages.noMessages")}</p>}
            <ol className="grid gap-1.5">
              {chat.messages.map((m) => {
                const mine = m.sender.id === me.id;
                const day = formatDate(locale, m.createdAt);
                const showDay = day !== lastDay;
                lastDay = day;
                const read = mine && otherRead && new Date(otherRead) >= new Date(m.createdAt);
                return (
                  <React.Fragment key={m.id}>
                    {showDay && (
                      <li className="my-2 text-center text-[11px] font-medium text-muted-foreground" aria-hidden>
                        {day}
                      </li>
                    )}
                    <li className={cn("flex", mine ? "justify-end" : "justify-start")} data-testid="chat-message">
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]",
                          mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card",
                          m.failed && "bg-destructive/90",
                        )}
                      >
                        {m.attachments.map((a) => (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="mb-1 block overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt="" className="max-h-64 w-full object-cover" loading="lazy" />
                          </a>
                        ))}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {formatTime(locale, m.createdAt)}
                          {mine &&
                            (m.pending ? (
                              <Loader2 className="size-3 animate-spin" aria-hidden />
                            ) : m.failed ? (
                              <AlertCircle className="size-3" aria-label={t("errors.network")} />
                            ) : read ? (
                              <CheckCheck className="size-3.5" aria-label={t("messages.read")} />
                            ) : (
                              <Check className="size-3.5" aria-hidden />
                            ))}
                        </p>
                      </div>
                    </li>
                  </React.Fragment>
                );
              })}
            </ol>
          </>
        )}
      </div>

      <div className="h-5 px-4 text-xs text-muted-foreground" aria-live="polite">
        {chat.typing.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex gap-0.5" aria-hidden>
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </span>
            {t("messages.typing", { name: chat.typing[0] })}
          </span>
        )}
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t bg-card p-2 sm:p-3">
        <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary focus-within:ring-2 focus-within:ring-ring" aria-label={t("messages.attach")}>
          {sendingFile ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSendingFile(true);
              await chat.attach(f);
              setSendingFile(false);
              e.target.value = "";
            }}
          />
        </label>
        <textarea
          ref={textarea}
          value={text}
          rows={1}
          maxLength={2000}
          onChange={(e) => {
            setText(e.target.value);
            chat.pingTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("messages.placeholder")}
          aria-label={t("messages.placeholder")}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          data-testid="chat-input"
        />
        <Button type="submit" size="icon" disabled={!text.trim()} aria-label={t("messages.send")} data-testid="chat-send">
          <SendHorizontal className="size-5" />
        </Button>
      </form>
    </section>
  );
}
