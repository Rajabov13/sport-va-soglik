import { db } from "@/server/db";
import { ApiError, Errors } from "@/server/http/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { destroyAllSessions } from "@/server/auth/session";
import type { ChangePasswordInput, LoginInput, RegisterInput } from "@/schemas/auth";
import type { SettingsInput } from "@/schemas/misc";
import { slugify } from "@/lib/utils";
import { DEFAULT_CENTER } from "@/lib/geo";
import { audit } from "./audit";

// Defence against user enumeration by timing: always run a bcrypt comparison.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("qollab-dummy-password-1"));

export async function uniqueOrgSlug(name: string) {
  const base = slugify(name) || "org";
  let slug = base;
  for (let i = 2; await db.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function registerUser(input: RegisterInput, locale: string) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ApiError(409, "emailTaken", { email: ["emailTaken"] });

  const passwordHash = await hashPassword(input.password);
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        // Role comes from the validated enum which excludes ADMIN — never from arbitrary client data.
        role: input.role,
        locale,
        profile: { create: {} },
      },
    });
    if (input.role === "VOLUNTEER") {
      await tx.volunteerProfile.create({
        data: { userId: created.id, skills: [], latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng, radiusKm: 10 },
      });
    }
    if (input.role === "ORGANIZATION") {
      await tx.organization.create({
        data: {
          ownerId: created.id,
          name: input.organizationName!,
          slug: await uniqueOrgSlug(input.organizationName!),
          description: input.organizationName!,
          email: input.email,
          status: "PENDING",
          members: { create: { userId: created.id, role: "OWNER", status: "ACTIVE" } },
        },
      });
    }
    await audit({ actorId: created.id, action: "user.register", entityType: "User", entityId: created.id }, tx);
    return created;
  });
  return user;
}

export async function authenticate(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok || user.deletedAt) throw new ApiError(401, "invalidCredentials");
  if (user.status === "SUSPENDED") throw new ApiError(403, "accountSuspended");
  return user;
}

export async function getMe(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: { include: { location: true } }, volunteerProfile: true, ownedOrganizations: { where: { deletedAt: null }, select: { id: true, name: true, slug: true, status: true } } },
  });
  if (!user) throw Errors.notFound();
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locale: user.locale,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isDemo: user.isDemo,
    bio: user.profile?.bio ?? null,
    emailNotifications: user.profile?.emailNotifications ?? true,
    hasPassword: !!user.passwordHash,
    volunteer: user.volunteerProfile ? { xp: user.volunteerProfile.xp, completedCount: user.volunteerProfile.completedCount } : null,
    organization: user.ownedOrganizations[0] ?? null,
  };
}

export async function updateSettings(userId: string, input: SettingsInput) {
  await db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone || null,
      locale: input.locale,
      profile: {
        upsert: {
          create: { bio: input.bio ?? null, emailNotifications: input.emailNotifications },
          update: { bio: input.bio ?? null, emailNotifications: input.emailNotifications },
        },
      },
    },
  });
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.passwordHash && !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ApiError(422, "validation", { currentPassword: ["invalidCredentials"] });
  }
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } });
  await destroyAllSessions(userId);
  await audit({ actorId: userId, action: "user.password_change", entityType: "User", entityId: userId });
}

/** Find or create a user from a verified Google identity. */
export async function upsertGoogleUser(profile: { sub: string; email: string; name: string; picture?: string; emailVerified: boolean }, locale: string) {
  const account = await db.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: profile.sub } },
    include: { user: true },
  });
  if (account) return account.user;
  if (!profile.emailVerified) throw new ApiError(403, "forbidden");

  const existing = await db.user.findUnique({ where: { email: profile.email.toLowerCase() } });
  if (existing) {
    await db.account.create({ data: { userId: existing.id, provider: "google", providerAccountId: profile.sub } });
    return existing;
  }
  return db.user.create({
    data: {
      email: profile.email.toLowerCase(),
      name: profile.name || profile.email.split("@")[0],
      avatarUrl: profile.picture ?? null,
      emailVerifiedAt: new Date(),
      locale,
      profile: { create: {} },
      accounts: { create: { provider: "google", providerAccountId: profile.sub } },
    },
  });
}
