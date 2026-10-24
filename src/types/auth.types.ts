import type { JwtPayload } from "jsonwebtoken";
export type ActorType =
  | "USER"
  | "ORGANIZATION_ACCOUNT";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  organizationId: number;
  actorType: ActorType;
}

export interface RefreshSessionIdentity {
  actorId: number;
  actorType: ActorType;
  organizationId: number;
}