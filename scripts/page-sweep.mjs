// Dev helper: visits every page per persona and reports HTTP status, JS errors and horizontal overflow.
import { chromium } from "@playwright/test";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ids = JSON.parse(process.argv[2] ?? "{}");
const plan = {
  anon: ["/", "/map", "/impact", "/campaigns", `/campaigns/${ids.campaign}`, "/organizations", `/organizations/${ids.org}`, `/volunteers/${ids.volunteer}`, "/auth/login", "/auth/register", "/offline", "/forbidden", "/nope-404"],
  user: ["/dashboard", "/dashboard/requests", "/dashboard/requests/create", `/dashboard/requests/${ids.request}`, `/dashboard/requests/${ids.request}/edit`, "/dashboard/messages", "/dashboard/notifications", "/dashboard/history", "/dashboard/achievements", "/dashboard/settings"],
  volunteer: ["/dashboard/volunteer", "/dashboard/volunteer/tasks", "/dashboard/volunteer/profile", `/dashboard/requests/${ids.request}`, "/dashboard/achievements", "/dashboard/history", "/dashboard/messages"],
  organization: ["/dashboard/organization", "/dashboard/requests", "/dashboard/requests/create"],
  admin: ["/admin", "/admin/users", "/admin/requests", "/admin/organizations", "/admin/reports", "/admin/analytics", "/admin/categories"],
};
for (const width of (process.env.WIDTHS ?? "375,1280").split(",").map(Number)) {
  for (const [persona, paths] of Object.entries(plan)) {
    const ctx = await browser.newContext({ viewport: { width, height: 850 } });
    const page = await ctx.newPage();
    if (persona !== "anon") {
      await page.goto(base + "/");
      await page.evaluate(async (p) => fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: p }) }), persona);
    }
    for (const path of paths) {
      const errors = [];
      const onErr = (e) => errors.push(e.message);
      const onConsole = (m) => { if (m.type() === "error" && !m.text().includes("ERR_TUNNEL") && !m.text().includes("404 (Not Found)")) errors.push(m.text().slice(0, 160)); };
      page.on("pageerror", onErr); page.on("console", onConsole);
      const res = await page.goto(base + path, { waitUntil: "networkidle" }).catch((e) => ({ status: () => "ERR " + e.message }));
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => "?");
      const finalPath = new URL(page.url()).pathname;
      const bad = errors.length || overflow > 0 || (res.status() >= 400 && path !== "/nope-404");
      console.log(`${bad ? "✗" : "✓"} ${width} ${persona.padEnd(12)} ${String(res.status()).padEnd(4)} ${path}${finalPath !== path.split("?")[0] ? ` → ${finalPath}` : ""}${overflow > 0 ? ` overflow=${overflow}` : ""}${errors.length ? ` errors=${JSON.stringify(errors.slice(0, 2))}` : ""}`);
      page.off("pageerror", onErr); page.off("console", onConsole);
    }
    await ctx.close();
  }
}
await browser.close();
