import {
  createUser,
  findUserById,
  findUsers,
} from "../repositories/user.repository.js";
import { hashPassword } from "../utils/password.js";
import type { CreateUserInput } from "../types/user.types.js";

export const getUsers = async (
  organizationId: number,
) => {
  return findUsers(organizationId);
};

export const getUserById = async (
  userId: number,
) => {
  return findUserById(userId);
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