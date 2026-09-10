import { db } from "../prisma/db.js";

export const findUsers = async (
  organizationId: number,
) => {
  return db.orm.public.User
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


export const createUser = async (data: {
  email?: string;
  username: string;
  name?: string;
  passwordHash: string;
  role: string;
  status: string;
  organizationId: number;
}) => {
  return db.orm.public.User.create({
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
  data: {
    username?: string;
    name?: string;
  },
) => {
  return db.orm.public.User
    .where({
      id: userId,
    })
    .update({
      ...(data.username !== undefined && {
        username: data.username,
      }),
      ...(data.name !== undefined && {
        name: data.name,
      }),
    });
};