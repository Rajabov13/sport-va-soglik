"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { PasswordInput } from "./password-input";
import { GoogleButton } from "./google-button";
import { DemoPanel } from "./demo-panel";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm({ demoMode }: { demoMode: boolean }) {
  const { t, td } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const oauthError = params.get("error");
  const onError = useApiError();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const res = await api.post<{ redirectTo: string }>("/api/auth/login", values);
      router.push(next ?? res.redirectTo);
      router.refresh();
    } catch (e) {
      onError(e, form.setError);
    }
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("auth.loginTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>
      {oauthError && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {td(`auth.${oauthError === "oauthNotConfigured" ? "oauthNotConfigured" : "oauthFailed"}`)}
        </p>
      )}
      {demoMode && <DemoPanel />}
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="email" label={t("auth.email")} error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </FormField>
        <FormField id="password" label={t("auth.password")} error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...form.register("password")} />
        </FormField>
        <Button type="submit" loading={isSubmitting} className="mt-2 w-full" size="lg">
          {t("auth.loginButton")}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> {t("common.or")} <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton next={next} />
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/auth/register" className="font-semibold text-primary hover:underline">
          {t("nav.register")}
        </Link>
      </p>
      <span className="sr-only" aria-live="polite">{isSubmitting ? t("common.loading") : ""}</span>
    </div>
  );
}
