import { authRoute, parseJson, publicRoute } from "@/server/http/api";
import { updateRequestSchema } from "@/schemas/request";
import { deleteRequest, getRequestDetail, updateRequest } from "@/server/services/requests";

export const GET = publicRoute<{ id: string }>(async ({ params, user }) => getRequestDetail(user, params.id));

export const PATCH = authRoute<{ id: string }>(async ({ req, params, user }) =>
  updateRequest(user, params.id, await parseJson(req, updateRequestSchema)),
);

export const DELETE = authRoute<{ id: string }>(async ({ params, user }) => deleteRequest(user, params.id));
