import { authRoute, parseQuery } from "@/server/http/api";
import { adminListQuerySchema } from "@/schemas/misc";
import { adminListUsers } from "@/server/services/admin";

export const GET = authRoute(async ({ req }) => adminListUsers(parseQuery(req, adminListQuerySchema)), { roles: ["ADMIN"] });
