"use client";
import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { RequestCard } from "@/features/requests/request-card";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { RequestListItemDTO } from "@/types/api";

interface Task {
  assignmentId: string;
  assignmentStatus: "ACTIVE" | "COMPLETION_REQUESTED" | "COMPLETED" | "CANCELLED";
  acceptedAt: string;
  completedAt: string | null;
  hoursSpent: number | null;
  request: RequestListItemDTO;
}

export function TaskList({ status }: { status: "active" | "completed" }) {
  const { t, locale } = useI18n();
  const query = useQuery({ queryKey: ["tasks", status], queryFn: () => api.get<Task[]>(`/api/volunteer/tasks?status=${status}`) });
  if (query.isPending) return <CardListSkeleton count={3} className="md:grid-cols-2" />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (query.data.length === 0)
    return (
      <EmptyState
        icon={<ListChecks />}
        title={t("volunteer.tasksEmpty")}
        text={t("volunteer.tasksEmptyText")}
        action={
          <Button asChild>
            <Link href="/dashboard/volunteer">{t("volunteer.suggested")}</Link>
          </Button>
        }
      />
    );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {query.data.map((task) => (
        <RequestCard
          key={task.assignmentId}
          request={task.request}
          footer={
            <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
              <Badge variant={task.assignmentStatus === "COMPLETED" ? "success" : task.assignmentStatus === "COMPLETION_REQUESTED" ? "warning" : "soft"}>
                {t(`assignmentStatus.${task.assignmentStatus}`)}
              </Badge>
              <span>{formatDate(locale, task.completedAt ?? task.acceptedAt)}</span>
              {task.hoursSpent !== null && <span>· {t("common.hours", { value: task.hoursSpent })}</span>}
            </div>
          }
        />
      ))}
    </div>
  );
}
