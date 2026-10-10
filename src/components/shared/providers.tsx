"use client";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { ApiClientError } from "@/lib/api-client";
import { ServiceWorkerRegister } from "./service-worker";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
            retry: (count, error) => !(error instanceof ApiClientError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale}>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: "rounded-xl" }} />
        <ServiceWorkerRegister />
      </I18nProvider>
    </QueryClientProvider>
  );
}
