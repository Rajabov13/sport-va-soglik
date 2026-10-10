import type { Prisma, RequestStatus } from "@prisma/client";
import { asStringArray } from "@/lib/utils";
import type { CONTACT_METHODS } from "@/schemas/request";
import { db, type Tx } from "@/server/db";
import { ApiError, Errors } from "@/server/http/errors";
import type { SessionUser } from "@/server/auth/session";
import {
  canCancelRequest,
  canEditRequest,
  canSeeMatches,
  canViewRequest,
  canViewRequestPrivate,
  hasPermission,
  isAssignedVolunteer,
  isRequestOwner,
} from "@/server/auth/permissions";
import { canTransition, OPEN_STATUSES } from "@/server/domain/request-status";
import { moderateRequest } from "@/server/domain/moderation";
import type { CompleteInput, CreateRequestInput, RequestListQuery, ReviewInput, UpdateRequestInput } from "@/schemas/request";
import { computeMatches } from "./matching";
import { notify } from "./notifications";
import { audit } from "./audit";
import { evaluateAchievements, recordAcceptance, recordCancellation, recordCompletion, recordReview } from "./reputation";

type Actor = Pick<SessionUser, "id" | "role">;

const URGENCY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// ───────────────────────────── helpers ─────────────────────────────

async function transition(
  tx: Tx,
  requestId: string,
  from: RequestStatus[],
  to: RequestStatus,
  actorId: string | null,
  extra: Prisma.RequestUpdateManyMutationInput = {},
  note?: string,
) {
  const allowedFrom = from.filter((f) => canTransition(f, to));
  if (allowedFrom.length === 0) throw Errors.invalidTransition();
  const current = await tx.request.findFirst({ where: { id: requestId, deletedAt: null }, select: { status: true } });
  if (!current) throw Errors.notFound();
  const res = await tx.request.updateMany({
    where: { id: requestId, status: { in: allowedFrom }, deletedAt: null },
    data: { status: to, ...extra },
  });
  if (res.count === 0) throw Errors.invalidTransition();
  await tx.requestStatusHistory.create({
    data: { requestId, fromStatus: current.status, toStatus: to, actorId, note },
  });
}

async function attachImages(tx: Tx, uploaderId: string, requestId: string, imageIds: string[]) {
  if (imageIds.length === 0) return;
  await tx.requestImage.updateMany({
    where: { id: { in: imageIds }, uploaderId, OR: [{ requestId: null }, { requestId }] },
    data: { requestId },
  });
}

async function resolveOrganizationId(actor: Actor) {
  if (actor.role !== "ORGANIZATION") return null;
  const org = await db.organization.findFirst({ where: { ownerId: actor.id, deletedAt: null }, select: { id: true } });
  return org?.id ?? null;
}

/**
 * Submit a request: automated checks → auto-verify → matching.
 * Flagged requests stay PENDING for admin moderation.
 */
async function submit(requestId: string, actorId: string) {
  const request = await db.request.findUniqueOrThrow({ where: { id: requestId } });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent, openReports, duplicate] = await Promise.all([
    db.request.count({ where: { requesterId: request.requesterId, createdAt: { gte: since }, id: { not: requestId } } }),
    db.report.count({ where: { reportedUserId: request.requesterId, status: "OPEN" } }),
    db.request.count({
      where: {
        requesterId: request.requesterId,
        title: { equals: request.title },
        id: { not: requestId },
        createdAt: { gte: since },
        deletedAt: null,
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
    }),
  ]);

  const result = moderateRequest({
    title: request.title,
    description: request.description,
    additionalInfo: request.additionalInfo,
    recentRequestsByUser: recent,
    openReportsAgainstUser: openReports,
    duplicateTitle: duplicate > 0,
  });

  await db.$transaction(async (tx) => {
    await transition(tx, requestId, ["DRAFT"], "PENDING", actorId, { submittedAt: new Date() });
    if (result.approved) {
      await transition(tx, requestId, ["PENDING"], "VERIFIED", null, { verifiedAt: new Date() }, "auto");
      await transition(tx, requestId, ["VERIFIED"], "MATCHING", null, { matchingAt: new Date() });
    } else {
      await tx.request.update({ where: { id: requestId }, data: { moderationNote: result.flags.join(",") } });
    }
  });

  if (result.approved) await computeMatches(requestId);
  return result;
}

