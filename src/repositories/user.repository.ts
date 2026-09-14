import { db } from "../prisma/db.js";


import type {
  CreateUserRepositoryInput,
  UpdateUserInput,
} from "../types/user.types.js";

import { ConflictError } from "../errors/conflict.error.js";

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
  userId: number,
) => {
  return db.orm.public.User
    .where({
      id: userId,
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
      typeof error === "object" &&
      error !== null &&
      "sqlState" in error &&
      error.sqlState === "23505"
    ) {
      throw new ConflictError("Username already exists");
    }

    throw error;
  }
};

export const updateUser = async (
  userId: number,
  data: UpdateUserInput,
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
    })
    .update(data);
};