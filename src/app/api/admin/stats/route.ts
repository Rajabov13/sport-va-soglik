import { authRoute } from "@/server/http/api";
import { getChartData, getImpactStats } from "@/server/services/stats";

export const GET = authRoute(async ({ req }) => {
  const weeks = Math.min(52, Math.max(4, Number(req.nextUrl.searchParams.get("weeks") ?? 12) || 12));
  const [stats, charts] = await Promise.all([getImpactStats(), getChartData(weeks)]);
  return { stats, charts };
}, { roles: ["ADMIN"] });
