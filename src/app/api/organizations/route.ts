import { z } from "zod";
import { publicRoute, parseQuery } from "@/server/http/api";
import { paginationSchema } from "@/schemas/common";
import { listOrganizations } from "@/server/services/organizations";

const schema = paginationSchema.extend({ q: z.string().trim().max(100).optional() });

export const GET = publicRoute(async ({ req }) => listOrganizations(parseQuery(req, schema)));
