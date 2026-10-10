"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { RequestCard } from "@/features/requests/request-card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import type { RequestListItemDTO } from "@/types/api";

export function MatchedRequests() {
  const { t } = useI18n();
  const query = useQuery({ queryKey: ["matches"], queryFn: () => api.get<RequestListItemDTO[]>("/api/requests/matches"), refetchInterval: 30_000 });
  if (query.isPending) return <CardListSkeleton count={2} className="md:grid-cols-2" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (query.data.length === 0)
    return (
      <EmptyState
        icon={<Sparkles />}
        title={t("volunteer.suggestedEmpty")}
        text={t("volunteer.suggestedEmptyText")}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/volunteer/profile">
              <UserCog /> {t("nav.volunteerProfile")}
            </Link>
          </Button>
        }
      />
    );
  return (
    <div className="grid gap-3 md:grid-cols-2" data-testid="matched-requests">
      {query.data.map((r) => (
        <RequestCard key={r.id} request={r} showStatus={false} />
      ))}
    </div>
  );
}
