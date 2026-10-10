import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { Errors } from "@/server/http/errors";
import type { CampaignInput, OrganizationUpdateInput } from "@/schemas/misc";
import { slugify } from "@/lib/utils";
import { getImpactStats } from "./stats";
import { notify } from "./notifications";
import { audit } from "./audit";

export async function listOrganizations(opts: { q?: string; page: number; pageSize: number }) {
  const where: Prisma.OrganizationWhereInput = {
    deletedAt: null,
    status: "VERIFIED",
    ...(opts.q ? { OR: [{ name: { contains: opts.q } }, { description: { contains: opts.q } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.organization.findMany({
      where,
      include: {
        location: true,
        _count: { select: { campaigns: true, requests: true, members: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    db.organization.count({ where }),
  ]);
  return { items, total, page: opts.page, pageSize: opts.pageSize, totalPages: Math.max(1, Math.ceil(total / opts.pageSize)) };
}

export async function getOrganizationPublic(idOrSlug: string) {
  const org = await db.organization.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null, status: "VERIFIED" },
    include: {
      location: true,
      campaigns: { where: { deletedAt: null, status: { in: ["ACTIVE", "COMPLETED"] } }, orderBy: { startsAt: "desc" }, include: { category: true, _count: { select: { participants: true, requests: true } } } },
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!org) throw Errors.notFound();
  const stats = await getImpactStats({ organizationId: org.id });
  return { ...org, stats };
}

export async function getOwnedOrganization(userId: string) {
  const org = await db.organization.findFirst({ where: { ownerId: userId, deletedAt: null }, include: { location: true } });
  if (!org) throw Errors.notFound();
  return org;
}

export async function updateOrganization(userId: string, input: OrganizationUpdateInput) {
  const org = await getOwnedOrganization(userId);
  await db.organization.update({
    where: { id: org.id },
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      website: input.website || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address ?? null,
      locationId: input.locationId || null,
    },
  });
}

export async function listOrgMembers(userId: string) {
  const org = await getOwnedOrganization(userId);
  return db.organizationMember.findMany({
    where: { organizationId: org.id, status: { not: "REMOVED" }, userId: { not: userId } },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, volunteerProfile: { select: { completedCount: true, ratingAvg: true, hoursTotal: true } } } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateMember(ownerId: string, memberId: string, action: "approve" | "remove") {
  const org = await getOwnedOrganization(ownerId);
  const member = await db.organizationMember.findFirst({ where: { id: memberId, organizationId: org.id } });
  if (!member || member.role === "OWNER") throw Errors.notFound();
  await db.organizationMember.update({ where: { id: memberId }, data: { status: action === "approve" ? "ACTIVE" : "REMOVED" } });
  await notify(member.userId, "ORGANIZATION_UPDATE", { organization: org.name, action }, `/organizations/${org.slug}`);
}

/** A volunteer asks to join an organization's volunteer team. */
export async function joinOrganization(userId: string, orgId: string) {
  const org = await db.organization.findFirst({ where: { id: orgId, status: "VERIFIED", deletedAt: null } });
  if (!org) throw Errors.notFound();
  const member = await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    update: { status: "PENDING" },
    create: { organizationId: orgId, userId, role: "VOLUNTEER", status: "PENDING" },
  });
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  await notify(org.ownerId, "ORGANIZATION_UPDATE", { organization: org.name, action: "joinRequest", volunteer: user.name }, "/dashboard/organization");
  return member;
}

export async function membershipStatus(userId: string, orgId: string) {
  const m = await db.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId } } });
  return m?.status ?? null;
}

// ───────────── campaigns ─────────────

async function uniqueCampaignSlug(title: string) {
  const base = slugify(title) || "campaign";
  let slug = base;
  for (let i = 2; await db.campaign.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function createCampaign(userId: string, input: CampaignInput) {
  const org = await getOwnedOrganization(userId);
  if (org.status !== "VERIFIED") throw Errors.forbidden();
  const campaign = await db.campaign.create({
    data: {
      organizationId: org.id,
      title: input.title,
      slug: await uniqueCampaignSlug(input.title),
      description: input.description,
      categoryId: input.categoryId || null,
      locationId: input.locationId || null,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      goalHelps: input.goalHelps,
      goalVolunteers: input.goalVolunteers,
      status: "ACTIVE",
    },
  });
  await audit({ actorId: userId, action: "campaign.create", entityType: "Campaign", entityId: campaign.id });
  return campaign;
}

export async function setCampaignStatus(userId: string, campaignId: string, status: "ACTIVE" | "COMPLETED" | "CANCELLED") {
  const org = await getOwnedOrganization(userId);
  const res = await db.campaign.updateMany({ where: { id: campaignId, organizationId: org.id, deletedAt: null }, data: { status } });
  if (res.count === 0) throw Errors.notFound();
}

export async function listCampaigns(opts: { q?: string; status?: "ACTIVE" | "COMPLETED"; organizationId?: string; page: number; pageSize: number }) {
  const where: Prisma.CampaignWhereInput = {
    deletedAt: null,
    status: opts.status ?? { in: ["ACTIVE", "COMPLETED"] },
    organization: { status: "VERIFIED", deletedAt: null },
    ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
    ...(opts.q ? { OR: [{ title: { contains: opts.q } }, { description: { contains: opts.q } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.campaign.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        category: true,
        location: true,
        _count: { select: { participants: true, requests: true } },
      },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    db.campaign.count({ where }),
  ]);
  const completedCounts = await db.request.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: items.map((i) => i.id) }, status: "COMPLETED", deletedAt: null },
    _count: { _all: true },
  });
  const done = new Map(completedCounts.map((c) => [c.campaignId, c._count._all]));
  return {
    items: items.map((c) => ({ ...c, completedHelps: done.get(c.id) ?? 0 })),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
    totalPages: Math.max(1, Math.ceil(total / opts.pageSize)),
  };
}

export async function getCampaign(idOrSlug: string) {
  const c = await db.campaign.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null, organization: { deletedAt: null } },
    include: {
      organization: { select: { id: true, name: true, slug: true, logoUrl: true, ownerId: true, status: true } },
      category: true,
      location: true,
      participants: { take: 12, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      _count: { select: { participants: true, requests: true } },
    },
  });
  if (!c || c.organization.status !== "VERIFIED") throw Errors.notFound();
  const completedHelps = await db.request.count({ where: { campaignId: c.id, status: "COMPLETED", deletedAt: null } });
  return { ...c, completedHelps };
}

