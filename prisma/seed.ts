import { PrismaClient, type Prisma, type Urgency, type RequestStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CAMPAIGNS, CATEGORIES, CHAT_LINES, FEMALE_FIRST, LAST, LOCATIONS, MALE_FIRST, ORGANIZATIONS, REQUEST_TEMPLATES, REVIEW_COMMENTS, SKILL_POOL } from "./seed-data";
import { ACHIEVEMENTS, completionXp, impactPoints, qualifiedAchievements } from "../src/server/domain/gamification";
import { computeMatches } from "../src/server/services/matching";
import { DEMO_ACCOUNTS } from "../src/config/demo";
import { startOfToday } from "../src/lib/format";

const db = new PrismaClient();

// Deterministic PRNG so the demo dataset is reproducible.
let seed = 20261010;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const jitter = (v: number, km: number) => v + (rand() - 0.5) * (km / 55);
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000);
const minutesAfter = (date: Date, m: number) => new Date(date.getTime() + m * 60000);

const DAY = 86400000;

function femaleLast(last: string) {
  return last.endsWith("v") ? `${last}a` : last;
}

let emailCounter = 0;
function person(female: boolean) {
  const first = female ? pick(FEMALE_FIRST) : pick(MALE_FIRST);
  const lastBase = pick(LAST);
  const last = female ? femaleLast(lastBase) : lastBase;
  emailCounter += 1;
  const email = `${first}.${last}${emailCounter}`.toLowerCase().replace(/[^a-z0-9.]/g, "") + "@example.com";
  return { name: `${first} ${last}`, email };
}

