import type { Request, Response } from "express";

import {
  getUserById,
  getUsers,
  createNewUser,
  updateExistingUser,
  updateExistingUserStatus,
} from "../services/user.service.js";

import { ValidationError } from "../errors/validation.error.js";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../schemas/user.schema.js";

export const getUsersController = async (
  req: Request,
  res: Response,
) => {
  const organizationId = req.auth!.organizationId;

  const users = await getUsers(organizationId);

  return res.json(users);
};

export const getUserByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = req.auth!.organizationId;
  const userId = Number(req.params._id);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

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
  const organizationId = req.auth!.organizationId;

  const parsed = createUserSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues
        .map((issue) => issue.message)
        .join(", "),
    );
  }

  const user = await createNewUser(
    organizationId,
    parsed.data,
  );

  return res.status(201).json(user);
};

export const updateUserController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = req.auth!.organizationId;
  const userId = Number(req.params._id);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const parsed = updateUserSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues
        .map((issue) => issue.message)
        .join(", "),
    );
  }

  const updatedUser = await updateExistingUser(
    organizationId,
    userId,
    parsed.data,
  );

  return res.status(200).json(updatedUser);
};

export const updateUserStatusController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = req.auth!.organizationId;
  const userId = Number(req.params._id);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const parsed = updateUserStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues
        .map((issue) => issue.message)
        .join(", "),
    );
  }

  const updatedUser = await updateExistingUserStatus(
    organizationId,
    userId,
    parsed.data,
  );

  return res.status(200).json(updatedUser);
};

export const getCurrentUserController = async (
  req: Request,
  res: Response,
) => {
  const organizationId = req.auth!.organizationId;
  const userId = Number(req.auth!.sub);

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
  const organizationId = req.auth!.organizationId;
  const userId = Number(req.auth!.sub);

  const parsed = updateUserSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues
        .map((issue) => issue.message)
        .join(", "),
    );
  }

  const updatedUser = await updateExistingUser(
    organizationId,
    userId,
    parsed.data,
  );

  return res.status(200).json(updatedUser);
};