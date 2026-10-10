import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Translator } from "@/i18n/translate";

/** Server-rendered pagination using query-string links. */
export function LinkPagination({ page, totalPages, href, t }: { page: number; totalPages: number; href: (page: number) => string; t: Translator }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="pagination">
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)}>
            <ChevronLeft /> {t("common.previous")}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">{t("common.page", { page, total: totalPages })}</span>
      {page < totalPages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)}>
            {t("common.next")} <ChevronRight />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
