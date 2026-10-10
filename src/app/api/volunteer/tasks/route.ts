import { authRoute } from "@/server/http/api";
import { listVolunteerTasks } from "@/server/services/requests";

export const GET = authRoute(
  async ({ req, user }) => {
    const s = req.nextUrl.searchParams.get("status");
    return listVolunteerTasks(user.id, s === "active" || s === "completed" ? s : "all");
  },
  { roles: ["VOLUNTEER"] },
);
