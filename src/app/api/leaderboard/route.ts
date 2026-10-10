import { publicRoute } from "@/server/http/api";
import { getLeaderboard } from "@/server/services/stats";

export const GET = publicRoute(async () => getLeaderboard(20));
