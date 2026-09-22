import type { Request, Response } from "express";

import { loginOrganization, loginUser, registerOrganization } from "../services/auth.service.js";
import { loginSchema, registerOrganizationSchema, userLoginSchema } from "../schemas/auth.schema.js";
import { ValidationError } from "../errors/validation.error.js";

export const registerOrganizationController = async (
  req: Request,
  res: Response,
) => {
  const parsed = registerOrganizationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  const result = await registerOrganization(parsed.data);

  return res.status(201).json(result);
};

export const loginOrganizationController = async (
  req: Request,
  res: Response,
) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  const result = await loginOrganization(parsed.data);

  return res.status(200).json(result);
};

export const loginUserController = async (
  req: Request,
  res: Response,
) => {
  const parsed = userLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  const result = await loginUser(parsed.data);

  return res.status(200).json(result);
};

