import { authRoute } from "@/server/http/api";
import { deleteRequestImage } from "@/server/services/uploads";

export const DELETE = authRoute<{ id: string }>(async ({ params, user }) => {
  await deleteRequestImage(user.id, params.id);
  return { ok: true };
});
