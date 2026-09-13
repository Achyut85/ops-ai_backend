import { db } from "../prisma/db.js";

import type {
  CreateUserRepositoryInput,
  UpdateUserInput,
} from "../types/user.types.js";

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
    .create({
      email: data.email ?? null,
      username: data.username,
      name: data.name ?? null,
      passwordHash: data.passwordHash,
      role: data.role,
      status: data.status,
      organizationId: data.organizationId,
    });
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