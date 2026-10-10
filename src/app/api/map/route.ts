import { publicRoute, parseQuery } from "@/server/http/api";
import { mapQuerySchema } from "@/schemas/request";
import { getMapData } from "@/server/services/map";

export const GET = publicRoute(async ({ req }) => getMapData(parseQuery(req, mapQuerySchema)));
