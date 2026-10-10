import { revalidateTag } from "next/cache";
import { authRoute, parseJson } from "@/server/http/api";
import { categorySchema } from "@/schemas/misc";
import { adminDeleteCategory, adminUpsertCategory } from "@/server/services/admin";

export const PUT = authRoute<{ id: string }>(async ({ req, params, user }) => {
  const category = await adminUpsertCategory(user.id, await parseJson(req, categorySchema), params.id);
  revalidateTag("categories");
  return category;
}, { roles: ["ADMIN"] });

export const DELETE = authRoute<{ id: string }>(async ({ params, user }) => {
  await adminDeleteCategory(user.id, params.id);
  revalidateTag("categories");
  return { ok: true };
}, { roles: ["ADMIN"] });
