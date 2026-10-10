import { env } from "@/config/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Email channel abstraction. "console" logs messages (development);
 * "resend" delivers through the Resend HTTP API when RESEND_API_KEY is set.
 */
export async function sendEmail(message: EmailMessage) {
  try {
    if (env.email.provider === "resend" && env.email.resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.email.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.email.from, to: [message.to], subject: message.subject, text: message.text }),
      });
      if (!res.ok) console.error("[email] resend failed", res.status);
      return;
    }
    if (env.nodeEnv === "development" && !process.env.SEEDING) console.info(`[email] → ${message.to}: ${message.subject}`);
  } catch (error) {
    // Email is best-effort: never fail the user action because of it.
    console.error("[email] delivery error", error);
  }
}
