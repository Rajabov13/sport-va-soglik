import type { OrganizationStatus, Prisma, ReportStatus, RequestStatus, Role } from "@prisma/client";
import { db } from "@/server/db";
import { Errors } from "@/server/http/errors";
import { destroyAllSessions } from "@/server/auth/session";
import type { CategoryInput } from "@/schemas/misc";
import { DEFAULT_CENTER } from "@/lib/geo";
import { asStringArray } from "@/lib/utils";
import { approvePendingRequest, rejectRequest } from "./requests";
import { computeMatches } from "./matching";
import { notify } from "./notifications";
import { audit } from "./audit";

export async function getAdminOverview() {
  const [users, volunteers, organizations, requests, pending, completed, reports, pendingOrgs, recentAudit] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null, role: "VOLUNTEER" } }),
    db.organization.count({ where: { deletedAt: null } }),
    db.request.count({ where: { deletedAt: null, status: { not: "DRAFT" } } }),
    db.request.count({ where: { deletedAt: null, status: "PENDING" } }),
    db.request.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.organization.count({ where: { deletedAt: null, status: "PENDING" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
  ]);
  return { users, volunteers, organizations, requests, pending, completed, reports, pendingOrgs, recentAudit };
}

// ───────────── users ─────────────

export async function adminListUsers(q: { q?: string; role?: Role; status?: string; page: number; pageSize: number; sort: "newest" | "oldest" | "name" }) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(q.role ? { role: q.role } : {}),
    ...(q.status === "ACTIVE" || q.status === "SUSPENDED" ? { status: q.status } : {}),
    ...(q.q ? { OR: [{ name: { contains: q.q } }, { email: { contains: q.q } }] } : {}),
  };
  const orderBy: Prisma.UserOrderByWithRelationInput = q.sort === "name" ? { name: "asc" } : { createdAt: q.sort === "oldest" ? "asc" : "desc" };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true, name: true, email: true, role: true, status: true, createdAt: true, lastSeenAt: true, emailVerifiedAt: true, isDemo: true,
        volunteerProfile: { select: { isVerified: true, completedCount: true } },
        _count: { select: { requests: true, reportsAgainst: true } },
      },
    }),
    db.user.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function adminUserAction(adminId: string, userId: string, action: "suspend" | "activate" | "verify" | "delete" | "setRole", opts: { role?: Role; reason?: string; ip?: string }) {
  if (userId === adminId && action !== "verify") throw Errors.forbidden();
  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw Errors.notFound();
  switch (action) {
    case "suspend":
      await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED", suspendedReason: opts.reason ?? null } });
      await destroyAllSessions(userId);
      break;
    case "activate":
      await db.user.update({ where: { id: userId }, data: { status: "ACTIVE", suspendedReason: null } });
      break;
    case "verify":
      await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
      await db.volunteerProfile.updateMany({ where: { userId }, data: { isVerified: true } });
      break;
    case "delete":
      await db.user.update({ where: { id: userId }, data: { deletedAt: new Date(), status: "SUSPENDED", email: `deleted+${userId}@qollab.invalid` } });
      await destroyAllSessions(userId);
      break;
    case "setRole":
      if (!opts.role) throw Errors.validation({ role: ["required"] });
      await db.user.update({ where: { id: userId }, data: { role: opts.role } });
      if (opts.role === "VOLUNTEER") {
        await db.volunteerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId, skills: [], latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng },
        });
      }
      await destroyAllSessions(userId);
      break;
  }
  await audit({ actorId: adminId, action: `admin.user.${action}`, entityType: "User", entityId: userId, metadata: { role: opts.role ?? null, reason: opts.reason ?? null }, ip: opts.ip });
}

// ───────────── requests ─────────────

