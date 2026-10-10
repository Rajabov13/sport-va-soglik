import { authRoute, parseJson } from "@/server/http/api";
import { Errors } from "@/server/http/errors";
import { cancelSchema, completeSchema, reviewSchema } from "@/schemas/request";
import {
  acceptRequest,
  cancelRequest,
  confirmCompletion,
  declineMatch,
  requestCompletion,
  reviewRequest,
  startRequest,
  submitDraft,
  withdrawFromRequest,
} from "@/server/services/requests";

/** Request lifecycle actions. All permission checks happen inside the service layer. */
export const POST = authRoute<{ id: string; action: string }>(async ({ req, params, user }) => {
  const { id, action } = params;
  switch (action) {
    case "submit":
      return submitDraft(user, id);
    case "accept":
      return acceptRequest(user, id);
    case "start":
      return startRequest(user, id);
    case "complete":
      return requestCompletion(user, id, await parseJson(req, completeSchema));
    case "confirm":
      return confirmCompletion(user, id);
    case "withdraw":
      return withdrawFromRequest(user, id);
    case "decline":
      return declineMatch(user, id);
    case "cancel":
      return cancelRequest(user, id, (await parseJson(req, cancelSchema)).reason);
    case "review":
      return reviewRequest(user, id, await parseJson(req, reviewSchema));
    default:
      throw Errors.notFound();
  }
});
