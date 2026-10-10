"use client";
import { useCallback } from "react";
import { toast } from "sonner";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { useI18n } from "@/i18n/provider";
import { ApiClientError } from "@/lib/api-client";

/** Turn API errors into localized toasts and per-field form errors. */
export function useApiError() {
  const { td } = useI18n();
  return useCallback(
    <T extends FieldValues>(error: unknown, setError?: UseFormSetError<T>) => {
      const code = error instanceof ApiClientError ? error.code : "server";
      if (error instanceof ApiClientError && error.fieldErrors && setError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages?.[0]) setError(field as Path<T>, { type: "server", message: messages[0] });
        }
      }
      toast.error(td(`errors.${code}`));
    },
    [td],
  );
}