/** Called by moderation once an admin approves a pending request. */
export async function approvePendingRequest(requestId: string, adminId: string) {
  await db.$transaction(async (tx) => {
    await transition(tx, requestId, ["PENDING"], "VERIFIED", adminId, { verifiedAt: new Date(), moderationNote: null });
    await transition(tx, requestId, ["VERIFIED"], "MATCHING", null, { matchingAt: new Date() });
  });
  await computeMatches(requestId);
}

export async function rejectRequest(requestId: string, adminId: string, note?: string) {
  const request = await db.request.findUniqueOrThrow({ where: { id: requestId } });
  await db.$transaction(async (tx) => {
    await transition(tx, requestId, ["PENDING", "VERIFIED", "MATCHING"], "REJECTED", adminId, { moderationNote: note ?? null }, note);
  });
  await notify(request.requesterId, "REQUEST_MODERATED", { title: request.title, status: "REJECTED" }, `/dashboard/requests/${requestId}`);
}

// ───────────────────────────── create / update ─────────────────────────────

export async function createRequest(actor: Actor, input: CreateRequestInput) {
  if (!hasPermission(actor.role, "request:create")) throw Errors.forbidden();

  const category = await db.category.findFirst({ where: { id: input.categoryId, isActive: true, deletedAt: null } });
  if (!category) throw Errors.validation({ categoryId: ["required"] });

  let campaignId: string | null = null;
  const organizationId = await resolveOrganizationId(actor);
  if (input.campaignId) {
    const campaign = await db.campaign.findFirst({ where: { id: input.campaignId, deletedAt: null } });
    // Only the organization owning the campaign may attach requests to it.
    if (!campaign || campaign.organizationId !== organizationId) throw Errors.validation({ campaignId: ["required"] });
    campaignId = campaign.id;
  }

  const request = await db.$transaction(async (tx) => {
    const created = await tx.request.create({
      data: {
        requesterId: actor.id,
        organizationId,
        campaignId,
        categoryId: category.id,
        title: input.title,
        description: input.description,
        urgency: input.urgency,
        status: "DRAFT",
        address: input.address,
        locationId: input.locationId || null,
        latitude: input.latitude,
        longitude: input.longitude,
        preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
        contactPreferences: input.contactPreferences,
        contactPhone: input.contactPhone || null,
        additionalInfo: input.additionalInfo ?? null,
        peopleCount: input.peopleCount,
        estimatedHours: input.estimatedHours,
      },
    });
    await tx.requestStatusHistory.create({ data: { requestId: created.id, toStatus: "DRAFT", actorId: actor.id } });
    await attachImages(tx, actor.id, created.id, input.imageIds);
    await audit({ actorId: actor.id, action: "request.create", entityType: "Request", entityId: created.id }, tx);
    return created;
  });

  const moderation = input.asDraft ? null : await submit(request.id, actor.id);
  const fresh = await db.request.findUniqueOrThrow({ where: { id: request.id }, select: { id: true, status: true } });
  return { ...fresh, moderation };
}

export async function submitDraft(actor: Actor, id: string) {
  const request = await db.request.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw Errors.notFound();
  if (!isRequestOwner(actor, request)) throw Errors.forbidden();
  if (request.status !== "DRAFT") throw Errors.invalidTransition();
  return submit(id, actor.id);
}

const MATCH_FIELDS = ["categoryId", "urgency", "latitude", "longitude", "preferredDate"] as const;

export async function updateRequest(actor: Actor, id: string, input: UpdateRequestInput) {
  const request = await db.request.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw Errors.notFound();
  if (!canEditRequest(actor, request)) throw Errors.forbidden();

  if (input.categoryId) {
    const category = await db.category.findFirst({ where: { id: input.categoryId, isActive: true } });
    if (!category) throw Errors.validation({ categoryId: ["required"] });
  }

  const { imageIds, asDraft: _asDraft, campaignId: _campaignId, preferredDate, contactPhone, locationId, ...rest } = input;
  await db.$transaction(async (tx) => {
    await tx.request.update({
      where: { id },
      data: {
        ...rest,
        ...(preferredDate !== undefined ? { preferredDate: preferredDate ? new Date(preferredDate) : null } : {}),
        ...(contactPhone !== undefined ? { contactPhone: contactPhone || null } : {}),
        ...(locationId !== undefined ? { locationId: locationId || null } : {}),
      },
    });
    if (imageIds) {
      await tx.requestImage.updateMany({ where: { requestId: id, id: { notIn: imageIds } }, data: { requestId: null } });
      await attachImages(tx, request.requesterId, id, imageIds);
    }
    await audit({ actorId: actor.id, action: "request.update", entityType: "Request", entityId: id }, tx);
  });

  const matchingChanged = MATCH_FIELDS.some((f) => input[f] !== undefined);
  if (matchingChanged && request.status === "MATCHING") await computeMatches(id, { notify: true });
  return { id };
}

