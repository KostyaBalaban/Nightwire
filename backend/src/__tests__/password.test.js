import { describe, test, expect } from "@jest/globals";
import bcrypt from "bcryptjs";

describe("Password hashing", () => {
  test("shouldHashPassword — bcrypt produces a hash different from the plaintext", async () => {
    const hash = await bcrypt.hash("mypassword", 10);

    expect(hash).not.toBe("mypassword");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  test("shouldVerifyPasswordCorrectly — bcrypt.compare returns true for the correct password", async () => {
    const hash = await bcrypt.hash("mypassword", 10);

    await expect(bcrypt.compare("mypassword", hash)).resolves.toBe(true);
  });

  test("shouldRejectInvalidPassword — bcrypt.compare returns false for a wrong password", async () => {
    const hash = await bcrypt.hash("mypassword", 10);

    await expect(bcrypt.compare("wrongpassword", hash)).resolves.toBe(false);
  });
});
