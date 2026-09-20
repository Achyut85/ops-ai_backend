import { db } from "../prisma/db.js";

import type {
  CreateUserRepositoryInput,
  UpdateUserRepositoryInput,
  UpdateUserStatusRepositoryInput,
} from "../types/user.types.js";
import { ConflictError } from "../errors/conflict.error.js";
import { isUniqueConstraintError } from "../utils/database-error.js";

export const findUsers = async (
  organizationId: number,
) => {
  return db.orm.public.User
    .select(
      "id",
      "username",
      "email",
      "name",
      "role",
      "status",
      "organizationId",
      "createdAt",
      "updatedAt",
    )
    .where({
      organizationId,
    })
    .all();
};

export const findUserById = async (
  organizationId: number,
  userId: number,
) => {
  return db.orm.public.User
    .where({
      id: userId,
      organizationId,
    })
    .first();
};

export const createUser = async (
  data: CreateUserRepositoryInput,
) => {
  try {
    return await db.orm.public.User
      .select(
        "id",
        "username",
        "email",
        "name",
        "role",
        "status",
        "organizationId",
        "createdAt",
        "updatedAt",
      )
      .create({
        email: data.email ?? null,
        username: data.username,
        name: data.name ?? null,
        passwordHash: data.passwordHash,
        role: data.role,
        status: data.status,
        organizationId: data.organizationId,
      });
  } catch (error) {
    if (
      isUniqueConstraintError(error) &&
      error.constraint === "user_organizationId_username_key"
    ) {
      throw new ConflictError("Username already exists");
    }

    throw error;
  }
};

export const updateUser = async (
  organizationId: number,
  userId: number,
  data: UpdateUserRepositoryInput,
) => {
  const updateData = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.email !== undefined && { email: data.email }),
  };

  return db.orm.public.User
    .select(
      "id",
      "username",
      "email",
      "name",
      "role",
      "status",
      "organizationId",
      "createdAt",
      "updatedAt",
    )
    .where({
      id: userId,
      organizationId,
    })
    .update(updateData);
};


export const updateUserStatus = async (
  organizationId: number,
  userId: number,
  data: UpdateUserStatusRepositoryInput,
) => {
  return db.orm.public.User
    .select(
      "id",
      "username",
      "email",
      "name",
      "role",
      "status",
      "organizationId",
      "createdAt",
      "updatedAt",
    )
    .where({
      id: userId,
      organizationId,
    })
    .update(data);
};