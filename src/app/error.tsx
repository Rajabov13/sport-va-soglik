"use client";
import { useEffect } from "react";
import { ErrorPage } from "@/components/shared/error-page";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorPage
      code="500"
      title={t("errors.title500")}
      text={t("errors.text500")}
      homeLabel={t("errors.goHome")}
      action={
        <Button variant="outline" onClick={reset}>
          {t("common.retry")}
        </Button>
      }
    />
  );
}
