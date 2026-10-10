"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";
import type { MessageDTO, MessagesPage } from "./types";

const POLL_MS = 3000;
const TYPING_THROTTLE_MS = 3000;

/**
 * Chat state with incremental polling (`?after=`). The transport is isolated here,
 * so it can be swapped for SSE/WebSocket without touching the UI.
 */
export function useChat(conversationId: string, currentUserId: string) {
  const qc = useQueryClient();
  const onError = useApiError();
  const [messages, setMessages] = React.useState<MessageDTO[]>([]);
  const [typing, setTyping] = React.useState<string[]>([]);
  const [readBy, setReadBy] = React.useState<MessagesPage["readBy"]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const lastTyping = React.useRef(0);
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;

  const markRead = React.useCallback(() => {
    api.post(`/api/conversations/${conversationId}/read`).then(
      () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["summary"] });
      },
      () => undefined,
    );
  }, [conversationId, qc]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const page = await api.get<MessagesPage>(`/api/conversations/${conversationId}/messages`);
      setMessages(page.messages);
      setTyping(page.typing);
      setReadBy(page.readBy);
      setHasMore(page.hasMore);
      markRead();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [conversationId, markRead]);

  React.useEffect(() => {
    setMessages([]);
    load();
  }, [load]);

  React.useEffect(() => {
    if (loading || error) return;
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const confirmed = messagesRef.current.filter((m) => !m.pending && !m.failed);
      const last = confirmed[confirmed.length - 1]?.createdAt;
      try {
        const page = await api.get<MessagesPage>(`/api/conversations/${conversationId}/messages${last ? `?after=${encodeURIComponent(last)}` : ""}`);
        if (cancelled) return;
        setTyping(page.typing);
        setReadBy(page.readBy);
        if (page.messages.length) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const fresh = page.messages.filter((m) => !ids.has(m.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
          if (page.messages.some((m) => m.sender.id !== currentUserId)) markRead();
        }
      } catch {
        /* transient network errors are retried on the next tick */
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [conversationId, currentUserId, loading, error, markRead]);

  const loadOlder = async () => {
    const first = messages[0]?.createdAt;
    if (!first) return;
    const page = await api.get<MessagesPage>(`/api/conversations/${conversationId}/messages?before=${encodeURIComponent(first)}`);
    setMessages((prev) => [...page.messages, ...prev]);
    setHasMore(page.hasMore);
  };

  const send = async (body: string, me: MessageDTO["sender"]) => {
    const temp: MessageDTO = { id: `tmp-${Date.now()}`, body, createdAt: new Date().toISOString(), sender: me, attachments: [], pending: true };
    setMessages((prev) => [...prev, temp]); // optimistic
    try {
      const saved = await api.post<MessageDTO>(`/api/conversations/${conversationId}/messages`, { body });
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...saved, createdAt: new Date(saved.createdAt).toISOString() } : m)));
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
      onError(e);
    }
  };

  const attach = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const saved = await api.upload<MessageDTO>(`/api/conversations/${conversationId}/attachments`, form);
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) {
      onError(e);
    }
  };

  const pingTyping = () => {
    const now = Date.now();
    if (now - lastTyping.current < TYPING_THROTTLE_MS) return;
    lastTyping.current = now;
    api.post(`/api/conversations/${conversationId}/typing`).catch(() => undefined);
  };

  return { messages, typing, readBy, hasMore, loading, error, reload: load, loadOlder, send, attach, pingTyping };
}
