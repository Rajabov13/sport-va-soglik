import { z } from "zod";
import { db } from "@/server/db";
import { authRoute, parseJson } from "@/server/http/api";
import { volunteerProfileSchema } from "@/schemas/volunteer";
import { getVolunteerProfile, updateVolunteerProfile } from "@/server/services/volunteers";

export const GET = authRoute(async ({ user }) => getVolunteerProfile(user.id), { roles: ["VOLUNTEER"] });

export const PUT = authRoute(
  async ({ req, user }) => {
    await updateVolunteerProfile(user.id, await parseJson(req, volunteerProfileSchema));
    return getVolunteerProfile(user.id);
  },
  { roles: ["VOLUNTEER"] },
);

const availabilitySchema = z.object({ isAvailableNow: z.boolean() });

/** Quick toggle for "available now" without resubmitting the whole profile. */
export const PATCH = authRoute(
  async ({ req, user }) => {
    const { isAvailableNow } = await parseJson(req, availabilitySchema);
    await db.volunteerProfile.update({ where: { userId: user.id }, data: { isAvailableNow } });
    return { isAvailableNow };
  },
  { roles: ["VOLUNTEER"] },
);
