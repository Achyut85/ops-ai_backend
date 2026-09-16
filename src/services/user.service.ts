import {
  createUser,
  findUserById,
  findUsers,
  updateUser,
  updateUserStatus,
} from "../repositories/user.repository.js";

import { hashPassword } from "../utils/password.js";

import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "../types/user.types.js";

import { NotFoundError } from "../errors/not-found.error.js";

export const getUsers = async (
  organizationId: number,
) => {
  return findUsers(organizationId);
};

export const getUserById = async (
  organizationId: number,
  userId: number,
) => {
  const user = await findUserById(
    organizationId,
    userId,
  );

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};

export const createNewUser = async (
  data: CreateUserInput,
) => {
  const { password, ...userData } = data;

  const passwordHash = await hashPassword(password);

  return createUser({
    ...userData,
    passwordHash,
  });
};

export const updateExistingUser = async (
  organizationId: number,
  userId: number,
  data: UpdateUserInput,
) => {
  const user = await updateUser(
    organizationId,
    userId,
    data,
  );

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};




export const updateExistingUserStatus = async (
  organizationId: number,
  userId: number,
  data: UpdateUserStatusInput,
) => {
  const user = await updateUserStatus(
    organizationId,
    userId,
    data,
  );

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};