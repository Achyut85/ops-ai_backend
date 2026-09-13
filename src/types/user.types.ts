export type CreateUserInput = {
  email?: string;
  username: string;
  name?: string;
  password: string;
  role: string;
  status: string;
  organizationId: number;
};

export type CreateUserRepositoryInput =
  Omit<CreateUserInput, "password"> & {
    passwordHash: string;
  };

export type UpdateUserInput = {
  username?: string;
  name?: string;
};