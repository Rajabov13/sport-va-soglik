import { authRoute, parseQuery } from "@/server/http/api";
import { adminListQuerySchema } from "@/schemas/misc";
import { adminListRequests } from "@/server/services/admin";

export const GET = authRoute(async ({ req }) => adminListRequests(parseQuery(req, adminListQuerySchema)), { roles: ["ADMIN"] });
