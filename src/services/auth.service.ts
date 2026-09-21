import { db } from "../prisma/db.js";

import {
  createOrganization,
  createOrganizationAccount,
  findOrganizationAccountByEmail,
} from "../repositories/auth.repository.js";

import { hashPassword, verifyPassword } from "../utils/password.js";

import type { LoginInput, RegisterOrganizationInput } from "../schemas/auth.schema.js";
import { UnauthorizedError } from "../errors/unauthorized.error.js";

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

  return {
    account: {
      id: account.id,
      email: account.email,
      organizationId: account.organizationId,
    },
  };
};