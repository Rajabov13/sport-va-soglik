"use client";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";

export function CompleteCampaignButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const onError = useApiError();
  return (
    <ConfirmDialog
      title={t("organization.complete")}
      description={t("admin.confirmAction")}
      confirmLabel={t("organization.complete")}
      cancelLabel={t("common.cancel")}
      onConfirm={async () => {
        try {
          await api.patch(`/api/campaigns/${id}`, { status: "COMPLETED" });
          toast.success(t("organization.markCompleted"));
          router.refresh();
        } catch (e) {
          onError(e);
        }
      }}
      trigger={
        <Button variant="ghost" size="sm">
          <CheckCircle2 /> {t("organization.complete")}
        </Button>
      }
    />
  );
}
