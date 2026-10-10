import { z } from "zod";
import { msg, text } from "./common";

export const passwordSchema = z
  .string()
  .min(8, msg.password)
  .max(128, msg.tooLong)
  .regex(/[A-Za-z]/, msg.password)
  .regex(/\d/, msg.password);

/** Public self-registration never allows ADMIN. */
export const registerRoleSchema = z.enum(["USER", "VOLUNTEER", "ORGANIZATION"]);

export const registerSchema = z
  .object({
    name: text(2, 80),
    email: z.string().trim().toLowerCase().email(msg.email).max(160, msg.tooLong),
    password: passwordSchema,
    role: registerRoleSchema,
    organizationName: z.string().trim().max(120, msg.tooLong).optional(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: msg.terms }) }),
  })
  .superRefine((v, ctx) => {
    if (v.role === "ORGANIZATION" && (!v.organizationName || v.organizationName.length < 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["organizationName"], message: msg.tooShort });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(msg.email),
  password: z.string().min(1, msg.required).max(128, msg.tooLong),
});

export const demoLoginSchema = z.object({
  persona: z.enum(["user", "volunteer", "organization", "admin"]),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, msg.required),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, msg.required),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: msg.passwordMismatch });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
