import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RequestDetailView } from "@/features/requests/request-detail";
import { requireUser } from "@/server/auth/current-user";
import { getRequestDetail } from "@/server/services/requests";
import { ApiError } from "@/server/http/errors";
import { serialize } from "@/types/serialize";
import { db } from "@/server/db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await db.request.findFirst({ where: { id, deletedAt: null }, select: { title: true } });
  return { title: r?.title ?? "404", robots: { index: false } };
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/requests/${id}`);
  let detail;
  try {
    detail = await getRequestDetail(user, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    redirect("/forbidden");
  }
  return <RequestDetailView initial={serialize(detail)} />;
}
