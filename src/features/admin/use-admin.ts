"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, qs } from "@/lib/api-client";
import { useI18n } from "@/i18n/provider";
import { useApiError } from "@/hooks/use-api-error";
import type { Paginated } from "@/types/api";

export function useAdminList<T>(key: string, endpoint: string, params: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ["admin", key, params],
    queryFn: () => api.get<Paginated<T>>(`${endpoint}${qs(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminAction(key: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const onError = useApiError();
  return useMutation({
    mutationFn: ({ url, body }: { url: string; body: unknown }) => api.post(url, body),
    onSuccess: () => {
      toast.success(t("admin.actionDone"));
      qc.invalidateQueries({ queryKey: ["admin", key] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e) => onError(e),
  });
}
