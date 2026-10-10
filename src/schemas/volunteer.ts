import { z } from "zod";
import { latitudeSchema, longitudeSchema, msg, optionalText } from "./common";

export const availabilitySlotSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startMinute: z.coerce.number().int().min(0).max(1439),
    endMinute: z.coerce.number().int().min(1).max(1440),
  })
  .refine((s) => s.endMinute > s.startMinute, { message: msg.timeRange, path: ["endMinute"] });

export const volunteerProfileSchema = z.object({
  bio: optionalText(600),
  skills: z.array(z.string().trim().min(2).max(40)).max(20),
  categoryIds: z.array(z.string().max(64)).min(1, msg.pickOne).max(12),
  radiusKm: z.coerce.number().int().min(1, msg.outOfRange).max(200, msg.outOfRange),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  isAvailableNow: z.boolean(),
  availability: z.array(availabilitySlotSchema).max(28),
  preferredLocationIds: z.array(z.string().max(64)).max(10),
});

export type VolunteerProfileInput = z.infer<typeof volunteerProfileSchema>;
