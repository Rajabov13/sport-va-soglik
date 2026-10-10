/**
 * Centralised, typed access to environment variables.
 * Server-only values must never be imported from client components.
 */
function bool(value: string | undefined, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  appUrl: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  sessionMaxAgeDays: Number(process.env.SESSION_MAX_AGE_DAYS ?? 30),
  demoMode: bool(process.env.DEMO_MODE),
  demoPassword: process.env.DEMO_PASSWORD ?? "",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  storage: {
    localDir: process.env.UPLOAD_DIR ?? "./storage/uploads",
    maxFileBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024),
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER ?? "console") as "console" | "resend",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "QO'LLAB <noreply@qollab.uz>",
  },
  rateLimit: {
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
    geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-flash-lite-latest",
  },
};

export function assertServerEnv() {
  if (env.isProd && env.sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
  }
}