// ───────────────────────────── queries ─────────────────────────────

const listInclude = {
  category: true,
  location: true,
  images: { take: 1, orderBy: { createdAt: "asc" } },
  requester: { select: { id: true, name: true, avatarUrl: true } },
  organization: { select: { id: true, name: true, slug: true } },
  _count: { select: { matches: true } },
} satisfies Prisma.RequestInclude;

type ListRow = Prisma.RequestGetPayload<{ include: typeof listInclude }>;

function toListItem(r: ListRow, privateView: boolean, score?: number | null) {
  return {
    id: r.id,
    title: r.title,
    description: r.description.slice(0, 220),
    status: r.status,
    urgency: r.urgency,
    category: { id: r.category.id, slug: r.category.slug, icon: r.category.icon, color: r.category.color, nameUz: r.category.nameUz, nameRu: r.category.nameRu, nameEn: r.category.nameEn },
    city: r.location?.city ?? null,
    address: privateView ? r.address : null,
    latitude: privateView ? r.latitude : Math.round(r.latitude * 100) / 100,
    longitude: privateView ? r.longitude : Math.round(r.longitude * 100) / 100,
    preferredDate: r.preferredDate,
    peopleCount: r.peopleCount,
    imageUrl: r.images[0]?.url ?? null,
    requester: privateView ? r.requester : { id: r.requester.id, name: r.requester.name.split(" ")[0], avatarUrl: r.requester.avatarUrl },
    organization: r.organization,
    matchCount: r._count.matches,
    matchScore: score ?? null,
    createdAt: r.createdAt,
  };
}

export type RequestListItem = ReturnType<typeof toListItem>;

