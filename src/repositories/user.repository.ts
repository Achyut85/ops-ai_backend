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
  email: string;
  username?: string;
  name?: string;
  organizationId: number;
}) => {
  return db.orm.public.User.create({
    email: data.email,
    username: data.username ?? null,
    name: data.name ?? null,
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