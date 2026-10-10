"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";
import { REPORT_REASONS, reportSchema } from "@/schemas/misc";

type ReportForm = z.input<typeof reportSchema>;

export function ReportDialog({ targetType, targetId, trigger, defaultReason = "OTHER" }: { targetType: "REQUEST" | "USER" | "CONVERSATION" | "MESSAGE"; targetId: string; trigger?: React.ReactNode; defaultReason?: (typeof REPORT_REASONS)[number] }) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const onError = useApiError();
  const form = useForm<ReportForm>({ resolver: zodResolver(reportSchema), defaultValues: { targetType, targetId, reason: defaultReason, details: "" } });
  const submit = form.handleSubmit(async (values) => {
    try {
      await api.post("/api/reports", values);
      toast.success(t("report.sent"));
      setOpen(false);
      form.reset();
    } catch (e) {
      onError(e, form.setError);
    }
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag /> {t("request.report")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("report.title")}</DialogTitle>
            <DialogDescription>{t("report.subtitle")}</DialogDescription>
          </DialogHeader>
          <FormField id="report-reason" label={t("report.reason")} error={form.formState.errors.reason?.message}>
            <NativeSelect {...form.register("reason")}>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`admin.reportReason.${r}`)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="report-details" label={t("report.details")} error={form.formState.errors.details?.message} optional>
            <Textarea rows={4} placeholder={t("report.detailsPlaceholder")} {...form.register("details")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" loading={form.formState.isSubmitting}>
              {t("report.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
