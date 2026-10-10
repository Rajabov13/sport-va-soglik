import { authRoute } from "@/server/http/api";
import { getAdminOverview } from "@/server/services/admin";

export const GET = authRoute(async () => getAdminOverview(), { roles: ["ADMIN"] });
