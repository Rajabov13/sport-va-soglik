"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/** Unread badge counts. Polling keeps the shell fresh; the contract is ready for SSE/WebSocket push. */
export function useSummary(enabled = true) {
  return useQuery({
    queryKey: ["summary"],
    queryFn: () => api.get<{ notifications: number; messages: number }>("/api/notifications/summary"),
    refetchInterval: 20_000,
    enabled,
  });
}
