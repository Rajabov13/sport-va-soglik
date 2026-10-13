/** Registers the bot webhook: APP_URL + /api/telegram/webhook. Usage: npm run telegram:webhook */
import { env } from "../src/config/env";
import { setWebhook } from "../src/server/telegram/bot";

const url = `${env.appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
setWebhook(url).then(() => console.log(`Webhook set: ${url}`));
