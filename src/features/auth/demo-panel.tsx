"use client";
import * as React from "react";
import { Building2, HandHeart, ShieldCheck, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { useAuthActions } from "@/hooks/use-auth-actions";
import type { DemoPersona } from "@/config/demo";

const PERSONAS = [
  { persona: "user", label: "auth.demoUser", icon: User },
  { persona: "volunteer", label: "auth.demoVolunteer", icon: HandHeart },
  { persona: "organization", label: "auth.demoOrganization", icon: Building2 },
  { persona: "admin", label: "auth.demoAdmin", icon: ShieldCheck },
] as const;

export function DemoPanel() {
  const { t } = useI18n();
  const { demoLogin } = useAuthActions();
  const [pending, setPending] = React.useState<DemoPersona | null>(null);
  return (
    <section id="demo" className="rounded-2xl border border-dashed border-primary/30 bg-primary-soft/50 p-4" aria-labelledby="demo-title">
      <h2 id="demo-title" className="flex items-center gap-2 font-semibold text-primary">
        <Sparkles className="size-4" aria-hidden /> {t("auth.demoTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.demoSubtitle")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {PERSONAS.map((p) => (
          <Button
            key={p.persona}
            variant="outline"
            className="justify-start bg-card"
            loading={pending === p.persona}
            disabled={!!pending}
            data-testid={`demo-${p.persona}`}
            onClick={async () => {
              setPending(p.persona);
              await demoLogin(p.persona);
              setPending(null);
            }}
          >
            {pending !== p.persona && <p.icon aria-hidden />}
            <span className="truncate">{t(p.label)}</span>
          </Button>
        ))}
      </div>
    </section>
  );
}
