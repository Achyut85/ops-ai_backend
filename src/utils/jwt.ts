import jwt from "jsonwebtoken";
import type { AccessTokenPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
};

export const verifyAccessToken = (
  token: string,
): AccessTokenPayload => {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
  }) as AccessTokenPayload;
};