export async function joinCampaign(userId: string, campaignId: string) {
  const c = await db.campaign.findFirst({ where: { id: campaignId, status: "ACTIVE", deletedAt: null }, include: { organization: true } });
  if (!c) throw Errors.notFound();
  await db.campaignParticipant.upsert({
    where: { campaignId_userId: { campaignId, userId } },
    update: {},
    create: { campaignId, userId },
  });
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  await notify(c.organization.ownerId, "CAMPAIGN_UPDATE", { campaign: c.title, volunteer: user.name }, `/campaigns/${c.slug}`);
}

export async function leaveCampaign(userId: string, campaignId: string) {
  await db.campaignParticipant.deleteMany({ where: { campaignId, userId } });
}

export async function isCampaignParticipant(userId: string, campaignId: string) {
  return !!(await db.campaignParticipant.findUnique({ where: { campaignId_userId: { campaignId, userId } } }));
}

export async function getOrganizationDashboard(userId: string) {
  const org = await getOwnedOrganization(userId);
  const [stats, campaigns, members, requests] = await Promise.all([
    getImpactStats({ organizationId: org.id }),
    db.campaign.findMany({
      where: { organizationId: org.id, deletedAt: null },
      orderBy: { startsAt: "desc" },
      include: { _count: { select: { participants: true, requests: true } } },
    }),
    db.organizationMember.count({ where: { organizationId: org.id, status: "ACTIVE", role: { not: "OWNER" } } }),
    db.request.count({ where: { organizationId: org.id, deletedAt: null } }),
  ]);
  return { organization: org, stats, campaigns, memberCount: members, requestCount: requests };
}
