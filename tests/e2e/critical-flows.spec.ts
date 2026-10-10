import { expect, test, type Page } from "@playwright/test";

/** Run the UI in English for readable assertions (Uzbek is the product default). */
async function useEnglish(page: Page) {
  await page.context().addCookies([{ name: "qollab_locale", value: "en", domain: "localhost", path: "/" }]);
}

async function demoLogin(page: Page, persona: "user" | "volunteer" | "admin") {
  await page.context().clearCookies();
  await useEnglish(page);
  await page.goto("/auth/login");
  await page.getByTestId(`demo-${persona}`).click();
  await page.waitForURL(persona === "admin" ? "**/admin" : persona === "volunteer" ? "**/dashboard/volunteer" : "**/dashboard");
}

test.describe.configure({ mode: "serial" });

test("register, logout and log back in", async ({ page }) => {
  await useEnglish(page);
  const email = `e2e.${Date.now()}@example.com`;
  await page.goto("/auth/register");
  await page.getByTestId("role-USER").click();
  await page.getByLabel("Full name").fill("Sevara Tursunova");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Secret123");
  await page.getByText("I agree to the community rules").click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /Hello, Sevara/ })).toBeVisible();

  await page.getByRole("button", { name: "Profile" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.waitForURL((url) => url.pathname === "/");

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Secret123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /Hello, Sevara/ })).toBeVisible();
});

test("shows field errors for invalid login", async ({ page }) => {
  await useEnglish(page);
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();
});

let requestUrl = "";
const TITLE = `Urgent medicine for grandmother ${Date.now()}`;

test("requester creates an urgent request and sees smart matching", async ({ page }) => {
  await demoLogin(page, "user");
  await page.goto("/dashboard/requests/create");
  await page.getByLabel("Title").fill(TITLE);
  await page.getByLabel("Description").fill("My 80-year-old grandmother ran out of heart medicine. Please bring it from the pharmacy nearby today.");
  await page.getByTestId("category-medicine").click();
  await page.getByTestId("urgency-CRITICAL").click();
  await page.getByLabel("City").selectOption({ label: "Toshkent" });
  await page.getByLabel("Address").fill("Chilonzor 9, house 12");
  // Pin the exact point on the map.
  const map = page.getByRole("region", { name: "Pin on the map" });
  await map.click({ position: { x: 160, y: 120 } });
  await page.getByTestId("publish-request").click();
  await page.waitForURL((url) => /^\/dashboard\/requests\/(?!create$)[a-z0-9]+$/.test(url.pathname));
  requestUrl = new URL(page.url()).pathname;
  await expect(page.getByTestId("request-title")).toHaveText(TITLE);
  await expect(page.getByText("Looking for volunteer").first()).toBeVisible();
  const matches = page.getByTestId("match-list");
  await expect(matches).toBeVisible();
  await expect(matches.getByText("Jasur Rahimov")).toBeVisible();
  await expect(page.getByText("Best match for this request")).toBeVisible();
});

test("volunteer accepts, starts and completes the request", async ({ page }) => {
  await demoLogin(page, "volunteer");
  await expect(page.getByTestId("matched-requests").getByText(TITLE)).toBeVisible();
  await page.goto(requestUrl);
  await page.getByTestId("accept-request").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Accept request" }).click();
  await expect(page.getByText("Accepted").first()).toBeVisible();
  await page.getByTestId("start-request").click();
  await expect(page.getByText("In progress").first()).toBeVisible();
  await page.getByTestId("complete-open").click();
  await page.getByLabel("Hours spent").fill("1.5");
  await page.getByTestId("complete-submit").click();
  await expect(page.getByText("Waiting for the requester to confirm.").first()).toBeVisible();
});

test("requester confirms, the volunteer earns an achievement, and a review is left", async ({ page }) => {
  await demoLogin(page, "user");
  await page.goto(requestUrl);
  await page.getByTestId("confirm-completion").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirm completion" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Thank you! The request is completed.")).toBeVisible();
  await expect(dialog.getByText("10 Helps")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).first().click();
  await expect(page.getByText("Completed").first()).toBeVisible();

  await page.getByTestId("review-open").click();
  await page.getByRole("radio", { name: "5 ★" }).click();
  await page.getByLabel("Comment").fill("Thank you so much, very kind and fast!");
  await page.getByTestId("review-submit").click();
  await expect(page.getByTestId("review-item").getByText("Thank you so much, very kind and fast!")).toBeVisible();
});

test("impact statistics and achievements reflect the completed help", async ({ page }) => {
  await useEnglish(page);
  await page.goto("/impact");
  await expect(page.getByRole("heading", { name: "Impact dashboard" })).toBeVisible();
  await demoLogin(page, "volunteer");
  await page.goto("/dashboard/achievements");
  await expect(page.getByTestId("badge-TEN_HELPS")).toHaveAttribute("data-unlocked", "true");
});

test("non-admins are blocked from the admin panel", async ({ page }) => {
  await demoLogin(page, "user");
  await page.goto("/admin");
  await page.waitForURL("**/forbidden");
  await expect(page.getByText("Access denied")).toBeVisible();
});

test("unknown pages show the 404 page", async ({ page }) => {
  await useEnglish(page);
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("@mobile landing and dashboard have no horizontal overflow", async ({ page }) => {
  await useEnglish(page);
  for (const path of ["/", "/map", "/impact", "/campaigns", "/organizations"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await demoLogin(page, "user");
  for (const path of ["/dashboard", "/dashboard/requests", "/dashboard/requests/create", "/dashboard/messages", "/dashboard/notifications", "/dashboard/settings"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await expect(page.getByRole("navigation", { name: "Menu" }).last()).toBeVisible();
});
