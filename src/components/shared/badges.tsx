"use client";
import { AlertOctagon, Flame, Gauge, Leaf as LeafIcon } from "lucide-react";
import type { RequestStatus, Urgency } from "@prisma/client";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useI18n } from "@/i18n/provider";
import { categoryName } from "@/lib/format";
import { DynamicIcon } from "./icons";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<RequestStatus, BadgeProps["variant"]> = {
  DRAFT: "muted",
  PENDING: "warning",
  VERIFIED: "soft",
  MATCHING: "soft",
  ACCEPTED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "muted",
  REJECTED: "danger",
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {status === "MATCHING" && <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />}
      {t(`status.${status}`)}
    </Badge>
  );
}

const URGENCY_STYLE: Record<Urgency, { variant: BadgeProps["variant"]; icon: typeof Flame }> = {
  LOW: { variant: "muted", icon: LeafIcon },
  MEDIUM: { variant: "soft", icon: Gauge },
  HIGH: { variant: "warning", icon: Flame },
  CRITICAL: { variant: "danger", icon: AlertOctagon },
};

export function UrgencyBadge({ urgency, className }: { urgency: Urgency; className?: string }) {
  const { t } = useI18n();
  const { variant, icon: Icon } = URGENCY_STYLE[urgency];
  return (
    <Badge variant={variant} className={className}>
      <Icon aria-hidden />
      {t(`urgency.${urgency}`)}
    </Badge>
  );
}

export interface CategoryLike {
  slug: string;
  icon: string;
  color: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
}

export function CategoryChip({ category, className }: { category: CategoryLike; className?: string }) {
  const { locale } = useI18n();
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${category.color}1a`, color: category.color }}>
        <DynamicIcon name={category.icon} className="size-3.5" />
      </span>
      <span className="truncate">{categoryName(category, locale)}</span>
    </span>
  );
}

export function CategoryIconBox({ category, className }: { category: Pick<CategoryLike, "icon" | "color">; className?: string }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", className)} style={{ backgroundColor: `${category.color}1a`, color: category.color }}>
      <DynamicIcon name={category.icon} className="size-5" />
    </span>
  );
}

export function MatchScore({ score, className }: { score: number; className?: string }) {
  const color = score >= 85 ? "text-accent bg-accent-soft" : score >= 70 ? "text-primary bg-primary-soft" : "text-amber-700 bg-amber-100";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", color, className)}>{score}%</span>;
}
