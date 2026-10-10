import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, MapPin, Megaphone, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { LinkPagination } from "@/components/shared/link-pagination";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/i18n/server";
import { listOrganizations } from "@/server/services/organizations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("organizations.title"), description: t("organizations.subtitle") };
}

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const [t, data] = await Promise.all([getT(), listOrganizations({ q, page, pageSize: 12 })]);
  return (
    <div className="container py-8 sm:py-12">
      <PageHeader title={t("organizations.title")} subtitle={t("organizations.subtitle")} />
      <SearchForm action="/organizations" q={q} placeholder={t("organizations.searchPlaceholder")} label={t("common.search")} />
      {data.items.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">{t("organizations.empty")}</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((o) => (
            <li key={o.id}>
              <Link href={`/organizations/${o.slug}`} className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Building2 className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{o.name}</p>
                    <Badge variant="success" className="mt-1">
                      <BadgeCheck aria-hidden /> {t("organizations.verified")}
                    </Badge>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{o.description}</p>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {o.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden /> {o.location.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Megaphone className="size-3.5" aria-hidden /> {t("organizations.campaigns", { count: o._count.campaigns })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden /> {t("organizations.members", { count: o._count.members })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <LinkPagination page={data.page} totalPages={data.totalPages} t={t} href={(p) => `/organizations?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
    </div>
  );
}
