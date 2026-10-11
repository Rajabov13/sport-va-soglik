import { publicRoute } from "@/server/http/api";
import { getPublicChartData, getPublicImpactStats } from "@/server/services/stats";

export const GET = publicRoute(async () => {
  const [stats, charts] = await Promise.all([getPublicImpactStats(), getPublicChartData(12)]);
  return { stats, charts };
});
