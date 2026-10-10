import { publicRoute } from "@/server/http/api";
import { getLocations } from "@/server/services/catalog";

export const GET = publicRoute(async () => getLocations());
