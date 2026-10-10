"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";

export function JoinCampaignButton({ campaignId, joined }: { campaignId: string; joined: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const onError = useApiError();
  const [state, setState] = React.useState(joined);
  const [pending, setPending] = React.useState(false);
  const toggle = async () => {
    setPending(true);
    try {
      if (state) await api.delete(`/api/campaigns/${campaignId}/join`);
      else await api.post(`/api/campaigns/${campaignId}/join`);
      toast.success(state ? t("campaigns.left") : t("campaigns.joined"));
      setState(!state);
      router.refresh();
    } catch (e) {
      onError(e);
    } finally {
      setPending(false);
    }
  };
  return (
    <Button variant={state ? "outline" : "accent"} size="lg" loading={pending} onClick={toggle} className="w-full sm:w-auto">
      {state ? <LogOut /> : <UserPlus />} {state ? t("campaigns.leave") : t("campaigns.join")}
    </Button>
  );
}
