/**
 * Application error carrying an HTTP status and a translation key.
 * The `code` is a key from the `errors` namespace of the i18n dictionaries,
 * so the client can render a localized message without leaking internals.
 */
export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "validation"
  | "conflict"
  | "rateLimited"
  | "invalidCredentials"
  | "emailTaken"
  | "accountSuspended"
  | "invalidTransition"
  | "alreadyAssigned"
  | "fileTooLarge"
  | "fileType"
  | "tooManyFiles"
  | "csrf"
  | "demoDisabled"
  | "oauthNotConfigured"
  | "alreadyReviewed"
  | "server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export const Errors = {
  unauthorized: () => new ApiError(401, "unauthorized"),
  forbidden: () => new ApiError(403, "forbidden"),
  notFound: () => new ApiError(404, "notFound"),
  conflict: (code: ErrorCode = "conflict") => new ApiError(409, code),
  invalidTransition: () => new ApiError(409, "invalidTransition"),
  validation: (fieldErrors?: Record<string, string[]>) => new ApiError(422, "validation", fieldErrors),
  rateLimited: () => new ApiError(429, "rateLimited"),
};
