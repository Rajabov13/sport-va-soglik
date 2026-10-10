import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/shared/search-form";
import { LinkPagination } from "@/components/shared/link-pagination";
import { CampaignCard } from "@/features/campaigns/campaign-card";
import { getLocale, getT } from "@/i18n/server";
import { listCampaigns } from "@/server/services/organizations";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("campaigns.title"), description: t("campaigns.subtitle") };
}

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const status = sp.status === "COMPLETED" ? "COMPLETED" : "ACTIVE";
  const page = Math.max(1, Number(sp.page) || 1);
  const [t, locale, data] = await Promise.all([getT(), getLocale(), listCampaigns({ q, status, page, pageSize: 12 })]);
  const tab = (s: "ACTIVE" | "COMPLETED", label: string) => (
    <Link
      href={`/campaigns?${new URLSearchParams({ ...(q ? { q } : {}), status: s })}`}
      aria-current={status === s ? "page" : undefined}
      className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", status === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
    >
      {label}
    </Link>
  );
  return (
    <div className="container py-8 sm:py-12">
      <PageHeader title={t("campaigns.title")} subtitle={t("campaigns.subtitle")} />
      <div className="grid gap-3">
        <div className="inline-flex w-fit gap-1 rounded-xl bg-secondary p-1">
          {tab("ACTIVE", t("campaigns.active"))}
          {tab("COMPLETED", t("campaigns.completed"))}
        </div>
        <SearchForm action="/campaigns" q={q} placeholder={t("campaigns.searchPlaceholder")} label={t("common.search")} extra={<input type="hidden" name="status" value={status} />} />
      </div>
      {data.items.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">{t("campaigns.empty")}</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((c) => (
            <li key={c.id}>
              <CampaignCard c={c} t={t} locale={locale} />
            </li>
          ))}
        </ul>
      )}
      <LinkPagination page={data.page} totalPages={data.totalPages} t={t} href={(p) => `/campaigns?${new URLSearchParams({ ...(q ? { q } : {}), status, page: String(p) })}`} />
    </div>
  );
}
