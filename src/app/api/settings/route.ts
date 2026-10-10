import { NextResponse } from "next/server";
import { authRoute, parseJson } from "@/server/http/api";
import { settingsSchema } from "@/schemas/misc";
import { getMe, updateSettings } from "@/server/services/users";
import { LOCALE_COOKIE } from "@/server/auth/constants";

export const GET = authRoute(async ({ user }) => getMe(user.id));

export const PUT = authRoute(async ({ req, user }) => {
  const input = await parseJson(req, settingsSchema);
  await updateSettings(user.id, input);
  const res = NextResponse.json({ data: await getMe(user.id) });
  res.cookies.set(LOCALE_COOKIE, input.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
});