async function wipe() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} CASCADE`);
  }
}

async function main() {
  process.env.SEEDING = "1"; // silences console email delivery during seeding
  const password = process.env.DEMO_PASSWORD || "Demo12345!";
  console.log("› Wiping database…");
  await wipe();

  const passwordHash = await bcrypt.hash(password, 12);

  console.log("› Reference data");
  const categories = await Promise.all(CATEGORIES.map((c, i) => db.category.create({ data: { ...c, sortOrder: i } })));
  const cat = (slug: string) => categories.find((c) => c.slug === slug)!;
  const locations = await Promise.all(LOCATIONS.map((l) => db.location.create({ data: l })));
  const loc = (slug: string) => locations.find((l) => l.slug === slug)!;
  for (const a of ACHIEVEMENTS) await db.achievement.create({ data: a });
  const achievements = await db.achievement.findMany();

  // City weights: Tashkent dominates, as in real usage.
  const cityPool = ["toshkent", "toshkent", "toshkent", "toshkent", "samarqand", "samarqand", "buxoro", "andijon", "namangan", "fargona", "nukus", "qarshi", "urganch", "jizzax", "navoiy", "termiz", "chirchiq", "guliston"];

  console.log("› Users");
  const createUser = async (data: { name: string; email: string; role: Prisma.UserCreateInput["role"]; city: string; isDemo?: boolean; createdAt?: Date; bio?: string }) => {
    const l = loc(data.city);
    return db.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash,
        isDemo: data.isDemo ?? false,
        emailVerifiedAt: new Date(),
        phone: `+998 9${int(0, 9)} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`,
        createdAt: data.createdAt ?? daysAgo(int(90, 300)),
        profile: { create: { locationId: l.id, latitude: jitter(l.latitude, 6), longitude: jitter(l.longitude, 6), bio: data.bio } },
      },
    });
  };

  // Admins
  const admin = await createUser({ name: "Demo Administrator", email: DEMO_ACCOUNTS.admin, role: "ADMIN", city: "toshkent", isDemo: true });
  await createUser({ name: "Shoira Moderatorova", email: "moderator@example.com", role: "ADMIN", city: "toshkent" });

  // Requesters
  const demoUser = await createUser({ name: "Dilnoza Karimova", email: DEMO_ACCOUNTS.user, role: "USER", city: "toshkent", isDemo: true, bio: "Onamga va qo'shni nuroniylarga g'amxo'rlik qilaman." });
  const users = [demoUser];
  for (let i = 0; i < 29; i++) {
    const p = person(rand() > 0.5);
    users.push(await createUser({ ...p, role: "USER", city: pick(cityPool) }));
  }

  // Volunteers
  const createVolunteer = async (data: { name: string; email: string; city: string; isDemo?: boolean; skills: string[]; cats: string[]; radius: number; availableNow: boolean; bio: string }) => {
    const user = await createUser({ name: data.name, email: data.email, role: "VOLUNTEER", city: data.city, isDemo: data.isDemo, bio: data.bio });
    const l = loc(data.city);
    const vp = await db.volunteerProfile.create({
      data: {
        userId: user.id,
        skills: data.skills,
        radiusKm: data.radius,
        latitude: jitter(l.latitude, 5),
        longitude: jitter(l.longitude, 5),
        isAvailableNow: data.availableNow,
        isVerified: rand() > 0.3,
        categories: { create: data.cats.map((s) => ({ categoryId: cat(s).id })) },
        preferredLocations: { create: [{ locationId: l.id }] },
      },
    });
    // Weekly availability: evenings on weekdays + weekend mornings, with variety.
    const slots: Prisma.VolunteerAvailabilityCreateManyInput[] = [];
    for (let d = 1; d <= 5; d++) if (rand() > 0.35) slots.push({ volunteerProfileId: vp.id, dayOfWeek: d, startMinute: 17 * 60, endMinute: 21 * 60 });
    for (const d of [0, 6]) if (rand() > 0.3) slots.push({ volunteerProfileId: vp.id, dayOfWeek: d, startMinute: 9 * 60, endMinute: 14 * 60 });
    if (slots.length) await db.volunteerAvailability.createMany({ data: slots });
    return user;
  };

  const demoVolunteer = await createVolunteer({
    name: "Jasur Rahimov",
    email: DEMO_ACCOUNTS.volunteer,
    city: "toshkent",
    isDemo: true,
    skills: ["driving", "first-aid", "medical", "shopping", "caregiving"],
    cats: ["medicine", "elderly", "food", "emergency", "disability"],
    radius: 15,
    availableNow: true,
    bio: "Tibbiyot universiteti talabasi. Mashinam bor, kechqurunlari va dam olish kunlari yordam beraman.",
  });
  // Ensure the demo volunteer has slots every day so matching is consistently strong.
  const demoVp = await db.volunteerProfile.findUniqueOrThrow({ where: { userId: demoVolunteer.id } });
  await db.volunteerAvailability.deleteMany({ where: { volunteerProfileId: demoVp.id } });
  await db.volunteerAvailability.createMany({ data: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ volunteerProfileId: demoVp.id, dayOfWeek: d, startMinute: 8 * 60, endMinute: 22 * 60 })) });

  const volunteers = [demoVolunteer];
  const volunteerCities = ["toshkent", "toshkent", "toshkent", "toshkent", "toshkent", "samarqand", "samarqand", "buxoro", "andijon", "namangan", "fargona", "nukus", "qarshi", "chirchiq"];
  const bios = [
    "IT mutaxassisi, bolalarga dasturlashni o'rgatishni yaxshi ko'raman.",
    "Pensiyadagi o'qituvchi, bo'sh vaqtimni foydali o'tkazmoqchiman.",
    "Talabaman, hafta oxirlari ko'ngillilik qilaman.",
    "Haydovchiman, shahar ichida yuk tashishda yordam bera olaman.",
    "Hamshira bo'lib ishlayman, tibbiy maslahat bera olaman.",
    "Ekologiya faoli, daraxt ekish aksiyalarida qatnashaman.",
  ];
  for (let i = 0; i < 14; i++) {
    const p = person(rand() > 0.5);
    const cats = Array.from(new Set([pick(CATEGORIES).slug, pick(CATEGORIES).slug, pick(CATEGORIES).slug]));
    const skills = Array.from(new Set([pick(SKILL_POOL), pick(SKILL_POOL), pick(SKILL_POOL), pick(SKILL_POOL)]));
    volunteers.push(
      await createVolunteer({ ...p, city: volunteerCities[i], skills, cats, radius: pick([5, 10, 15, 20, 30]), availableNow: rand() > 0.4, bio: pick(bios) }),
    );
  }

  console.log("› Organizations & campaigns");
  const orgs = [];
  for (let i = 0; i < ORGANIZATIONS.length; i++) {
    const o = ORGANIZATIONS[i];
    const isDemo = i === 0;
    const owner = await createUser({
      name: isDemo ? "Mehr Ko'prigi koordinatori" : `${o.name} koordinatori`,
      email: isDemo ? DEMO_ACCOUNTS.organization : `org${i + 1}@example.com`,
      role: "ORGANIZATION",
      city: o.city,
      isDemo,
    });
    const l = loc(o.city);
    const slug = o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const org = await db.organization.create({
      data: {
        ownerId: owner.id,
        name: o.name,
        slug,
        description: o.description,
        type: o.type,
        status: o.status as "VERIFIED" | "PENDING",
        verifiedAt: o.status === "VERIFIED" ? daysAgo(int(30, 200)) : null,
        email: `info@${slug}.example.com`,
        phone: `+998 71 ${int(200, 299)} ${int(10, 99)} ${int(10, 99)}`,
        website: `https://${slug}.example.com`,
        locationId: l.id,
        address: `${l.city}, ${pick(["Mustaqillik", "Amir Temur", "Navoiy", "Bobur", "Shota Rustaveli"])} ko'chasi, ${int(1, 120)}-uy`,
        latitude: jitter(l.latitude, 3),
        longitude: jitter(l.longitude, 3),
        members: { create: [{ userId: owner.id, role: "OWNER", status: "ACTIVE" }] },
      },
    });
    orgs.push(org);
  }
  // Volunteer teams
  for (const v of volunteers.slice(0, 12)) {
    const org = orgs[int(0, 4)];
    await db.organizationMember.create({ data: { organizationId: org.id, userId: v.id, role: "VOLUNTEER", status: rand() > 0.25 ? "ACTIVE" : "PENDING" } }).catch(() => undefined);
  }
  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: orgs[0].id, userId: demoVolunteer.id } },
    update: { status: "ACTIVE" },
    create: { organizationId: orgs[0].id, userId: demoVolunteer.id, status: "ACTIVE" },
  });

  const campaigns = [];
  for (const c of CAMPAIGNS) {
    const org = orgs[c.org];
    const ends = daysAgo(-c.endOffset);
    const campaign = await db.campaign.create({
      data: {
        organizationId: org.id,
        title: c.title,
        slug: c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60),
        description: c.description,
        categoryId: cat(c.category).id,
        locationId: loc(c.city).id,
        startsAt: daysAgo(-c.startOffset),
        endsAt: ends,
        goalHelps: c.goalHelps,
        goalVolunteers: c.goalVolunteers,
        status: ends < new Date() ? "COMPLETED" : "ACTIVE",
      },
    });
    campaigns.push(campaign);
    for (const v of volunteers.filter(() => rand() > 0.55)) {
      await db.campaignParticipant.create({ data: { campaignId: campaign.id, userId: v.id } }).catch(() => undefined);
    }
  }

  console.log("› Requests");
  type Plan = { status: RequestStatus; requester: (typeof users)[number] | { id: string }; volunteer?: (typeof volunteers)[number]; tpl: (typeof REQUEST_TEMPLATES)[number]; city: string; ageDays: number; orgIndex?: number; completedToday?: boolean };
  const plans: Plan[] = [];

  // Demo volunteer: exactly 9 completed helps → the demo flow unlocks "10 Helps".
  for (let i = 0; i < 9; i++) {
    const tpl = REQUEST_TEMPLATES.filter((t) => ["medicine", "elderly", "food", "disability"].includes(t.category))[i % 8];
    plans.push({ status: "COMPLETED", requester: i === 0 ? demoUser : users[1 + (i % 29)], volunteer: demoVolunteer, tpl, city: "toshkent", ageDays: 80 - i * 8 });
  }
  // Other completed requests spread over the last 12 weeks.
  for (let i = 0; i < 16; i++) {
    const v = volunteers[1 + (i % 14)];
    const completedToday = i >= 13; // a few helps delivered earlier today
    plans.push({ status: "COMPLETED", requester: users[1 + ((i * 7) % 29)], volunteer: v, tpl: REQUEST_TEMPLATES[(i * 3) % REQUEST_TEMPLATES.length], city: pick(cityPool), ageDays: completedToday ? 0 : int(3, 84), orgIndex: i % 4 === 0 ? int(0, 4) : undefined, completedToday });
  }
  // Active work
  plans.push({ status: "IN_PROGRESS", requester: users[3], volunteer: volunteers[2], tpl: REQUEST_TEMPLATES[4], city: "toshkent", ageDays: 2 });
  plans.push({ status: "IN_PROGRESS", requester: users[8], volunteer: volunteers[6], tpl: REQUEST_TEMPLATES[7], city: "samarqand", ageDays: 3 });
  plans.push({ status: "IN_PROGRESS", requester: users[11], volunteer: volunteers[3], tpl: REQUEST_TEMPLATES[10], city: "toshkent", ageDays: 1 });
  plans.push({ status: "ACCEPTED", requester: users[5], volunteer: volunteers[4], tpl: REQUEST_TEMPLATES[1], city: "toshkent", ageDays: 1 });
  plans.push({ status: "ACCEPTED", requester: users[14], volunteer: volunteers[9], tpl: REQUEST_TEMPLATES[13], city: "andijon", ageDays: 2 });
  // Open requests waiting for volunteers
  const openTemplates = [0, 2, 3, 6, 9, 11, 12, 15, 16, 17, 18];
  openTemplates.forEach((t, i) => {
    plans.push({ status: "MATCHING", requester: i === 0 ? demoUser : users[2 + i * 2], tpl: REQUEST_TEMPLATES[t], city: i < 5 ? "toshkent" : pick(cityPool), ageDays: int(0, 6), orgIndex: i === 3 ? 0 : undefined });
  });
  // Moderation queue, cancellations and a draft
  plans.push({ status: "PENDING", requester: users[20], tpl: { ...REQUEST_TEMPLATES[19], title: "Kripto orqali tez pul yordam beramiz" }, city: "toshkent", ageDays: 0 });
  plans.push({ status: "PENDING", requester: users[21], tpl: REQUEST_TEMPLATES[5], city: "namangan", ageDays: 1 });
  plans.push({ status: "CANCELLED", requester: users[22], tpl: REQUEST_TEMPLATES[14], city: "buxoro", ageDays: 20 });
  plans.push({ status: "CANCELLED", requester: users[23], tpl: REQUEST_TEMPLATES[8], city: "qarshi", ageDays: 35 });
  plans.push({ status: "DRAFT", requester: demoUser, tpl: REQUEST_TEMPLATES[10], city: "toshkent", ageDays: 0 });

  const toMatch: string[] = [];
  const vStats = new Map<string, { completed: number; cancelled: number; hours: number; people: number; xp: number; impact: number; fast: number; responses: number[] }>();
  const stat = (id: string) => {
    if (!vStats.has(id)) vStats.set(id, { completed: 0, cancelled: 0, hours: 0, people: 0, xp: 0, impact: 0, fast: 0, responses: [] });
    return vStats.get(id)!;
  };

  for (const [index, plan] of plans.entries()) {
    const l = loc(plan.city);
    const response = plan.tpl.urgency === "CRITICAL" ? int(4, 20) : int(8, 240);
    const hours = Math.max(0.5, plan.tpl.hours + (rand() - 0.5));
    let created = daysAgo(plan.ageDays, int(1, 10));
    let submitted = minutesAfter(created, 2);
    let matchingAt = minutesAfter(submitted, 1);
    let acceptedAt = minutesAfter(matchingAt, response);
    let startedAt = minutesAfter(acceptedAt, int(30, 600));
    let completedAt = minutesAfter(startedAt, Math.round(hours * 60) + int(10, 120));
    if (plan.completedToday) {
      // Build the timeline backwards from a completion a little earlier today.
      completedAt = new Date(Math.max(startOfToday().getTime() + 60_000, Date.now() - int(20, 120) * 60_000));
      startedAt = minutesAfter(completedAt, -(Math.round(hours * 60) + 10));
      acceptedAt = minutesAfter(startedAt, -30);
      matchingAt = minutesAfter(acceptedAt, -response);
      submitted = minutesAfter(matchingAt, -1);
      created = minutesAfter(submitted, -2);
    }
    const reached = (s: RequestStatus) => {
      const order: RequestStatus[] = ["DRAFT", "PENDING", "VERIFIED", "MATCHING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];
      return order.indexOf(plan.status) >= order.indexOf(s);
    };
    const org = plan.orgIndex !== undefined ? orgs[plan.orgIndex] : null;
    const campaign = org ? campaigns.find((c) => c.organizationId === org.id) : null;
    const requesterId = org ? org.ownerId : plan.requester.id;
    const prefDate = plan.status === "MATCHING" && rand() > 0.5 ? new Date(Date.now() + int(1, 4) * DAY + int(9, 19) * 3600000) : null;

    const req = await db.request.create({
      data: {
        requesterId,
        organizationId: org?.id ?? null,
        campaignId: campaign?.id ?? null,
        categoryId: cat(plan.tpl.category).id,
        title: plan.tpl.title,
        description: plan.tpl.description,
        urgency: plan.tpl.urgency as Urgency,
        status: plan.status,
        address: `${l.city}, ${pick(["Chilonzor", "Yunusobod", "Mirzo Ulug'bek", "Sergeli", "Olmazor", "Shayxontohur", "Markaz", "Yakkasaroy"])} tumani, ${int(1, 30)}-mavze, ${int(1, 80)}-uy`,
        locationId: l.id,
        latitude: jitter(l.latitude, 8),
        longitude: jitter(l.longitude, 8),
        preferredDate: prefDate,
        contactPreferences: rand() > 0.5 ? ["CHAT", "PHONE"] : ["CHAT"],
        contactPhone: `+998 9${int(0, 9)} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`,
        peopleCount: plan.tpl.people,
        estimatedHours: plan.tpl.hours,
        moderationNote: plan.status === "PENDING" ? (index % 2 ? "duplicate" : "blockedContent") : null,
        createdAt: created,
        submittedAt: plan.status !== "DRAFT" ? submitted : null,
        verifiedAt: reached("VERIFIED") ? submitted : null,
        matchingAt: reached("MATCHING") ? matchingAt : null,
        acceptedAt: reached("ACCEPTED") ? acceptedAt : null,
        startedAt: reached("IN_PROGRESS") ? startedAt : null,
        completedAt: plan.status === "COMPLETED" ? completedAt : null,
        cancelledAt: plan.status === "CANCELLED" ? minutesAfter(created, 600) : null,
      },
    });

    const history: Prisma.RequestStatusHistoryCreateManyInput[] = [{ requestId: req.id, toStatus: "DRAFT", actorId: requesterId, createdAt: created }];
    if (plan.status !== "DRAFT") history.push({ requestId: req.id, fromStatus: "DRAFT", toStatus: "PENDING", actorId: requesterId, createdAt: submitted });
    if (reached("VERIFIED")) history.push({ requestId: req.id, fromStatus: "PENDING", toStatus: "VERIFIED", note: "auto", createdAt: submitted });
    if (reached("MATCHING")) history.push({ requestId: req.id, fromStatus: "VERIFIED", toStatus: "MATCHING", createdAt: matchingAt });
    if (reached("ACCEPTED")) history.push({ requestId: req.id, fromStatus: "MATCHING", toStatus: "ACCEPTED", actorId: plan.volunteer?.id, createdAt: acceptedAt });
    if (reached("IN_PROGRESS")) history.push({ requestId: req.id, fromStatus: "ACCEPTED", toStatus: "IN_PROGRESS", actorId: plan.volunteer?.id, createdAt: startedAt });
    if (plan.status === "COMPLETED") history.push({ requestId: req.id, fromStatus: "IN_PROGRESS", toStatus: "COMPLETED", actorId: requesterId, createdAt: completedAt });
    if (plan.status === "CANCELLED") history.push({ requestId: req.id, fromStatus: "PENDING", toStatus: "CANCELLED", actorId: requesterId, createdAt: minutesAfter(created, 600) });
    await db.requestStatusHistory.createMany({ data: history });

    if (plan.status === "MATCHING") toMatch.push(req.id);

    if (plan.volunteer && reached("ACCEPTED")) {
      const s = stat(plan.volunteer.id);
      s.responses.push(response);
      if (response <= 15) s.fast += 1;
      await db.requestAssignment.create({
        data: {
          requestId: req.id,
          volunteerId: plan.volunteer.id,
          status: plan.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
          responseMinutes: response,
          acceptedAt,
          startedAt: reached("IN_PROGRESS") ? startedAt : null,
          completionRequestedAt: plan.status === "COMPLETED" ? minutesAfter(completedAt, -30) : null,
          completedAt: plan.status === "COMPLETED" ? completedAt : null,
          hoursSpent: plan.status === "COMPLETED" ? Math.round(hours * 4) / 4 : null,
          createdAt: acceptedAt,
        },
      });
      // Volunteer was the top match.
      await db.requestMatch.create({
        data: { requestId: req.id, volunteerId: plan.volunteer.id, score: int(78, 96), rank: 1, breakdown: { location: 26, skill: 22, availability: 15, urgency: 8, experience: 7, reputation: 8, distanceKm: Math.round(rand() * 60) / 10 }, notifiedAt: matchingAt, createdAt: matchingAt },
      });

      const conversation = await db.conversation.create({
        data: {
          requestId: req.id,
          createdAt: acceptedAt,
          lastMessageAt: minutesAfter(acceptedAt, 40),
          participants: {
            create: [
              { userId: requesterId, lastReadAt: plan.status === "COMPLETED" ? completedAt : minutesAfter(acceptedAt, 20) },
              { userId: plan.volunteer.id, lastReadAt: minutesAfter(acceptedAt, 40) },
            ],
          },
        },
      });
      const lines = CHAT_LINES[index % CHAT_LINES.length];
      const extra = CHAT_LINES[(index + 1) % CHAT_LINES.length];
      const msgs = [
        { senderId: plan.volunteer.id, body: lines[0] },
        { senderId: requesterId, body: lines[1] },
        { senderId: plan.volunteer.id, body: extra[0] },
        { senderId: requesterId, body: extra[1] },
      ];
      await db.message.createMany({
        data: msgs.map((m, i) => ({ conversationId: conversation.id, senderId: m.senderId, body: m.body, createdAt: minutesAfter(acceptedAt, 5 + i * 10) })),
      });

      if (plan.status === "COMPLETED") {
        const h = Math.round(hours * 4) / 4;
        s.completed += 1;
        s.hours += h;
        s.people += plan.tpl.people;
        s.xp += completionXp(plan.tpl.urgency as Urgency, h);
        s.impact += impactPoints(plan.tpl.people, h);
        if (rand() > 0.15) {
          const rating = rand() > 0.25 ? 5 : 4;
          await db.review.create({
            data: { requestId: req.id, authorId: requesterId, targetId: plan.volunteer.id, rating, comment: pick(REVIEW_COMMENTS), createdAt: minutesAfter(completedAt, 60) },
          });
        }
      }
    }
  }

  // Cancellation history for a couple of volunteers to make reliability meaningful.
  stat(volunteers[5].id).cancelled += 1;
  stat(volunteers[11].id).cancelled += 1;

  console.log("› Volunteer reputation");
  for (const v of volunteers) {
    const s = stat(v.id);
    const agg = await db.review.aggregate({ where: { targetId: v.id }, _avg: { rating: true }, _count: true });
    const avgResponse = s.responses.length ? s.responses.reduce((a, b) => a + b, 0) / s.responses.length : null;
    const profile = await db.volunteerProfile.update({
      where: { userId: v.id },
      data: {
        completedCount: s.completed,
        cancelledCount: s.cancelled,
        hoursTotal: s.hours,
        peopleHelped: s.people,
        impactScore: s.impact,
        fastResponses: v.id === demoVolunteer.id ? 2 : s.fast,
        avgResponseMinutes: avgResponse ? Math.round(avgResponse * 10) / 10 : null,
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100,
        ratingCount: agg._count,
        xp: s.xp + agg._count * 8,
      },
    });
    const codes = qualifiedAchievements(profile);
    for (const code of codes) {
      const a = achievements.find((x) => x.code === code)!;
      await db.userAchievement.create({ data: { userId: v.id, achievementId: a.id, unlockedAt: daysAgo(int(1, 60)) } });
      await db.volunteerProfile.update({ where: { userId: v.id }, data: { xp: { increment: a.xpReward } } });
    }
  }

  console.log("› Matching open requests");
  for (const id of toMatch) await computeMatches(id, { notify: true });

  console.log("› Reports, notifications, audit log");
  const pendingReq = await db.request.findFirst({ where: { status: "PENDING", moderationNote: "blockedContent" } });
  await db.report.createMany({
    data: [
      { reporterId: users[4].id, targetType: "REQUEST", requestId: pendingReq?.id, reportedUserId: pendingReq?.requesterId, reason: "FAKE_REQUEST", details: "Bu ariza firibgarlikka o'xshaydi, pul so'rayapti." },
      { reporterId: volunteers[7].id, targetType: "USER", reportedUserId: users[24].id, reason: "ABUSE", details: "Suhbatda qo'pol muomala qildi." },
      { reporterId: users[9].id, targetType: "USER", reportedUserId: users[25].id, reason: "SUSPICIOUS_USER", details: "Bir xil arizani turli nomlardan yuboryapti." },
      { reporterId: users[12].id, targetType: "USER", reportedUserId: users[26].id, reason: "INAPPROPRIATE_CONTENT", status: "RESOLVED", resolvedById: admin.id, resolvedAt: daysAgo(3), resolutionNote: "Ogohlantirish berildi." },
    ],
  });

  const demoCompleted = await db.request.findFirst({ where: { requesterId: demoUser.id, status: "COMPLETED" } });
  await db.notification.createMany({
    data: [
      { userId: demoUser.id, type: "REQUEST_COMPLETED", data: { title: demoCompleted?.title ?? "", xp: 0 }, link: `/dashboard/requests/${demoCompleted?.id}`, createdAt: daysAgo(70), readAt: daysAgo(69) },
      { userId: demoUser.id, type: "REQUEST_ACCEPTED", data: { title: demoCompleted?.title ?? "", volunteer: demoVolunteer.name }, link: `/dashboard/requests/${demoCompleted?.id}`, createdAt: daysAgo(80), readAt: daysAgo(80) },
      { userId: demoVolunteer.id, type: "NEW_REVIEW", data: { title: demoCompleted?.title ?? "", rating: 5, author: demoUser.name }, link: `/dashboard/requests/${demoCompleted?.id}`, createdAt: daysAgo(69) },
      { userId: demoVolunteer.id, type: "ACHIEVEMENT_UNLOCKED", data: { code: "FIRST_HELP", xp: 20 }, link: "/dashboard/achievements", createdAt: daysAgo(79), readAt: daysAgo(79) },
    ],
  });
  await db.auditLog.createMany({
    data: [
      { actorId: admin.id, action: "admin.organization.verify", entityType: "Organization", entityId: orgs[1].id, createdAt: daysAgo(30) },
      { actorId: admin.id, action: "admin.report.resolve", entityType: "Report", createdAt: daysAgo(3) },
    ],
  });

  const counts = {
    users: await db.user.count(),
    volunteers: await db.user.count({ where: { role: "VOLUNTEER" } }),
    organizations: await db.organization.count(),
    requests: await db.request.count(),
    reviews: await db.review.count(),
    messages: await db.message.count(),
    notifications: await db.notification.count(),
  };
  console.log("✓ Seed complete", counts);
  console.log(`  Demo accounts (password: ${password}):`, Object.values(DEMO_ACCOUNTS).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
