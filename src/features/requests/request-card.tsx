"use client";
import Link from "next/link";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { CategoryIconBox, MatchScore, StatusBadge, UrgencyBadge } from "@/components/shared/badges";
import { useI18n } from "@/i18n/provider";
import { formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RequestListItemDTO } from "@/types/api";

export function RequestCard({ request, href, showStatus = true, className, footer }: { request: RequestListItemDTO; href?: string; showStatus?: boolean; className?: string; footer?: React.ReactNode }) {
  const { t, locale } = useI18n();
  return (
    <article className={cn("group relative flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft transition hover:shadow-lift", className)}>
      <div className="flex items-start gap-3">
        <CategoryIconBox category={request.category} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-snug">
            <Link href={href ?? `/dashboard/requests/${request.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {request.title}
            </Link>
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showStatus && <StatusBadge status={request.status} />}
            <UrgencyBadge urgency={request.urgency} />
          </div>
        </div>
        {request.matchScore !== null && <MatchScore score={request.matchScore} className="shrink-0" />}
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{request.description}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {request.city && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden /> {request.city}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> {t("common.people", { value: request.peopleCount })}
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock className="size-3.5" aria-hidden />
          {request.preferredDate ? formatDateTime(locale, request.preferredDate) : relativeTime(locale, request.createdAt)}
        </span>
      </div>
      {footer && <div className="relative z-10">{footer}</div>}
    </article>
  );
}