export async function listRequests(actor: Actor, q: RequestListQuery) {
  const where: Prisma.RequestWhereInput = { deletedAt: null };
  if (q.scope === "mine") {
    where.requesterId = actor.id;
  } else if (q.scope === "open") {
    if (!hasPermission(actor.role, "request:browse")) throw Errors.forbidden();
    where.status = { in: OPEN_STATUSES };
    where.requesterId = { not: actor.id };
  } else {
    if (actor.role !== "ADMIN") throw Errors.forbidden();
  }
  if (q.status && q.scope !== "open") where.status = q.status;
  if (q.category) where.category = { slug: q.category };
  if (q.urgency) where.urgency = q.urgency;
  if (q.q) {
    where.OR = [
      { title: { contains: q.q } },
      { description: { contains: q.q } },
      { address: { contains: q.q } },
    ];
  }

  const orderBy: Prisma.RequestOrderByWithRelationInput[] =
    q.sort === "oldest" ? [{ createdAt: "asc" }] : [{ createdAt: "desc" }];

  const [rows, total] = await Promise.all([
    db.request.findMany({
      where,
      include: listInclude,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    db.request.count({ where }),
  ]);

  let scores = new Map<string, number>();
  if (q.scope === "open" && actor.role === "VOLUNTEER") {
    const matches = await db.requestMatch.findMany({
      where: { volunteerId: actor.id, requestId: { in: rows.map((r) => r.id) } },
      select: { requestId: true, score: true, declinedAt: true },
    });
    scores = new Map(matches.filter((m) => !m.declinedAt).map((m) => [m.requestId, m.score]));
  }

  let items = rows.map((r) => toListItem(r, q.scope !== "open" || actor.role === "ADMIN", scores.get(r.id)));
  if (q.sort === "urgency") items = items.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

/** Requests matched to a volunteer, best score first. */
export async function listMatchesForVolunteer(volunteerId: string, limit = 20) {
  const matches = await db.requestMatch.findMany({
    where: { volunteerId, declinedAt: null, request: { status: { in: OPEN_STATUSES }, deletedAt: null } },
    orderBy: [{ score: "desc" }],
    take: limit,
    include: { request: { include: listInclude } },
  });
  return matches.map((m) => ({ ...toListItem(m.request, false, m.score), breakdown: m.breakdown }));
}

const detailInclude = {
  category: true,
  location: true,
  images: { orderBy: { createdAt: "asc" } },
  requester: { select: { id: true, name: true, avatarUrl: true, email: true, phone: true, createdAt: true } },
  organization: { select: { id: true, name: true, slug: true, status: true } },
  campaign: { select: { id: true, title: true, slug: true } },
  assignments: {
    orderBy: { acceptedAt: "desc" },
    include: {
      volunteer: {
        select: { id: true, name: true, avatarUrl: true, volunteerProfile: { select: { ratingAvg: true, ratingCount: true, completedCount: true } } },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: "asc" } },
  reviews: { where: { deletedAt: null }, include: { author: { select: { id: true, name: true, avatarUrl: true } } } },
  conversation: { select: { id: true } },
} satisfies Prisma.RequestInclude;

export async function getRequestDetail(actor: SessionUser | null, id: string) {
  const r = await db.request.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
  if (!r) throw Errors.notFound();
  if (!canViewRequest(actor, r)) throw actor ? Errors.forbidden() : Errors.unauthorized();

  const isOwner = !!actor && isRequestOwner(actor, r);
  const assigned = !!actor && isAssignedVolunteer(actor, r);
  const privateView = !!actor && canViewRequestPrivate(actor, r);
  const activeAssignment = r.assignments.find((a) => a.status !== "CANCELLED") ?? null;

  let matches: { volunteerId: string; name: string; avatarUrl: string | null; score: number; rank: number; breakdown: unknown; completedCount: number; ratingAvg: number }[] = [];
  if (actor && canSeeMatches(actor, r)) {
    const rows = await db.requestMatch.findMany({
      where: { requestId: id, declinedAt: null },
      orderBy: { rank: "asc" },
      take: 10,
      include: { volunteer: { select: { id: true, name: true, avatarUrl: true, volunteerProfile: { select: { completedCount: true, ratingAvg: true } } } } },
    });
    matches = rows.map((m) => ({
      volunteerId: m.volunteerId,
      name: m.volunteer.name,
      avatarUrl: m.volunteer.avatarUrl,
      score: m.score,
      rank: m.rank,
      breakdown: m.breakdown,
      completedCount: m.volunteer.volunteerProfile?.completedCount ?? 0,
      ratingAvg: m.volunteer.volunteerProfile?.ratingAvg ?? 0,
    }));
  }

  let myMatch: { score: number; breakdown: unknown; declined: boolean } | null = null;
  if (actor?.role === "VOLUNTEER") {
    const m = await db.requestMatch.findUnique({ where: { requestId_volunteerId: { requestId: id, volunteerId: actor.id } } });
    if (m) myMatch = { score: m.score, breakdown: m.breakdown, declined: !!m.declinedAt };
  }

  const myReview = actor ? r.reviews.find((rv) => rv.authorId === actor.id) ?? null : null;
  const isVolunteer = actor?.role === "VOLUNTEER";

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    urgency: r.urgency,
    category: r.category,
    location: r.location,
    city: r.location?.city ?? null,
    address: privateView ? r.address : null,
    latitude: privateView ? r.latitude : Math.round(r.latitude * 100) / 100,
    longitude: privateView ? r.longitude : Math.round(r.longitude * 100) / 100,
    preferredDate: r.preferredDate,
    contactPreferences: asStringArray(r.contactPreferences) as (typeof CONTACT_METHODS)[number][],
    contactPhone: privateView ? r.contactPhone : null,
    additionalInfo: r.additionalInfo,
    peopleCount: r.peopleCount,
    estimatedHours: r.estimatedHours,
    moderationNote: isOwner || actor?.role === "ADMIN" ? r.moderationNote : null,
    images: r.images.map((i) => ({ id: i.id, url: i.url })),
    requester: privateView
      ? { id: r.requester.id, name: r.requester.name, avatarUrl: r.requester.avatarUrl, email: r.requester.email, phone: r.requester.phone }
      : { id: r.requester.id, name: r.requester.name.split(" ")[0], avatarUrl: r.requester.avatarUrl, email: null, phone: null },
    organization: r.organization,
    campaign: r.campaign,
    assignment: activeAssignment
      ? {
          id: activeAssignment.id,
          status: activeAssignment.status,
          acceptedAt: activeAssignment.acceptedAt,
          startedAt: activeAssignment.startedAt,
          completionRequestedAt: activeAssignment.completionRequestedAt,
          completedAt: activeAssignment.completedAt,
          hoursSpent: activeAssignment.hoursSpent,
          volunteerNote: activeAssignment.volunteerNote,
          volunteer: {
            id: activeAssignment.volunteer.id,
            name: activeAssignment.volunteer.name,
            avatarUrl: activeAssignment.volunteer.avatarUrl,
            ratingAvg: activeAssignment.volunteer.volunteerProfile?.ratingAvg ?? 0,
            ratingCount: activeAssignment.volunteer.volunteerProfile?.ratingCount ?? 0,
            completedCount: activeAssignment.volunteer.volunteerProfile?.completedCount ?? 0,
          },
        }
      : null,
    timeline: r.statusHistory.map((h) => ({ status: h.toStatus, at: h.createdAt, note: h.note })),
    reviews: r.reviews.map((rv) => ({ id: rv.id, rating: rv.rating, comment: rv.comment, createdAt: rv.createdAt, author: rv.author, targetId: rv.targetId })),
    conversationId: privateView ? r.conversation?.id ?? null : null,
    matches,
    myMatch,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    permissions: {
      isOwner,
      isAssigned: assigned,
      canEdit: !!actor && canEditRequest(actor, r) && !["ACCEPTED", "IN_PROGRESS"].includes(r.status),
      canSubmit: isOwner && r.status === "DRAFT",
      canCancel: !!actor && canCancelRequest(actor, r),
      canAccept: isVolunteer && OPEN_STATUSES.includes(r.status) && !isOwner,
      canDecline: isVolunteer && OPEN_STATUSES.includes(r.status) && !!myMatch && !myMatch.declined,
      canStart: assigned && r.status === "ACCEPTED",
      canRequestCompletion: assigned && r.status === "IN_PROGRESS" && activeAssignment?.status === "ACTIVE",
      canWithdraw: assigned && ["ACCEPTED", "IN_PROGRESS"].includes(r.status) && activeAssignment?.status === "ACTIVE",
      canConfirm: (isOwner || actor?.role === "ADMIN") && r.status === "IN_PROGRESS" && activeAssignment?.status === "COMPLETION_REQUESTED",
      canReview: r.status === "COMPLETED" && (isOwner || assigned) && !myReview,
      canReport: !!actor && !isOwner,
      canChat: privateView && !!r.conversation,
    },
  };
}

export type RequestDetail = Awaited<ReturnType<typeof getRequestDetail>>;

// ───────────────────────────── lifecycle ─────────────────────────────

export async function acceptRequest(actor: Actor, id: string) {
  if (!hasPermission(actor.role, "request:accept")) throw Errors.forbidden();
  const profile = await db.volunteerProfile.findUnique({ where: { userId: actor.id } });
  if (!profile) throw Errors.forbidden();

  const request = await db.request.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw Errors.notFound();
  if (request.requesterId === actor.id) throw Errors.forbidden();

  const now = new Date();
  const responseMinutes = request.matchingAt ? (now.getTime() - request.matchingAt.getTime()) / 60000 : 0;

  await db.$transaction(async (tx) => {
      const res = await tx.request.updateMany({
        where: { id, status: { in: OPEN_STATUSES }, deletedAt: null },
        data: { status: "ACCEPTED", acceptedAt: now },
      });
      // Atomic guard: only one volunteer can win the race.
      if (res.count === 0) throw new ApiError(409, "alreadyAssigned");
      await tx.requestStatusHistory.create({ data: { requestId: id, fromStatus: request.status, toStatus: "ACCEPTED", actorId: actor.id } });
      await tx.requestAssignment.create({
        data: { requestId: id, volunteerId: actor.id, responseMinutes: Math.round(responseMinutes * 10) / 10, acceptedAt: now },
      });
      const conversation = await tx.conversation.upsert({
        where: { requestId: id },
        update: {},
        create: { requestId: id },
      });
      for (const userId of [request.requesterId, actor.id]) {
        await tx.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId: conversation.id, userId } },
          update: {},
          create: { conversationId: conversation.id, userId },
        });
      }
      await recordAcceptance(tx, actor.id, responseMinutes);
      await audit({ actorId: actor.id, action: "request.accept", entityType: "Request", entityId: id }, tx);
  });

  const volunteer = await db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true } });
  await notify(request.requesterId, "REQUEST_ACCEPTED", { title: request.title, volunteer: volunteer.name }, `/dashboard/requests/${id}`);
  await evaluateAchievements(actor.id);
  return { id, status: "ACCEPTED" as const };
}

