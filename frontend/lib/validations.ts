import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

// ─── Signup ───────────────────────────────────────────────

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128, "Too long")
  .regex(/[a-zA-Z]/, "Must contain a letter")
  .regex(/\d/, "Must contain a number");

/** Score 0–3 — number of password rules satisfied. Used by the strength indicator. */
export function scorePassword(p: string): 0 | 1 | 2 | 3 {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-zA-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  return s as 0 | 1 | 2 | 3;
}

export const employeeSignupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(50, "Too long"),
    email: z.string().email("Enter a valid email"),
    password: passwordSchema,
    confirm_password: z.string(),
    terms: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the demo terms" }),
    }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type EmployeeSignupValues = z.infer<typeof employeeSignupSchema>;

export const hrSignupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(50, "Too long"),
    email: z.string().email("Enter a valid email"),
    password: passwordSchema,
    confirm_password: z.string(),
    invite_code: z.string().min(1, "Invite code required"),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type HRSignupValues = z.infer<typeof hrSignupSchema>;

export const profileEditSchema = z.object({
  full_name: z.string().min(1).max(100),
  headline: z.string().max(200).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  years_experience: z.coerce.number().min(0).max(60).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  allocation_status: z.enum(["ALLOCATED", "UNALLOCATED", "PARTIAL"]).optional(),
});
export type ProfileEditValues = z.infer<typeof profileEditSchema>;

export const searchSchema = z.object({
  query: z.string().min(3, "Type at least three characters").max(500),
});
export type SearchValues = z.infer<typeof searchSchema>;

export const teamBuildSchema = z.object({
  brief: z.string().min(5).max(600),
  team_size: z.coerce.number().int().min(2).max(8).default(4),
});
export type TeamBuildValues = z.infer<typeof teamBuildSchema>;
