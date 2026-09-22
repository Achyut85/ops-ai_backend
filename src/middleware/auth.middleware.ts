import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { UnauthorizedError } from "../errors/unauthorized.error.js";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Authentication required");
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    req.auth = payload;
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
};