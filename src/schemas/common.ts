import { z } from "zod";
import { UZ_BOUNDS } from "@/lib/geo";

/** Validation messages are i18n keys from the `validation` namespace. */
export const msg = {
  required: "required",
  email: "email",
  tooShort: "tooShort",
  tooLong: "tooLong",
  password: "password",
  phone: "phone",
  outOfRange: "outOfRange",
  coordinates: "coordinates",
  date: "date",
  pickOne: "pickOne",
  terms: "terms",
  passwordMismatch: "passwordMismatch",
  timeRange: "timeRange",
} as const;

export const localeSchema = z.enum(["uz", "ru", "en"]);
export type Locale = z.infer<typeof localeSchema>;

export const idSchema = z.string().min(1, msg.required).max(64);

export const text = (min: number, max: number) =>
  z.string().trim().min(min, min <= 1 ? msg.required : msg.tooShort).max(max, msg.tooLong);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, msg.tooLong)
    .optional()
    .transform((v) => (v ? v : undefined));

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, msg.phone);

export const latitudeSchema = z.coerce
  .number({ invalid_type_error: msg.coordinates })
  .min(UZ_BOUNDS.minLat, msg.coordinates)
  .max(UZ_BOUNDS.maxLat, msg.coordinates);

export const longitudeSchema = z.coerce
  .number({ invalid_type_error: msg.coordinates })
  .min(UZ_BOUNDS.minLng, msg.coordinates)
  .max(UZ_BOUNDS.maxLng, msg.coordinates);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
