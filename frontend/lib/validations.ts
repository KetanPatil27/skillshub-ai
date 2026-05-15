import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

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
