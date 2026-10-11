"use client";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/features/auth/password-input";
import { useI18n } from "@/i18n/provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { settingsSchema, type SettingsInput } from "@/schemas/misc";
import { changePasswordSchema, type ChangePasswordInput } from "@/schemas/auth";

export function ProfileSettingsForm({ initial, email, role }: { initial: SettingsInput; email: string; role: string }) {
  const { t, setLocale, locale } = useI18n();
  const router = useRouter();
  const onError = useApiError();
  const form = useForm<z.input<typeof settingsSchema>, unknown, SettingsInput>({ resolver: zodResolver(settingsSchema), defaultValues: initial });
  const { errors, isSubmitting, isDirty } = form.formState;
  useUnsavedChanges(isDirty && !isSubmitting, t("common.unsavedChanges"));

  const save = form.handleSubmit(async (values) => {
    try {
      await api.put("/api/settings", values);
      form.reset(values);
      if (values.locale !== locale) setLocale(values.locale as Locale);
      toast.success(t("settings.saved"));
      router.refresh();
    } catch (e) {
      onError(e, form.setError);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile")}</CardTitle>
        <CardDescription>
          {t("settings.email")}: {email} · {t("settings.role")}: {role}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="name" label={t("auth.name")} error={errors.name?.message}>
              <Input autoComplete="name" {...form.register("name")} />
            </FormField>
            <FormField id="phone" label={t("settings.phone")} error={errors.phone?.message} optional>
              <Input type="tel" inputMode="tel" placeholder="+998 90 123 45 67" {...form.register("phone")} />
            </FormField>
          </div>
          <FormField id="bio" label={t("settings.bio")} error={errors.bio?.message} optional>
            <Textarea rows={3} {...form.register("bio")} />
          </FormField>
          <FormField id="locale" label={t("settings.language")}>
            <NativeSelect {...form.register("locale")}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <Controller
            control={form.control}
            name="emailNotifications"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                <span>
                  <span className="block text-sm font-semibold">{t("settings.emailNotifications")}</span>
                  <span className="block text-xs text-muted-foreground">{t("settings.emailNotificationsHint")}</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={t("settings.emailNotifications")} />
              </label>
            )}
          />
          <Button type="submit" loading={isSubmitting} className="w-fit">
            {t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useI18n();
  const onError = useApiError();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: hasPassword ? "" : "-", newPassword: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const save = form.handleSubmit(async (values) => {
    try {
      await api.put("/api/settings/password", values);
      form.reset();
      toast.success(t("settings.passwordChanged"));
    } catch (e) {
      onError(e, form.setError);
    }
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.security")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-4" noValidate>
          {hasPassword && (
            <FormField id="currentPassword" label={t("settings.currentPassword")} error={errors.currentPassword?.message}>
              <PasswordInput autoComplete="current-password" {...form.register("currentPassword")} />
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="newPassword" label={t("settings.newPassword")} error={errors.newPassword?.message} hint={t("auth.passwordHint")}>
              <PasswordInput autoComplete="new-password" {...form.register("newPassword")} />
            </FormField>
            <FormField id="confirmPassword" label={t("settings.confirmPassword")} error={errors.confirmPassword?.message}>
              <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
            </FormField>
          </div>
          <Button type="submit" variant="outline" loading={isSubmitting} className="w-fit">
            {t("settings.changePassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function InstallCard() {
  const { t } = useI18n();
  const { canInstall, install } = useInstallPrompt();
  // Only offer the button when the browser lets us open its install dialog directly.
  if (!canInstall) return null;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-semibold">{t("settings.install")}</p>
          <p className="text-sm text-muted-foreground">{t("settings.installHint")}</p>
        </div>
        <Button variant="soft" onClick={install}>
          <Download /> {t("settings.installButton")}
        </Button>
      </CardContent>
    </Card>
  );
}