export async function adminListRequests(q: { q?: string; status?: string; page: number; pageSize: number; sort: "newest" | "oldest" | "name" }) {
  const where: Prisma.RequestWhereInput = {
    deletedAt: null,
    ...(q.status ? { status: q.status as RequestStatus } : { status: { not: "DRAFT" } }),
    ...(q.q ? { OR: [{ title: { contains: q.q } }, { requester: { name: { contains: q.q } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.request.findMany({
      where,
      orderBy: q.sort === "name" ? { title: "asc" } : { createdAt: q.sort === "oldest" ? "asc" : "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        category: true,
        location: true,
        requester: { select: { id: true, name: true, email: true } },
        matches: { orderBy: { rank: "asc" }, take: 1, include: { volunteer: { select: { name: true } } } },
        _count: { select: { reports: true, matches: true } },
      },
    }),
    db.request.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function adminRequestAction(adminId: string, requestId: string, action: "approve" | "reject" | "delete" | "rematch", note?: string, ip?: string) {
  const request = await db.request.findFirst({ where: { id: requestId, deletedAt: null } });
  if (!request) throw Errors.notFound();
  switch (action) {
    case "approve":
      await approvePendingRequest(requestId, adminId);
      await notify(request.requesterId, "REQUEST_MODERATED", { title: request.title, status: "VERIFIED" }, `/dashboard/requests/${requestId}`);
      break;
    case "reject":
      await rejectRequest(requestId, adminId, note);
      break;
    case "delete":
      await db.request.update({ where: { id: requestId }, data: { deletedAt: new Date() } });
      break;
    case "rematch":
      if (request.status !== "MATCHING") throw Errors.invalidTransition();
      await computeMatches(requestId);
      break;
  }
  await audit({ actorId: adminId, action: `admin.request.${action}`, entityType: "Request", entityId: requestId, metadata: { note: note ?? null }, ip });
}

// ───────────── organizations ─────────────

export async function adminListOrganizations(q: { q?: string; status?: string; page: number; pageSize: number }) {
  const where: Prisma.OrganizationWhereInput = {
    deletedAt: null,
    ...(q.status ? { status: q.status as OrganizationStatus } : {}),
    ...(q.q ? { name: { contains: q.q } } : {}),
  };
  const [items, total] = await Promise.all([
    db.organization.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { owner: { select: { name: true, email: true } }, location: true, _count: { select: { campaigns: true, requests: true, members: true } } },
    }),
    db.organization.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function adminOrganizationAction(adminId: string, orgId: string, action: "verify" | "reject" | "suspend", ip?: string) {
  const org = await db.organization.findFirst({ where: { id: orgId, deletedAt: null } });
  if (!org) throw Errors.notFound();
  const status: OrganizationStatus = action === "verify" ? "VERIFIED" : action === "reject" ? "REJECTED" : "SUSPENDED";
  await db.organization.update({ where: { id: orgId }, data: { status, verifiedAt: action === "verify" ? new Date() : org.verifiedAt } });
  await notify(org.ownerId, "ORGANIZATION_UPDATE", { organization: org.name, action }, "/dashboard/organization");
  await audit({ actorId: adminId, action: `admin.organization.${action}`, entityType: "Organization", entityId: orgId, ip });
}

// ───────────── reports ─────────────

export async function adminListReports(q: { status?: string; page: number; pageSize: number }) {
  const where: Prisma.ReportWhereInput = q.status ? { status: q.status as ReportStatus } : {};
  const [items, total] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        reporter: { select: { id: true, name: true } },
        reportedUser: { select: { id: true, name: true, status: true } },
        request: { select: { id: true, title: true, status: true } },
        message: { select: { id: true, body: true } },
        resolvedBy: { select: { name: true } },
      },
    }),
    db.report.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function adminReportAction(adminId: string, reportId: string, input: { action: "resolve" | "dismiss"; note?: string; suspendUser: boolean; removeContent: boolean }, ip?: string) {
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) throw Errors.notFound();
  if (input.action === "resolve") {
    if (input.suspendUser && report.reportedUserId && report.reportedUserId !== adminId) {
      await adminUserAction(adminId, report.reportedUserId, "suspend", { reason: input.note, ip });
    }
    if (input.removeContent) {
      if (report.messageId) await db.message.update({ where: { id: report.messageId }, data: { deletedAt: new Date() } });
      else if (report.requestId) {
        const r = await db.request.findUnique({ where: { id: report.requestId } });
        if (r && ["PENDING", "VERIFIED", "MATCHING"].includes(r.status)) await rejectRequest(r.id, adminId, input.note);
        else await db.request.update({ where: { id: report.requestId }, data: { deletedAt: new Date() } });
      }
    }
  }
  await db.report.update({
    where: { id: reportId },
    data: { status: input.action === "resolve" ? "RESOLVED" : "DISMISSED", resolvedById: adminId, resolvedAt: new Date(), resolutionNote: input.note ?? null },
  });
  await audit({ actorId: adminId, action: `admin.report.${input.action}`, entityType: "Report", entityId: reportId, ip });
}

// ───────────── categories ─────────────

export async function adminListCategories() {
  const cats = await db.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { requests: true } } } });
  return cats.map((c) => ({ ...c, relatedSkills: asStringArray(c.relatedSkills) }));
}

export async function adminUpsertCategory(adminId: string, input: CategoryInput, id?: string) {
  const category = id
    ? await db.category.update({ where: { id }, data: input })
    : await db.category.create({ data: input });
  await audit({ actorId: adminId, action: id ? "admin.category.update" : "admin.category.create", entityType: "Category", entityId: category.id });
  return category;
}

export async function adminDeleteCategory(adminId: string, id: string) {
  const inUse = await db.request.count({ where: { categoryId: id } });
  if (inUse > 0) await db.category.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
  else await db.category.delete({ where: { id } });
  await audit({ actorId: adminId, action: "admin.category.delete", entityType: "Category", entityId: id });
}
