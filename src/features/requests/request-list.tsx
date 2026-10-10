"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { useI18n } from "@/i18n/provider";
import { api, qs } from "@/lib/api-client";
import { useDebounced } from "@/hooks/use-debounce";
import type { Paginated, RequestListItemDTO } from "@/types/api";
import { RequestCard } from "./request-card";
import { EMPTY_FILTERS, RequestFilters, type RequestFilterState } from "./request-filters";

export function RequestList({ scope = "mine", emptyAction = true }: { scope?: "mine" | "open"; emptyAction?: boolean }) {
  const { t } = useI18n();
  const [filters, setFilters] = React.useState<RequestFilterState>(EMPTY_FILTERS);
  const [page, setPage] = React.useState(1);
  const q = useDebounced(filters.q);
  const params = { scope, page, pageSize: 12, q, status: scope === "open" ? undefined : filters.status, category: filters.category, urgency: filters.urgency, sort: filters.sort };
  const query = useQuery({
    queryKey: ["requests", params],
    queryFn: () => api.get<Paginated<RequestListItemDTO>>(`/api/requests${qs(params)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="grid gap-4">
      <RequestFilters
        value={filters}
        showStatus={scope !== "open"}
        onChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <CardListSkeleton count={4} className="md:grid-cols-2" />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title={filters === EMPTY_FILTERS ? t("dashboard.noRequests") : t("requests.empty")}
          text={filters === EMPTY_FILTERS && scope === "mine" ? t("dashboard.noRequestsText") : undefined}
          action={
            emptyAction && scope === "mine" ? (
              <Button asChild>
                <Link href="/dashboard/requests/create">
                  <Plus /> {t("requests.create")}
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className={`grid gap-3 md:grid-cols-2 ${query.isPlaceholderData ? "opacity-60" : ""}`} aria-busy={query.isFetching}>
            {query.data.items.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
          <Pagination page={page} totalPages={query.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
