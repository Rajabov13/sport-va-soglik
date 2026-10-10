"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";

export type RequestAction = "submit" | "accept" | "start" | "complete" | "confirm" | "withdraw" | "decline" | "cancel" | "review";

export function useRequestAction<TResult = unknown>(id: string, action: RequestAction, onSuccess?: (data: TResult) => void) {
  const qc = useQueryClient();
  const router = useRouter();
  const onError = useApiError();
  return useMutation({
    mutationFn: (body?: unknown) => api.post<TResult>(`/api/requests/${id}/${action}`, body ?? {}),
    onSuccess: async (data) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["request", id] }),
        qc.invalidateQueries({ queryKey: ["requests"] }),
        qc.invalidateQueries({ queryKey: ["matches"] }),
        qc.invalidateQueries({ queryKey: ["tasks"] }),
        qc.invalidateQueries({ queryKey: ["summary"] }),
      ]);
      onSuccess?.(data);
      router.refresh();
    },
    onError: (e) => onError(e),
  });
}
