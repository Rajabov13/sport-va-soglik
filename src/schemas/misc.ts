import { z } from "zod";
import { localeSchema, msg, optionalText, phoneSchema, text, paginationSchema } from "./common";

export const messageSchema = z.object({
  body: z.string().trim().max(2000, msg.tooLong).default(""),
  attachmentIds: z.array(z.string().max(64)).max(3).default([]),
}).refine((v) => v.body.length > 0 || v.attachmentIds.length > 0, { path: ["body"], message: msg.required });

export const REPORT_REASONS = ["FAKE_REQUEST", "ABUSE", "INAPPROPRIATE_CONTENT", "SUSPICIOUS_USER", "OTHER"] as const;
export const REPORT_TARGETS = ["REQUEST", "USER", "CONVERSATION", "MESSAGE"] as const;

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().min(1).max(64),
  reason: z.enum(REPORT_REASONS),
  details: optionalText(1000),
});

export const settingsSchema = z.object({
  name: text(2, 80),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  locale: localeSchema,
  bio: optionalText(600),
  emailNotifications: z.boolean(),
});

export const campaignSchema = z
  .object({
    title: text(5, 120),
    description: text(20, 3000),
    categoryId: z.string().max(64).optional().nullable(),
    locationId: z.string().max(64).optional().nullable(),
    startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), msg.date),
    endsAt: z
      .string()
      .optional()
      .nullable()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), msg.date),
    goalHelps: z.coerce.number().int().min(1, msg.outOfRange).max(100000, msg.outOfRange),
    goalVolunteers: z.coerce.number().int().min(1, msg.outOfRange).max(10000, msg.outOfRange),
  })
  .refine((v) => !v.endsAt || Date.parse(v.endsAt) >= Date.parse(v.startsAt), { path: ["endsAt"], message: msg.date });

export const organizationUpdateSchema = z.object({
  name: text(3, 120),
  description: text(20, 2000),
  type: z.string().trim().max(40),
  website: z.union([z.string().trim().url(msg.required).max(200), z.literal("")]).optional(),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  email: z.union([z.string().trim().email(msg.email), z.literal("")]).optional(),
  address: optionalText(200),
  locationId: z.string().max(64).optional().nullable(),
});

export const memberActionSchema = z.object({ action: z.enum(["approve", "remove"]) });

export const adminUserActionSchema = z.object({
  action: z.enum(["suspend", "activate", "verify", "delete", "setRole"]),
  role: z.enum(["USER", "VOLUNTEER", "ORGANIZATION", "ADMIN"]).optional(),
  reason: optionalText(300),
});

export const adminRequestActionSchema = z.object({
  action: z.enum(["approve", "reject", "delete", "rematch"]),
  note: optionalText(300),
});

export const adminOrgActionSchema = z.object({
  action: z.enum(["verify", "reject", "suspend"]),
});

export const adminReportActionSchema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  note: optionalText(500),
  suspendUser: z.boolean().default(false),
  removeContent: z.boolean().default(false),
});

export const categorySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, msg.required),
  icon: z.string().trim().min(2).max(40),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, msg.required),
  nameUz: text(2, 60),
  nameRu: text(2, 60),
  nameEn: text(2, 60),
  relatedSkills: z.array(z.string().trim().min(2).max(40)).max(20).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const adminListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(["USER", "VOLUNTEER", "ORGANIZATION", "ADMIN"]).optional(),
  status: z.string().max(30).optional(),
  sort: z.enum(["newest", "oldest", "name"]).default("newest"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
