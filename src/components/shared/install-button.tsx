"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useI18n } from "@/i18n/provider";

/** Header install button; rendered only when the browser offers its native install dialog. */
export function InstallButton() {
  const { t } = useI18n();
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <Button variant="soft" size="sm" onClick={install} className="gap-1.5" aria-label={t("settings.installButton")}>
      <Download />
      <span className="hidden sm:inline">{t("settings.installButton")}</span>
    </Button>
  );
}
