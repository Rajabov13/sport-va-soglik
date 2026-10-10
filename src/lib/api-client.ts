/** Typed fetch wrapper for the QO'LLAB REST API. Errors carry an i18n code — never raw server details. */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    public fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(code);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, "network");
  }
  let json: { data?: T; error?: { code: string; fieldErrors?: Record<string, string[]> } } = {};
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw new ApiClientError(res.status, "server");
  }
  if (!res.ok || json.error) {
    throw new ApiClientError(res.status, json.error?.code ?? "server", json.error?.fieldErrors);
  }
  return json.data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body ?? {}),
  delete: <T>(url: string) => request<T>("DELETE", url),
  upload: <T>(url: string, form: FormData) => request<T>("POST", url, form),
};

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
