import type { Request, Response } from "express";

import {
  getUserById,
  getUsers,
  createNewUser,
} from "../services/user.service.js";

export const getUsersController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  try {
    const users = await getUsers(organizationId);

    return res.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};


export const getUserByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const userId = parseInt(req.params._id, 10);

  try {
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);

    return res.status(500).json({
      message: "Failed to fetch user",
    });
  }
};

export const createUserController = async (
  req: Request,
  res: Response,
) => {
  const user = await createNewUser({
    email: req.body.email,
    username: req.body.username,
    name: req.body.name,
    password: req.body.password,
    role: req.body.role,
    status: req.body.status,
    organizationId: req.body.organizationId,
  });
return res.status(201).json(user);
};
  