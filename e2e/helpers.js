import { expect } from "@playwright/test";

let counter = 0;

/** Unique test user, so tests never collide in the shared database. */
export function makeUser(name) {
  counter += 1;
  const id = `${Date.now().toString(36)}${counter}`;
  return {
    fullName: `${name} ${id}`,
    email: `${name.toLowerCase()}.${id}@e2e.test`,
    password: "secret123",
  };
}

export async function signUp(page, user) {
  await page.goto("/signup");
  await page.getByPlaceholder("Jane Doe").fill(user.fullName);
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expectChatScreen(page);
}

export async function logIn(page, user) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function expectChatScreen(page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByPlaceholder("Filter by name…")).toBeVisible();
}

/** Opens the 1:1 chat with `other` from the contacts list. */
export async function openChatWith(page, other) {
  await page.getByPlaceholder("Filter by name…").fill(other.fullName);
  await page.getByRole("button", { name: other.fullName }).click();
  await expect(page.getByPlaceholder("Type a message…")).toBeVisible();
}

/**
 * A message inside the open conversation. The chat list preview shows only the first 42
 * characters, so test messages are longer than that and matched exactly.
 */
export function messageText(page, text) {
  if (text.length <= 42) throw new Error("Use test messages longer than 42 characters");
  return page.getByText(text, { exact: true });
}
