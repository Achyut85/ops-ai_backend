import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../utils/password.js";

describe("Password Utility", () => {
  it("should hash a password", async () => {
    const password = "myPassword123";

    const hash = await hashPassword(password);

    expect(hash).toBeTypeOf("string");
    expect(hash).not.toBe(password);
    expect(hash.startsWith("$argon2")).toBe(true);
  });
});


it("should verify a correct password", async () => {
  const password = "myPassword123";

  const hash = await hashPassword(password);

  const result = await verifyPassword(
    password,
    hash,
  );

  expect(result).toBe(true);
});