import { NextResponse } from "next/server";
import { z } from "zod";
import { publicRoute, parseJson } from "@/server/http/api";
import { localeSchema } from "@/schemas/common";
import { db } from "@/server/db";
import { LOCALE_COOKIE } from "@/server/auth/constants";

export const POST = publicRoute(async ({ req, user }) => {
  const { locale } = await parseJson(req, z.object({ locale: localeSchema }));
  if (user) await db.user.update({ where: { id: user.id }, data: { locale } });
  const res = NextResponse.json({ data: { locale } });
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
});
