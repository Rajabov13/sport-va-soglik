import { authRoute } from "@/server/http/api";
import { listMatchesForVolunteer } from "@/server/services/requests";

export const GET = authRoute(async ({ user }) => listMatchesForVolunteer(user.id), { roles: ["VOLUNTEER"] });
