import { authRoute, parseQuery } from "@/server/http/api";
import { adminListQuerySchema } from "@/schemas/misc";
import { adminListOrganizations } from "@/server/services/admin";

export const GET = authRoute(async ({ req }) => adminListOrganizations(parseQuery(req, adminListQuerySchema)), { roles: ["ADMIN"] });
