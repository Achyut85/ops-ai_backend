import {
  createUser,
  findUserById,
  findUsers,
} from "../repositories/user.repository.js";

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

export const createNewUser = async (data: {
  email: string;
  username?: string;
  name?: string;
  organizationId: number;
}) => {
  return createUser(data);
};