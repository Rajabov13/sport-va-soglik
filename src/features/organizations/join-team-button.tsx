"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";

export function JoinTeamButton({ orgId, status }: { orgId: string; status: "PENDING" | "ACTIVE" | "REMOVED" | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const onError = useApiError();
  const [pending, setPending] = React.useState(false);
  const [current, setCurrent] = React.useState(status);
  if (current === "ACTIVE") return <Button variant="soft" disabled>{t("volunteer.teamMember")}</Button>;
  if (current === "PENDING") return <Button variant="outline" disabled>{t("volunteer.joinRequested")}</Button>;
  return (
    <Button
      variant="accent"
      loading={pending}
      onClick={async () => {
        setPending(true);
        try {
          await api.post(`/api/organizations/${orgId}/join`);
          setCurrent("PENDING");
          toast.success(t("volunteer.joinRequested"));
          router.refresh();
        } catch (e) {
          onError(e);
        } finally {
          setPending(false);
        }
      }}
    >
      <UserPlus /> {t("volunteer.joinTeam")}
    </Button>
  );
}
