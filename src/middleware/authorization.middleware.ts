import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors/forbidden.error.js";

export const requireOrganizationAccount = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.auth?.actorType !== "ORGANIZATION_ACCOUNT") {
    throw new ForbiddenError("Access denied");
  }

  next();
};

export const requireUser = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.auth?.actorType !== "USER") {
    throw new ForbiddenError("Access denied");
  }

  next();
};