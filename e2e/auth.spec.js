import { test, expect } from "@playwright/test";
import { makeUser, signUp, logIn, expectChatScreen } from "./helpers.js";

test("sign up, log out and log back in", async ({ page }) => {
  const user = makeUser("Alice");

  await signUp(page, user);

  // A private key for E2E encryption is generated on sign-up and kept in this browser only.
  const storedKey = await page.evaluate(() =>
    Object.keys(localStorage).find((k) => k.startsWith("nw_pk_")),
  );
  expect(storedKey).toBeTruthy();

  await page.getByTitle("Log out").click();
  await expect(page).toHaveURL(/\/login$/);

  await logIn(page, user);
  await expectChatScreen(page);
});

test("login with a wrong password is rejected", async ({ page }) => {
  const user = makeUser("Bob");
  await signUp(page, user);
  await page.getByTitle("Log out").click();

  await logIn(page, { ...user, password: "wrong-password" });

  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
});
