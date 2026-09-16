import type { Request, Response } from "express";

import {
  getUserById,
  getUsers,
  createNewUser,
  updateExistingUser,
  updateExistingUserStatus,
} from "../services/user.service.js";

export const getUsersController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const users = await getUsers(organizationId);

  return res.json(users);
};

export const getUserByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const userId = parseInt(req.params._id, 10);

  const user = await getUserById(
    organizationId,
    userId,
  );

  return res.json(user);
};

export const createUserController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const user = await createNewUser({
    email: req.body.email,
    username: req.body.username,
    name: req.body.name,
    password: req.body.password,
    role: req.body.role,
    status: req.body.status,
    organizationId,
  });

  return res.status(201).json(user);
};

export const updateUserController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const userId = Number(req.params._id);

  const { name, email } = req.body;

  const updatedUser = await updateExistingUser(
    organizationId,
    userId,
    {
      name,
      email,
    },
  );

  return res.status(200).json(updatedUser);
};


export const updateUserStatusController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const userId = Number(req.params._id);

  const { status } = req.body;

  const updatedUser = await updateExistingUserStatus(
    organizationId,
    userId,
    {
      status,
    },
  );

  return res.status(200).json(updatedUser);
};


export const getCurrentUserController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;
  const userId = 1;

  const user = await getUserById(
    organizationId,
    userId,
  );

  return res.json(user);
};

export const updateCurrentUserController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;
  const userId = 1;

  const { name, email } = req.body;

  const updatedUser = await updateExistingUser(
    organizationId,
    userId,
    {
      name,
      email,
    },
  );

  return res.status(200).json(updatedUser);
};