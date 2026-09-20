import { z } from "zod";

// TODO: replace with your actual role values
export const userRoleSchema = z.enum([
  "ADMIN",
  "TICKET_HANDLER",
]);

// TODO: replace with your actual status values
export const userStatusSchema = z.enum([
  "ACTIVE",
  "DISABLED",
]);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  name: z.string().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

export const updateUserStatusSchema = z.object({
  status: userStatusSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;