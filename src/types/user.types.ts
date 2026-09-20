import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserRole,
  UserStatus,
} from "../schemas/user.schema.js";

export type CreateUserRepositoryInput =
  Omit<CreateUserInput, "password"> & {
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    organizationId: number;
  };

export type UpdateUserRepositoryInput = UpdateUserInput;

export type UpdateUserStatusRepositoryInput = UpdateUserStatusInput;