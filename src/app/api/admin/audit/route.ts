import { authRoute, parseQuery } from "@/server/http/api";
import { paginationSchema } from "@/schemas/common";
import { db } from "@/server/db";

export const GET = authRoute(async ({ req }) => {
  const q = parseQuery(req, paginationSchema);
  const [items, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { actor: { select: { name: true, email: true } } } }),
    db.auditLog.count(),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}, { roles: ["ADMIN"] });
