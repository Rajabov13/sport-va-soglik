import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { authRoute, parseJson } from "@/server/http/api";
import { categorySchema } from "@/schemas/misc";
import { adminListCategories, adminUpsertCategory } from "@/server/services/admin";

export const GET = authRoute(async () => adminListCategories(), { roles: ["ADMIN"] });

export const POST = authRoute(async ({ req, user }) => {
  const category = await adminUpsertCategory(user.id, await parseJson(req, categorySchema));
  revalidateTag("categories");
  return NextResponse.json({ data: category }, { status: 201 });
}, { roles: ["ADMIN"] });
