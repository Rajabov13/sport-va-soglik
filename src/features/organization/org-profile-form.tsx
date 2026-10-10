"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";
import { useLocations } from "@/hooks/use-catalog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { organizationUpdateSchema, type OrganizationUpdateInput } from "@/schemas/misc";

export function OrgProfileForm({ initial }: { initial: OrganizationUpdateInput }) {
  const { t } = useI18n();
  const router = useRouter();
  const onError = useApiError();
  const { data: locations } = useLocations();
  const form = useForm<z.input<typeof organizationUpdateSchema>, unknown, OrganizationUpdateInput>({ resolver: zodResolver(organizationUpdateSchema), defaultValues: initial });
  const { errors, isSubmitting, isDirty } = form.formState;
  useUnsavedChanges(isDirty && !isSubmitting, t("common.unsavedChanges"));
  const save = form.handleSubmit(async (v) => {
    try {
      await api.put("/api/organization", v);
      form.reset(v);
      toast.success(t("organization.profileSaved"));
      router.refresh();
    } catch (e) {
      onError(e, form.setError);
    }
  });
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={save} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="o-name" label={t("organization.fieldName")} error={errors.name?.message}>
              <Input {...form.register("name")} />
            </FormField>
            <FormField id="o-type" label={t("organization.fieldType")} error={errors.type?.message}>
              <Input {...form.register("type")} />
            </FormField>
          </div>
          <FormField id="o-description" label={t("organization.fieldDescription")} error={errors.description?.message}>
            <Textarea rows={4} {...form.register("description")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="o-website" label={t("organization.fieldWebsite")} error={errors.website?.message} optional>
              <Input type="url" placeholder="https://" {...form.register("website")} />
            </FormField>
            <FormField id="o-email" label={t("organization.fieldEmail")} error={errors.email?.message} optional>
              <Input type="email" {...form.register("email")} />
            </FormField>
            <FormField id="o-phone" label={t("settings.phone")} error={errors.phone?.message} optional>
              <Input type="tel" {...form.register("phone")} />
            </FormField>
            <FormField id="o-location" label={t("requests.fieldCity")} optional>
              <NativeSelect {...form.register("locationId")}>
                <option value="">—</option>
                {locations?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.city}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="o-address" label={t("organization.fieldAddress")} error={errors.address?.message} optional>
            <Input {...form.register("address")} />
          </FormField>
          <Button type="submit" loading={isSubmitting} className="w-fit">
            {t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
