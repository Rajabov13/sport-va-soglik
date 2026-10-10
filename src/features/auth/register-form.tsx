"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, HandHeart, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/shared/form-field";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";
import { registerSchema, type RegisterInput } from "@/schemas/auth";
import { cn } from "@/lib/utils";
import { PasswordInput } from "./password-input";
import { GoogleButton } from "./google-button";

const ROLES = [
  { value: "USER", icon: HeartHandshake, label: "auth.roleUser", hint: "auth.roleUserHint" },
  { value: "VOLUNTEER", icon: HandHeart, label: "auth.roleVolunteer", hint: "auth.roleVolunteerHint" },
  { value: "ORGANIZATION", icon: Building2, label: "auth.roleOrganization", hint: "auth.roleOrganizationHint" },
] as const;

export function RegisterForm() {
  const { t, td } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = (["USER", "VOLUNTEER", "ORGANIZATION"] as const).find((r) => r === params.get("role")) ?? "USER";
  const onError = useApiError();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: initialRole, organizationName: "", acceptTerms: false as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;
  const role = form.watch("role");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const res = await api.post<{ redirectTo: string }>("/api/auth/register", values);
      router.push(res.redirectTo);
      router.refresh();
    } catch (e) {
      onError(e, form.setError);
    }
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("auth.registerTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("auth.registerSubtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("auth.role")}</legend>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                {ROLES.map((r) => {
                  const selected = field.value === r.value;
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      key={r.value}
                      data-testid={`role-${r.value}`}
                      onClick={() => field.onChange(r.value)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition sm:flex-col sm:items-start",
                        selected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40",
                      )}
                    >
                      <r.icon className={cn("size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} aria-hidden />
                      <span>
                        <span className="block text-sm font-semibold">{t(r.label)}</span>
                        <span className="block text-xs text-muted-foreground">{t(r.hint)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </fieldset>
        <FormField id="name" label={t("auth.name")} error={errors.name?.message}>
          <Input autoComplete="name" {...form.register("name")} />
        </FormField>
        {role === "ORGANIZATION" && (
          <FormField id="organizationName" label={t("auth.organizationName")} error={errors.organizationName?.message}>
            <Input autoComplete="organization" {...form.register("organizationName")} />
          </FormField>
        )}
        <FormField id="email" label={t("auth.email")} error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </FormField>
        <FormField id="password" label={t("auth.password")} error={errors.password?.message} hint={t("auth.passwordHint")}>
          <PasswordInput autoComplete="new-password" {...form.register("password")} />
        </FormField>
        <Controller
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <div className="grid gap-1">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={!!errors.acceptTerms} id="acceptTerms" className="mt-0.5" />
                <span>{t("auth.acceptTerms")}</span>
              </label>
              {errors.acceptTerms?.message && (
                <p role="alert" className="text-xs font-medium text-destructive">{td(`validation.${errors.acceptTerms.message}`)}</p>
              )}
            </div>
          )}
        />
        <Button type="submit" loading={isSubmitting} size="lg" className="mt-2 w-full">
          {t("auth.registerButton")}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> {t("common.or")} <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href="/auth/login" className="font-semibold text-primary hover:underline">
          {t("nav.login")}
        </Link>
      </p>
    </div>
  );
}
