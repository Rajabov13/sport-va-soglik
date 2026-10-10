import { publicRoute } from "@/server/http/api";
import { getVolunteerProfile } from "@/server/services/volunteers";

export const GET = publicRoute<{ id: string }>(async ({ params }) => {
  const p = await getVolunteerProfile(params.id);
  // Public view never exposes precise coordinates.
  return { ...p, latitude: null, longitude: null };
});
