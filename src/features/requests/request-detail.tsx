"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarClock, CheckCircle2, Clock, Hourglass, MapPin, MessageCircle, Pencil, Phone, Play, Send, Star, Undo2, Users, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CategoryChip, MatchScore, StatusBadge, UrgencyBadge } from "@/components/shared/badges";
import { DynamicMap } from "@/features/map/dynamic-map";
import { ReportDialog } from "@/features/shared-report-dialog";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { RequestDetail } from "@/server/services/requests";
import type { Serialized } from "@/types/serialize";
import type { MatchBreakdownDTO } from "@/types/api";
import { RequestTimeline } from "./request-timeline";
import { MatchPanel, ScoreBreakdown, type MatchRow } from "./match-panel";
import { ReviewDialog } from "./review-dialog";
import { CompleteDialog } from "./complete-dialog";
import { CelebrationDialog } from "./celebration-dialog";
import { useRequestAction } from "./use-request-action";

export type RequestDetailDTO = Serialized<RequestDetail>;

function Fact({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}

function ActionPanel({ r }: { r: RequestDetailDTO }) {
  const { t } = useI18n();
  const p = r.permissions;
  const [celebrate, setCelebrate] = React.useState<{ xp: number; unlocked: string[] } | null>(null);
  const accept = useRequestAction(r.id, "accept", () => toast.success(t("request.accepted")));
  const decline = useRequestAction(r.id, "decline", () => toast.success(t("request.declined")));
  const start = useRequestAction(r.id, "start", () => toast.success(t("request.started")));
  const withdraw = useRequestAction(r.id, "withdraw", () => toast.success(t("request.withdrawn")));
  const cancel = useRequestAction(r.id, "cancel", () => toast.success(t("request.cancelled")));
  const submit = useRequestAction(r.id, "submit", () => toast.success(t("request.submitted")));
  const confirm = useRequestAction<{ xp: number; unlocked: string[] }>(r.id, "confirm", (data) => setCelebrate({ xp: data.xp, unlocked: data.unlocked }));

  const awaitingConfirm = r.assignment?.status === "COMPLETION_REQUESTED";
  const hasAnything =
    p.canAccept || p.canStart || p.canRequestCompletion || p.canConfirm || p.canReview || p.canWithdraw || p.canChat || p.canSubmit || p.canEdit || p.canCancel || (awaitingConfirm && p.isAssigned);
  if (!hasAnything && !r.moderationNote) return null;

  return (
    <Card className="border-primary/20" data-testid="action-panel">
      <CardContent className="grid gap-3 p-4 sm:p-5">
        {r.status === "PENDING" && r.moderationNote && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("request.moderationPending")}</p>}
        {r.status === "REJECTED" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{t("request.rejectedText")}</p>}
        {p.canConfirm && <p className="rounded-xl bg-accent-soft p-3 text-sm font-medium text-accent">{t("request.awaitingConfirmation")}</p>}
        {awaitingConfirm && p.isAssigned && (
          <p className="flex items-center gap-2 rounded-xl bg-primary-soft p-3 text-sm text-primary">
            <Hourglass className="size-4 shrink-0" aria-hidden /> {t("request.waitingRequester")}
          </p>
        )}
        {r.myMatch && !r.myMatch.declined && p.canAccept && (
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="mb-2 flex items-center justify-between text-sm font-semibold">
              {t("request.yourMatch", { score: r.myMatch.score })} <MatchScore score={r.myMatch.score} />
            </p>
            <ScoreBreakdown breakdown={r.myMatch.breakdown as MatchBreakdownDTO} />
          </div>
        )}

        {p.canSubmit && (
          <Button size="lg" loading={submit.isPending} onClick={() => submit.mutate(undefined)}>
            <Send /> {t("request.submit")}
          </Button>
        )}
        {p.canAccept && (
          <ConfirmDialog
            title={t("request.accept")}
            description={t("request.acceptConfirm")}
            confirmLabel={t("request.accept")}
            cancelLabel={t("common.cancel")}
            loading={accept.isPending}
            onConfirm={() => accept.mutateAsync(undefined).catch(() => undefined)}
            trigger={
              <Button size="lg" variant="accent" data-testid="accept-request">
                <CheckCircle2 /> {t("request.accept")}
              </Button>
            }
          />
        )}
        {p.canDecline && (
          <Button variant="ghost" loading={decline.isPending} onClick={() => decline.mutate(undefined)}>
            {t("request.decline")}
          </Button>
        )}
        {p.canStart && (
          <Button size="lg" loading={start.isPending} onClick={() => start.mutate(undefined)} data-testid="start-request">
            <Play /> {t("request.start")}
          </Button>
        )}
        {p.canRequestCompletion && <CompleteDialog requestId={r.id} estimatedHours={r.estimatedHours} />}
        {p.canConfirm && (
          <ConfirmDialog
            title={t("request.confirm")}
            description={t("request.confirmText")}
            confirmLabel={t("request.confirm")}
            cancelLabel={t("common.cancel")}
            loading={confirm.isPending}
            onConfirm={() => confirm.mutateAsync(undefined).catch(() => undefined)}
            trigger={
              <Button size="lg" variant="accent" data-testid="confirm-completion">
                <CheckCircle2 /> {t("request.confirm")}
              </Button>
            }
          />
        )}
        {p.canReview && <ReviewDialog requestId={r.id} />}
        {p.canChat && r.conversationId && (
          <Button asChild variant="outline">
            <Link href={`/dashboard/messages?c=${r.conversationId}`}>
              <MessageCircle /> {t("request.openChat")}
            </Link>
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          {p.canEdit && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/requests/${r.id}/edit`}>
                <Pencil /> {t("request.edit")}
              </Link>
            </Button>
          )}
          {p.canWithdraw && (
            <ConfirmDialog
              title={t("request.withdraw")}
              description={t("request.withdrawText")}
              confirmLabel={t("request.withdraw")}
              cancelLabel={t("common.cancel")}
              destructive
              loading={withdraw.isPending}
              onConfirm={() => withdraw.mutateAsync(undefined).catch(() => undefined)}
              trigger={
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Undo2 /> {t("request.withdraw")}
                </Button>
              }
            />
          )}
          {p.canCancel && (
            <ConfirmDialog
              title={t("request.cancel")}
              description={t("request.cancelText")}
              confirmLabel={t("request.cancel")}
              cancelLabel={t("common.back")}
              destructive
              loading={cancel.isPending}
              onConfirm={() => cancel.mutateAsync({}).catch(() => undefined)}
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <XCircle /> {t("request.cancel")}
                </Button>
              }
            />
          )}
        </div>
      </CardContent>
      <CelebrationDialog open={!!celebrate} onClose={() => setCelebrate(null)} xp={celebrate?.xp ?? 0} unlocked={celebrate?.unlocked ?? []} />
    </Card>
  );
}

export function RequestDetailView({ initial }: { initial: RequestDetailDTO }) {
  const { t, td, locale } = useI18n();
  const { data: r } = useQuery({
    queryKey: ["request", initial.id],
    queryFn: () => api.get<RequestDetailDTO>(`/api/requests/${initial.id}`),
    initialData: initial,
    refetchInterval: ["MATCHING", "ACCEPTED", "IN_PROGRESS"].includes(initial.status) ? 15_000 : false,
  });

  const backHref = r.permissions.isAssigned ? "/dashboard/volunteer/tasks" : r.permissions.isOwner ? "/dashboard/requests" : "/dashboard/volunteer";

  return (
    <div className="grid gap-5">
      <Link href={backHref} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t("common.back")}
      </Link>

      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={r.category} />
          <StatusBadge status={r.status} />
          <UrgencyBadge urgency={r.urgency} />
        </div>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl" data-testid="request-title">
          {r.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("requests.by", { name: r.organization?.name ?? r.requester.name })} · {relativeTime(locale, r.createdAt)}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 gap-5">
          <div className="lg:hidden">
            <ActionPanel r={r} />
          </div>
          <Card>
            <CardContent className="grid gap-5 p-4 sm:p-6">
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{r.description}</p>
              {r.additionalInfo && (
                <div className="rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{t("request.additional")}</p>
                  <p className="mt-1 whitespace-pre-line text-sm">{r.additionalInfo}</p>
                </div>
              )}
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact icon={CalendarClock} label={t("request.preferredDate")}>
                  {r.preferredDate ? formatDateTime(locale, r.preferredDate) : t("request.noPreferredDate")}
                </Fact>
                <Fact icon={Users} label={t("request.people")}>
                  {t("common.people", { value: r.peopleCount })}
                </Fact>
                <Fact icon={Clock} label={t("request.estimated")}>
                  {t("common.hours", { value: r.estimatedHours })}
                </Fact>
                <Fact icon={Phone} label={t("request.contact")}>
                  {r.contactPreferences.map((c) => t(`contact.${c}`)).join(", ")}
                  {r.contactPhone && <span className="block text-primary">{r.contactPhone}</span>}
                </Fact>
                <Fact icon={MapPin} label={t("request.location")}>
                  {[r.city, r.address].filter(Boolean).join(", ") || "—"}
                  {!r.address && <span className="block text-xs font-normal text-muted-foreground">{t("request.hiddenAddress")}</span>}
                </Fact>
                {r.campaign && (
                  <Fact icon={Star} label={t("request.campaign")}>
                    <Link href={`/campaigns/${r.campaign.slug}`} className="text-primary hover:underline">
                      {r.campaign.title}
                    </Link>
                  </Fact>
                )}
              </dl>
              {r.images.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">{t("request.images")}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {r.images.map((img) => (
                      <Dialog key={img.id}>
                        <DialogTrigger className="aspect-square overflow-hidden rounded-xl border bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" loading="lazy" className="size-full object-cover transition hover:scale-105" />
                        </DialogTrigger>
                        <DialogContent closeLabel={t("common.close")} className="sm:max-w-3xl">
                          <DialogTitle className="sr-only">{t("request.images")}</DialogTitle>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" className="max-h-[75dvh] w-full rounded-xl object-contain" />
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </div>
              )}
              <div className="h-56 overflow-hidden rounded-xl border">
                <DynamicMap
                  ariaLabel={t("request.location")}
                  center={[r.latitude, r.longitude]}
                  zoom={r.address ? 15 : 13}
                  scrollWheelZoom={false}
                  className="size-full"
                  markers={[{ id: r.id, lat: r.latitude, lng: r.longitude, kind: "request", color: r.category.color, label: r.title }]}
                />
              </div>
              {!r.address && <p className="-mt-3 text-xs text-muted-foreground">{t("requests.approxLocation")}</p>}
            </CardContent>
          </Card>

          {(r.permissions.isOwner || r.matches.length > 0) && ["MATCHING", "VERIFIED"].includes(r.status) && <MatchPanel matches={r.matches as unknown as MatchRow[]} />}

          {r.reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("request.reviews")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {r.reviews.map((rv) => (
                  <div key={rv.id} className="flex gap-3 rounded-xl border p-3" data-testid="review-item">
                    <Avatar name={rv.author.name} src={rv.author.avatarUrl} className="size-9" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{rv.author.name}</p>
                      <p className="flex gap-0.5" aria-label={`${rv.rating} ★`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`size-3.5 ${i < rv.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} aria-hidden />
                        ))}
                      </p>
                      {rv.comment && <p className="mt-1 text-sm text-muted-foreground">{rv.comment}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="grid h-fit min-w-0 gap-5 lg:sticky lg:top-24">
          <div className="hidden lg:block">
            <ActionPanel r={r} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("request.timeline")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestTimeline status={r.status} timeline={r.timeline} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-4 p-4 sm:p-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("request.requester")}</p>
                <div className="flex items-center gap-3">
                  <Avatar name={r.requester.name} src={r.requester.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.organization?.name ?? r.requester.name}</p>
                    {r.requester.phone && <p className="text-xs text-muted-foreground">{r.requester.phone}</p>}
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("request.volunteer")}</p>
                {r.assignment ? (
                  <Link href={`/volunteers/${r.assignment.volunteer.id}`} className="flex items-center gap-3 rounded-xl hover:bg-secondary/60">
                    <Avatar name={r.assignment.volunteer.name} src={r.assignment.volunteer.avatarUrl} />
                    <div className="min-w-0">
                      <p className="truncate font-medium" data-testid="assigned-volunteer">{r.assignment.volunteer.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                        {t("request.rating", { rating: r.assignment.volunteer.ratingAvg.toFixed(1), count: r.assignment.volunteer.completedCount })}
                      </p>
                      <p className="text-xs text-primary">{td(`assignmentStatus.${r.assignment.status}`)}</p>
                    </div>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("request.noVolunteer")}</p>
                )}
                {r.assignment?.volunteerNote && <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">{r.assignment.volunteerNote}</p>}
              </div>
            </CardContent>
          </Card>
          {r.permissions.canReport && (
            <div className="flex justify-end">
              <ReportDialog targetType="REQUEST" targetId={r.id} defaultReason="FAKE_REQUEST" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
