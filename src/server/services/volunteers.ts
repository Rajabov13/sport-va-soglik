import { db } from "@/server/db";
import { Errors } from "@/server/http/errors";
import type { VolunteerProfileInput } from "@/schemas/volunteer";
import { achievementProgress, ACHIEVEMENTS, levelProgress } from "@/server/domain/gamification";
import { computeMatches } from "./matching";

export async function getVolunteerProfile(userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId, role: "VOLUNTEER", deletedAt: null },
    include: {
      profile: { include: { location: true } },
      volunteerProfile: { include: { categories: { include: { category: true } }, availability: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] }, preferredLocations: { include: { location: true } } } },
      achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } },
      reviewsReceived: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { author: { select: { id: true, name: true, avatarUrl: true } }, request: { select: { id: true, title: true } } },
      },
    },
  });
  if (!user || !user.volunteerProfile) throw Errors.notFound();
  const vp = user.volunteerProfile;
  const unlocked = new Set(user.achievements.map((a) => a.achievement.code));
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.profile?.bio ?? null,
    city: user.profile?.location?.city ?? vp.preferredLocations[0]?.location.city ?? null,
    memberSince: user.createdAt,
    skills: vp.skills,
    categories: vp.categories.map((c) => c.category),
    availability: vp.availability.map((a) => ({ dayOfWeek: a.dayOfWeek, startMinute: a.startMinute, endMinute: a.endMinute })),
    preferredLocations: vp.preferredLocations.map((p) => p.location),
    radiusKm: vp.radiusKm,
    latitude: vp.latitude,
    longitude: vp.longitude,
    isAvailableNow: vp.isAvailableNow,
    isVerified: vp.isVerified,
    stats: {
      xp: vp.xp,
      level: levelProgress(vp.xp),
      completedCount: vp.completedCount,
      ratingAvg: vp.ratingAvg,
      ratingCount: vp.ratingCount,
      hoursTotal: Math.round(vp.hoursTotal * 10) / 10,
      impactScore: vp.impactScore,
      peopleHelped: vp.peopleHelped,
      avgResponseMinutes: vp.avgResponseMinutes,
    },
    badges: ACHIEVEMENTS.map((a) => ({
      code: a.code,
      icon: a.icon,
      xpReward: a.xpReward,
      unlocked: unlocked.has(a.code),
      unlockedAt: user.achievements.find((ua) => ua.achievement.code === a.code)?.unlockedAt ?? null,
      progress: achievementProgress(a.code, vp),
    })),
    reviews: user.reviewsReceived.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, author: r.author, request: r.request })),
  };
}

export async function updateVolunteerProfile(userId: string, input: VolunteerProfileInput) {
  const profile = await db.volunteerProfile.findUnique({ where: { userId } });
  if (!profile) throw Errors.forbidden();

  const validCategories = await db.category.findMany({ where: { id: { in: input.categoryIds }, isActive: true }, select: { id: true } });
  const validLocations = await db.location.findMany({ where: { id: { in: input.preferredLocationIds } }, select: { id: true } });

  await db.$transaction(async (tx) => {
    await tx.volunteerProfile.update({
      where: { userId },
      data: {
        skills: Array.from(new Set(input.skills.map((s) => s.toLowerCase()))),
        radiusKm: input.radiusKm,
        latitude: input.latitude,
        longitude: input.longitude,
        isAvailableNow: input.isAvailableNow,
      },
    });
    await tx.volunteerCategory.deleteMany({ where: { volunteerProfileId: profile.id } });
    await tx.volunteerCategory.createMany({ data: validCategories.map((c) => ({ volunteerProfileId: profile.id, categoryId: c.id })) });
    await tx.volunteerAvailability.deleteMany({ where: { volunteerProfileId: profile.id } });
    await tx.volunteerAvailability.createMany({ data: input.availability.map((a) => ({ ...a, volunteerProfileId: profile.id })) });
    await tx.volunteerPreferredLocation.deleteMany({ where: { volunteerProfileId: profile.id } });
    await tx.volunteerPreferredLocation.createMany({ data: validLocations.map((l) => ({ volunteerProfileId: profile.id, locationId: l.id })) });
    await tx.profile.upsert({
      where: { userId },
      create: { userId, bio: input.bio ?? null, latitude: input.latitude, longitude: input.longitude, locationId: validLocations[0]?.id ?? null },
      update: { bio: input.bio ?? null, latitude: input.latitude, longitude: input.longitude, locationId: validLocations[0]?.id ?? null },
    });
  });

  // Profile changes can surface the volunteer for open requests nearby.
  const open = await db.request.findMany({
    where: { status: "MATCHING", deletedAt: null, categoryId: { in: validCategories.map((c) => c.id) } },
    select: { id: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  for (const r of open) await computeMatches(r.id, { notify: false });
}

export async function listVolunteersForMap() {
  const rows = await db.volunteerProfile.findMany({
    where: { deletedAt: null, isAvailableNow: true, latitude: { not: null }, user: { status: "ACTIVE", deletedAt: null, role: "VOLUNTEER" } },
    select: { userId: true, latitude: true, longitude: true, completedCount: true, ratingAvg: true, user: { select: { name: true, avatarUrl: true } } },
    take: 500,
  });
  // Volunteer positions are coarsened (≈1 km) to protect privacy.
  return rows.map((r) => ({
    id: r.userId,
    name: r.user.name.split(" ")[0],
    avatarUrl: r.user.avatarUrl,
    latitude: Math.round(r.latitude! * 100) / 100,
    longitude: Math.round(r.longitude! * 100) / 100,
    completedCount: r.completedCount,
    ratingAvg: r.ratingAvg,
  }));
}
