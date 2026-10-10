import { authRoute } from "@/server/http/api";
import { listOrgMembers } from "@/server/services/organizations";

export const GET = authRoute(async ({ user }) => listOrgMembers(user.id), { roles: ["ORGANIZATION"] });
