"use client";
import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useI18n } from "@/i18n/provider";
import { completeSchema } from "@/schemas/request";
import { useRequestAction } from "./use-request-action";

export function CompleteDialog({ requestId, estimatedHours }: { requestId: string; estimatedHours: number }) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.input<typeof completeSchema>>({ resolver: zodResolver(completeSchema), defaultValues: { hoursSpent: estimatedHours, note: "" } });
  const action = useRequestAction(requestId, "complete", () => {
    toast.success(t("request.completionRequested"));
    setOpen(false);
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="lg" className="w-full" data-testid="complete-open">
          <CheckCircle2 /> {t("request.complete")}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <form className="grid gap-4" onSubmit={form.handleSubmit((v) => action.mutate(v))} noValidate>
          <DialogHeader>
            <DialogTitle>{t("request.completeTitle")}</DialogTitle>
            <DialogDescription>{t("request.completeText")}</DialogDescription>
          </DialogHeader>
          <FormField id="hoursSpent" label={t("request.hoursSpent")} error={form.formState.errors.hoursSpent?.message}>
            <Input type="number" step={0.25} min={0.25} max={48} inputMode="decimal" {...form.register("hoursSpent")} />
          </FormField>
          <FormField id="note" label={t("request.note")} optional error={form.formState.errors.note?.message}>
            <Textarea rows={3} {...form.register("note")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="accent" loading={action.isPending} data-testid="complete-submit">
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
