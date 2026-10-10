import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, changePasswordSchema } from "@/schemas/auth";
import { createRequestSchema, completeSchema, reviewSchema } from "@/schemas/request";
import { volunteerProfileSchema } from "@/schemas/volunteer";
import { messageSchema, reportSchema, settingsSchema } from "@/schemas/misc";

const validRequest = {
  title: "Dori olib kelish kerak",
  description: "Keksa onaxonga dorixonadan dori olib kelib berish kerak, retsept tayyor.",
  categoryId: "cat1",
  urgency: "HIGH",
  address: "Chilonzor 9",
  latitude: 41.3,
  longitude: 69.2,
  contactPreferences: ["CHAT"],
  peopleCount: 1,
  estimatedHours: 1,
};

describe("auth schemas", () => {
  it("accepts a valid registration and normalises the email", () => {
    const r = registerSchema.parse({ name: "Aziz Karimov", email: "  Aziz@Example.COM ", password: "Secret123", role: "VOLUNTEER", acceptTerms: true });
    expect(r.email).toBe("aziz@example.com");
  });

  it("never allows self-registration as ADMIN", () => {
    const r = registerSchema.safeParse({ name: "Hacker", email: "h@example.com", password: "Secret123", role: "ADMIN", acceptTerms: true });
    expect(r.success).toBe(false);
  });

  it("requires a strong password and accepted terms", () => {
    expect(registerSchema.safeParse({ name: "Ali", email: "a@example.com", password: "short", role: "USER", acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ali", email: "a@example.com", password: "onlyletters", role: "USER", acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ali", email: "a@example.com", password: "Secret123", role: "USER", acceptTerms: false }).success).toBe(false);
  });

  it("requires an organization name for organization accounts", () => {
    const r = registerSchema.safeParse({ name: "Ali", email: "a@example.com", password: "Secret123", role: "ORGANIZATION", acceptTerms: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.organizationName).toBeDefined();
  });

  it("validates login and password change", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "a", newPassword: "Secret123", confirmPassword: "Secret124" }).success).toBe(false);
  });
});

describe("request schema", () => {
  it("accepts a valid request", () => {
    expect(createRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects coordinates outside Uzbekistan", () => {
    const r = createRequestSchema.safeParse({ ...validRequest, latitude: 51.5, longitude: -0.12 });
    expect(r.success).toBe(false);
  });

  it("requires a phone number when phone contact is chosen", () => {
    const r = createRequestSchema.safeParse({ ...validRequest, contactPreferences: ["PHONE"] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.contactPhone).toEqual(["phone"]);
    expect(createRequestSchema.safeParse({ ...validRequest, contactPreferences: ["PHONE"], contactPhone: "+998 90 123 45 67" }).success).toBe(true);
  });

  it("returns i18n keys as error messages", () => {
    const r = createRequestSchema.safeParse({ ...validRequest, title: "ab", contactPreferences: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fe = r.error.flatten().fieldErrors;
      expect(fe.title).toEqual(["tooShort"]);
      expect(fe.contactPreferences).toEqual(["pickOne"]);
    }
  });

  it("bounds hours and ratings", () => {
    expect(completeSchema.safeParse({ hoursSpent: 0 }).success).toBe(false);
    expect(completeSchema.safeParse({ hoursSpent: 2.5 }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 5, comment: "Rahmat" }).success).toBe(true);
  });
});

describe("other schemas", () => {
  it("validates volunteer availability ranges", () => {
    const base = { skills: [], categoryIds: ["c"], radiusKm: 10, latitude: 41.3, longitude: 69.2, isAvailableNow: true, preferredLocationIds: [] };
    expect(volunteerProfileSchema.safeParse({ ...base, availability: [{ dayOfWeek: 1, startMinute: 600, endMinute: 540 }] }).success).toBe(false);
    expect(volunteerProfileSchema.safeParse({ ...base, availability: [{ dayOfWeek: 1, startMinute: 540, endMinute: 600 }] }).success).toBe(true);
    expect(volunteerProfileSchema.safeParse({ ...base, categoryIds: [], availability: [] }).success).toBe(false);
  });

  it("validates messages, reports and settings", () => {
    expect(messageSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "REQUEST", targetId: "x", reason: "SPAM" }).success).toBe(false);
    expect(settingsSchema.safeParse({ name: "Aziz", locale: "de", emailNotifications: true }).success).toBe(false);
    expect(settingsSchema.safeParse({ name: "Aziz", locale: "uz", emailNotifications: true }).success).toBe(true);
  });
});
