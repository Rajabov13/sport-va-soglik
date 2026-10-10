"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useI18n } from "@/i18n/provider";
import { useApiError } from "./use-api-error";
import type { DemoPersona } from "@/config/demo";

export function useAuthActions() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();
  const onError = useApiError();

  return {
    logout: async () => {
      try {
        await api.post("/api/auth/logout");
        qc.clear();
        toast.success(t("auth.loggedOut"));
        router.push("/");
        router.refresh();
      } catch (e) {
        onError(e);
      }
    },
    demoLogin: async (persona: DemoPersona) => {
      try {
        const res = await api.post<{ redirectTo: string }>("/api/auth/demo", { persona });
        qc.clear();
        router.push(res.redirectTo);
        router.refresh();
      } catch (e) {
        onError(e);
      }
    },
  };
}
