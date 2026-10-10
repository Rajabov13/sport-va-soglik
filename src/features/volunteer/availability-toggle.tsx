"use client";
import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";

export function AvailabilityToggle({ initial }: { initial: boolean }) {
  const { t } = useI18n();
  const [on, setOn] = React.useState(initial);
  const onError = useApiError();
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-soft">
      <span>
        <span className="flex items-center gap-2 font-semibold">
          <span className={`size-2.5 rounded-full ${on ? "bg-accent" : "bg-muted-foreground/40"}`} aria-hidden />
          {t("volunteer.available")}
        </span>
        <span className="block text-sm text-muted-foreground">{t("volunteer.availableHint")}</span>
      </span>
      <Switch
        checked={on}
        onCheckedChange={async (v) => {
          setOn(v); // optimistic
          try {
            await api.patch("/api/volunteer/profile", { isAvailableNow: v });
            toast.success(t("volunteer.saved"));
          } catch (e) {
            setOn(!v);
            onError(e);
          }
        }}
        aria-label={t("volunteer.available")}
      />
    </label>
  );
}
