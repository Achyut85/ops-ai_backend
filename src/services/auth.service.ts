import { db } from "../prisma/db.js";

import {
  createOrganization,
  createOrganizationAccount,
  findOrganizationAccountByEmail,
  findUserByUsername,
} from "../repositories/auth.repository.js";

import { hashPassword, verifyPassword } from "../utils/password.js";

import type { LoginInput, RegisterOrganizationInput, UserLoginInput } from "../schemas/auth.schema.js";
import { UnauthorizedError } from "../errors/unauthorized.error.js";
import { generateAccessToken } from "../utils/jwt.js";

export const registerOrganization = async (
  data: RegisterOrganizationInput,
) => {
  const passwordHash = await hashPassword(data.password);

  return db.transaction(async (tx) => {
    const organization = await createOrganization(
      tx,
      data.organizationName,
    );

    const account = await createOrganizationAccount(
      tx,
      data.email,
      passwordHash,
      organization.id,
    );

    return {
      organization,
      account: {
        id: account.id,
        email: account.email,
        organizationId: account.organizationId,
      },
    };
  });
};

export const loginOrganization = async (data: LoginInput) => {
  const account = await findOrganizationAccountByEmail(
    data.email,
  );

  if (!account) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isPasswordValid = await verifyPassword(
    data.password,
    account.passwordHash,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const accessToken = generateAccessToken({
    sub: String(account.id),
    organizationId: account.organizationId,
    actorType: "ORGANIZATION_ACCOUNT",
  });

  return {
    accessToken,
    account: {
      id: account.id,
      email: account.email,
      organizationId: account.organizationId,
    },
  
  };
};


export const loginUser = async (data: UserLoginInput) => {
  const user = await findUserByUsername(
    data.organizationId,
    data.username,
  );

  if (!user) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const isPasswordValid = await verifyPassword(
    data.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid username or password");
  }

  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError("User account is disabled");
  }

  const accessToken = generateAccessToken({
    sub: String(user.id),
    organizationId: user.organizationId,
    actorType: "USER",
  });

  return {
    accessToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
    },
  };
};