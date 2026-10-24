import { createHash, randomBytes, randomUUID } from "node:crypto";

export const createRefreshToken = () =>
  randomBytes(32).toString("base64url");

export const hashRefreshToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const createRefreshFamilyId = () => randomUUID();