async function loadAssigned(actor: Actor, id: string) {
  const request = await db.request.findFirst({
    where: { id, deletedAt: null },
    include: { assignments: { where: { status: { not: "CANCELLED" } } } },
  });
  if (!request) throw Errors.notFound();
  const assignment = request.assignments.find((a) => a.volunteerId === actor.id);
  if (!assignment) throw Errors.forbidden();
  return { request, assignment };
}

export async function startRequest(actor: Actor, id: string) {
  const { request, assignment } = await loadAssigned(actor, id);
  await db.$transaction(async (tx) => {
    await transition(tx, id, ["ACCEPTED"], "IN_PROGRESS", actor.id, { startedAt: new Date() });
    await tx.requestAssignment.update({ where: { id: assignment.id }, data: { startedAt: new Date() } });
  });
  await notify(request.requesterId, "STATUS_CHANGED", { title: request.title, status: "IN_PROGRESS" }, `/dashboard/requests/${id}`);
  return { id, status: "IN_PROGRESS" as const };
}

export async function requestCompletion(actor: Actor, id: string, input: CompleteInput) {
  const { request, assignment } = await loadAssigned(actor, id);
  if (request.status !== "IN_PROGRESS" || assignment.status !== "ACTIVE") throw Errors.invalidTransition();
  await db.requestAssignment.update({
    where: { id: assignment.id },
    data: { status: "COMPLETION_REQUESTED", completionRequestedAt: new Date(), hoursSpent: input.hoursSpent, volunteerNote: input.note ?? null },
  });
  await notify(request.requesterId, "COMPLETION_REQUESTED", { title: request.title }, `/dashboard/requests/${id}`);
  return { id };
}

