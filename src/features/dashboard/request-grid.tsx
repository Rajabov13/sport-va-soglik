"use client";
import { RequestCard } from "@/features/requests/request-card";
import type { RequestListItemDTO } from "@/types/api";

export function RequestGrid({ items, className = "grid gap-3 md:grid-cols-2" }: { items: RequestListItemDTO[]; className?: string }) {
  return (
    <div className={className}>
      {items.map((r) => (
        <RequestCard key={r.id} request={r} />
      ))}
    </div>
  );
}
