"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { categoryName } from "@/lib/format";
import { useApiError } from "@/hooks/use-api-error";
import { useCategories, useLocations } from "@/hooks/use-catalog";
import { campaignSchema, type CampaignInput } from "@/schemas/misc";

export function CampaignFormDialog({ disabled }: { disabled?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const onError = useApiError();
  const [open, setOpen] = React.useState(false);
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<z.input<typeof campaignSchema>, unknown, CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { title: "", description: "", categoryId: "", locationId: "", startsAt: today, endsAt: "", goalHelps: 50, goalVolunteers: 20 },
  });
  const { errors, isSubmitting } = form.formState;
  const submit = form.handleSubmit(async (v) => {
    try {
      await api.post("/api/campaigns", { ...v, categoryId: v.categoryId || null, locationId: v.locationId || null, endsAt: v.endsAt || null });
      toast.success(t("organization.campaignCreated"));
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (e) {
      onError(e, form.setError);
    }
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus /> {t("organization.newCampaign")}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("organization.newCampaign")}</DialogTitle>
          </DialogHeader>
          <FormField id="c-title" label={t("organization.campaignTitle")} error={errors.title?.message}>
            <Input {...form.register("title")} />
          </FormField>
          <FormField id="c-description" label={t("organization.campaignDescription")} error={errors.description?.message}>
            <Textarea rows={4} {...form.register("description")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="c-category" label={t("requests.fieldCategory")} optional>
              <NativeSelect {...form.register("categoryId")}>
                <option value="">—</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryName(c, locale)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="c-location" label={t("requests.fieldCity")} optional>
              <NativeSelect {...form.register("locationId")}>
                <option value="">—</option>
                {locations?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.city}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="c-start" label={t("organization.startsAt")} error={errors.startsAt?.message}>
              <Input type="date" {...form.register("startsAt")} />
            </FormField>
            <FormField id="c-end" label={t("organization.endsAt")} error={errors.endsAt?.message} optional>
              <Input type="date" {...form.register("endsAt")} />
            </FormField>
            <FormField id="c-goal-helps" label={t("organization.goalHelps")} error={errors.goalHelps?.message}>
              <Input type="number" min={1} inputMode="numeric" {...form.register("goalHelps")} />
            </FormField>
            <FormField id="c-goal-vol" label={t("organization.goalVolunteers")} error={errors.goalVolunteers?.message}>
              <Input type="number" min={1} inputMode="numeric" {...form.register("goalVolunteers")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
