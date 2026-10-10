import { z } from "zod";
import { idSchema, latitudeSchema, longitudeSchema, msg, optionalText, paginationSchema, phoneSchema, text } from "./common";

export const URGENCIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const REQUEST_STATUSES = [
  "DRAFT",
  "PENDING",
  "VERIFIED",
  "MATCHING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;
export const CONTACT_METHODS = ["CHAT", "PHONE", "EMAIL"] as const;

export const urgencySchema = z.enum(URGENCIES);
export const requestStatusSchema = z.enum(REQUEST_STATUSES);

export const requestBaseSchema = z.object({
  title: text(5, 120),
  description: text(20, 2000),
  categoryId: idSchema,
  urgency: urgencySchema,
  address: text(3, 200),
  locationId: z.string().max(64).optional().nullable(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  preferredDate: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), msg.date),
  contactPreferences: z.array(z.enum(CONTACT_METHODS)).min(1, msg.pickOne).max(3),
  contactPhone: z.union([phoneSchema, z.literal("")]).optional().nullable(),
  additionalInfo: optionalText(1000),
  peopleCount: z.coerce.number().int().min(1, msg.outOfRange).max(500, msg.outOfRange),
  estimatedHours: z.coerce.number().min(0.5, msg.outOfRange).max(48, msg.outOfRange),
  imageIds: z.array(z.string().max(64)).max(5).default([]),
  campaignId: z.string().max(64).optional().nullable(),
  asDraft: z.boolean().default(false),
});

const phoneRule = (v: { contactPreferences?: string[]; contactPhone?: string | null }, ctx: z.RefinementCtx) => {
  if (v.contactPreferences?.includes("PHONE") && !v.contactPhone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPhone"], message: msg.phone });
  }
};

export const createRequestSchema = requestBaseSchema.superRefine(phoneRule);
export const updateRequestSchema = requestBaseSchema.partial().superRefine(phoneRule);

export const requestListQuerySchema = paginationSchema.extend({
  scope: z.enum(["mine", "open", "all"]).default("mine"),
  status: requestStatusSchema.optional(),
  category: z.string().max(64).optional(),
  urgency: urgencySchema.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "oldest", "urgency"]).default("newest"),
});

export const completeSchema = z.object({
  hoursSpent: z.coerce.number().min(0.25, msg.outOfRange).max(48, msg.outOfRange),
  note: optionalText(500),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, msg.outOfRange).max(5, msg.outOfRange),
  comment: optionalText(1000),
});

export const cancelSchema = z.object({ reason: optionalText(300) });

export const mapQuerySchema = z.object({
  category: z.string().max(64).optional(),
  urgency: urgencySchema.optional(),
  status: z.enum(["open", "active", "completed", "all"]).default("open"),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().min(1).max(1000).optional(),
  layers: z.string().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type RequestListQuery = z.infer<typeof requestListQuerySchema>;
export type CompleteInput = z.infer<typeof completeSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
