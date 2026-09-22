import { z } from "zod";

export const registerOrganizationSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

export const userLoginSchema = z.object({
  organizationId: z.number().int().positive(),

  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export type UserLoginInput = z.infer<typeof userLoginSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export type RegisterOrganizationInput = z.infer<
  typeof registerOrganizationSchema
>;