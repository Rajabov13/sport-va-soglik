import { publicRoute } from "@/server/http/api";
import { getChartData, getImpactStats } from "@/server/services/stats";

export const GET = publicRoute(async () => {
  const [stats, charts] = await Promise.all([getImpactStats(), getChartData(12)]);
  return { stats, charts };
});
