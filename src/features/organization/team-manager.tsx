"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { useApiError } from "@/hooks/use-api-error";

interface Member {
  id: string;
  status: "PENDING" | "ACTIVE" | "REMOVED";
  user: { id: string; name: string; email: string; avatarUrl: string | null; volunteerProfile: { completedCount: number; ratingAvg: number; hoursTotal: number } | null };
}

export function TeamManager() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const onError = useApiError();
  const query = useQuery({ queryKey: ["org-members"], queryFn: () => api.get<Member[]>("/api/organization/members") });
  const action = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "remove" }) => api.post(`/api/organization/members/${id}`, { action }),
    onSuccess: () => {
      toast.success(t("admin.actionDone"));
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
    onError: (e) => onError(e),
  });
  if (query.isPending) return <CardListSkeleton count={3} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (query.data.length === 0) return <EmptyState icon={<Users />} title={t("organization.teamEmpty")} />;
  return (
    <ul className="grid gap-2">
      {query.data.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
          <Avatar name={m.user.name} src={m.user.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{m.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t("achievements.helps", { count: m.user.volunteerProfile?.completedCount ?? 0 })} · {t("common.hours", { value: Math.round(m.user.volunteerProfile?.hoursTotal ?? 0) })}
            </p>
          </div>
          <Badge variant={m.status === "ACTIVE" ? "success" : "warning"}>{m.status === "ACTIVE" ? t("organization.active") : t("organization.pending")}</Badge>
          <div className="flex gap-1">
            {m.status === "PENDING" && (
              <Button size="sm" variant="accent" onClick={() => action.mutate({ id: m.id, action: "approve" })} disabled={action.isPending}>
                <Check /> {t("organization.approve")}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => action.mutate({ id: m.id, action: "remove" })} disabled={action.isPending} aria-label={t("organization.remove")}>
              <UserMinus />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
