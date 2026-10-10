// Dev helper: node scripts/shot.mjs <path> <out.png> [width] [persona]
import { chromium } from "@playwright/test";
const [, , path, out, width = "390", persona] = process.argv;
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: Number(width), height: Number(width) < 700 ? 844 : 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
if (persona) {
  await page.goto(base + "/");
  const res = await page.evaluate(async (p) => (await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: p }) })).status, persona);
  if (res !== 200) console.log("demo login failed", res);
}
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await page.screenshot({ path: out, fullPage: process.env.FULL !== "0" });
console.log(JSON.stringify({ overflow, errors: errors.slice(0, 5) }));
await browser.close();
