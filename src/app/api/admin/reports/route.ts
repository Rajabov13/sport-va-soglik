import { authRoute, parseQuery } from "@/server/http/api";
import { adminListQuerySchema } from "@/schemas/misc";
import { adminListReports } from "@/server/services/admin";

export const GET = authRoute(async ({ req }) => adminListReports(parseQuery(req, adminListQuerySchema)), { roles: ["ADMIN"] });