export async function withdrawFromRequest(actor: Actor, id: string) {
  const { request, assignment } = await loadAssigned(actor, id);
  if (assignment.status !== "ACTIVE") throw Errors.invalidTransition();
  await db.$transaction(async (tx) => {
    await transition(tx, id, ["ACCEPTED", "IN_PROGRESS"], "MATCHING", actor.id, { acceptedAt: null, startedAt: null, matchingAt: new Date() }, "withdrawn");
    await tx.requestAssignment.update({ where: { id: assignment.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await tx.requestMatch.updateMany({ where: { requestId: id, volunteerId: actor.id }, data: { declinedAt: new Date() } });
    // A volunteer who withdraws loses access to the private conversation.
    await tx.conversationParticipant.deleteMany({ where: { conversation: { requestId: id }, userId: actor.id } });
    await recordCancellation(tx, actor.id);
  });
  await notify(request.requesterId, "STATUS_CHANGED", { title: request.title, status: "MATCHING" }, `/dashboard/requests/${id}`);
  await computeMatches(id);
  return { id, status: "MATCHING" as const };
}

/** Requester (or admin) confirms that help was delivered → COMPLETED + reputation + achievements. */
export async function confirmCompletion(actor: Actor, id: string) {
  const request = await db.request.findFirst({
    where: { id, deletedAt: null },
    include: { assignments: { where: { status: "COMPLETION_REQUESTED" } } },
  });
  if (!request) throw Errors.notFound();
  if (request.requesterId !== actor.id && actor.role !== "ADMIN") throw Errors.forbidden();
  const assignment = request.assignments[0];
  if (!assignment || request.status !== "IN_PROGRESS") throw Errors.invalidTransition();

  const hours = assignment.hoursSpent ?? request.estimatedHours;
  let xp = 0;
  await db.$transaction(async (tx) => {
    await transition(tx, id, ["IN_PROGRESS"], "COMPLETED", actor.id, { completedAt: new Date() });
    await tx.requestAssignment.update({ where: { id: assignment.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    xp = await recordCompletion(tx, assignment.volunteerId, { urgency: request.urgency, hours, peopleCount: request.peopleCount });
    await audit({ actorId: actor.id, action: "request.complete", entityType: "Request", entityId: id }, tx);
  });

  await notify(assignment.volunteerId, "REQUEST_COMPLETED", { title: request.title, xp }, `/dashboard/requests/${id}`);
  const unlocked = await evaluateAchievements(assignment.volunteerId);
  return { id, status: "COMPLETED" as const, xp, unlocked };
}

export async function cancelRequest(actor: Actor, id: string, reason?: string) {
  const request = await db.request.findFirst({
    where: { id, deletedAt: null },
    include: { assignments: { where: { status: { in: ["ACTIVE", "COMPLETION_REQUESTED"] } } } },
  });
  if (!request) throw Errors.notFound();
  if (!canCancelRequest(actor, request)) throw Errors.forbidden();
  await db.$transaction(async (tx) => {
    await transition(tx, id, [request.status], "CANCELLED", actor.id, { cancelledAt: new Date() }, reason);
    await tx.requestAssignment.updateMany({ where: { requestId: id, status: { in: ["ACTIVE", "COMPLETION_REQUESTED"] } }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  });
  for (const a of request.assignments) {
    await notify(a.volunteerId, "STATUS_CHANGED", { title: request.title, status: "CANCELLED" }, `/dashboard/requests/${id}`);
  }
  return { id, status: "CANCELLED" as const };
}

export async function declineMatch(actor: Actor, id: string) {
  if (actor.role !== "VOLUNTEER") throw Errors.forbidden();
  const res = await db.requestMatch.updateMany({ where: { requestId: id, volunteerId: actor.id, declinedAt: null }, data: { declinedAt: new Date() } });
  if (res.count === 0) throw Errors.notFound();
  return { id };
}

export async function reviewRequest(actor: Actor, id: string, input: ReviewInput) {
  const request = await db.request.findFirst({
    where: { id, deletedAt: null },
    include: { assignments: { where: { status: "COMPLETED" } } },
  });
  if (!request) throw Errors.notFound();
  if (request.status !== "COMPLETED") throw Errors.invalidTransition();
  const assignment = request.assignments[0];
  if (!assignment) throw Errors.invalidTransition();

  let targetId: string;
  if (actor.id === request.requesterId) targetId = assignment.volunteerId;
  else if (actor.id === assignment.volunteerId) targetId = request.requesterId;
  else throw Errors.forbidden();

  const existing = await db.review.findUnique({ where: { requestId_authorId: { requestId: id, authorId: actor.id } } });
  if (existing) throw new ApiError(409, "alreadyReviewed");

  const review = await db.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: { requestId: id, authorId: actor.id, targetId, rating: input.rating, comment: input.comment ?? null },
    });
    await recordReview(tx, targetId, input.rating);
    return created;
  });

  const author = await db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true } });
  await notify(targetId, "NEW_REVIEW", { title: request.title, rating: input.rating, author: author.name }, `/dashboard/requests/${id}`);
  await evaluateAchievements(targetId);
  return review;
}

export async function deleteRequest(actor: Actor, id: string) {
  const request = await db.request.findFirst({ where: { id, deletedAt: null } });
  if (!request) throw Errors.notFound();
  const ownerDraft = isRequestOwner(actor, request) && request.status === "DRAFT";
  if (!ownerDraft && actor.role !== "ADMIN") throw Errors.forbidden();
  await db.request.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, action: "request.delete", entityType: "Request", entityId: id });
  return { id };
}

/** Volunteer's own assignments, grouped by state. */
export async function listVolunteerTasks(volunteerId: string, status: "active" | "completed" | "all" = "all") {
  const where: Prisma.RequestAssignmentWhereInput = { volunteerId };
  if (status === "active") where.status = { in: ["ACTIVE", "COMPLETION_REQUESTED"] };
  if (status === "completed") where.status = "COMPLETED";
  const rows = await db.requestAssignment.findMany({
    where,
    orderBy: { acceptedAt: "desc" },
    take: 50,
    include: { request: { include: listInclude } },
  });
  return rows.map((a) => ({
    assignmentId: a.id,
    assignmentStatus: a.status,
    acceptedAt: a.acceptedAt,
    completedAt: a.completedAt,
    hoursSpent: a.hoursSpent,
    request: toListItem(a.request, true),
  }));
}
