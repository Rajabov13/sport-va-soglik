import { publicRoute } from "@/server/http/api";
import { getCategories } from "@/server/services/catalog";

export const GET = publicRoute(async () => getCategories());
