import { test, expect } from "@playwright/test";
import { makeUser, signUp, openChatWith, messageText } from "./helpers.js";

// Two independent browser contexts = two different people with separate cookies and keys.
test("two users chat in real time with end-to-end encryption", async ({ browser }) => {
  const aliceCtx = await browser.newContext();
  const bobCtx = await browser.newContext();
  const alicePage = await aliceCtx.newPage();
  const bobPage = await bobCtx.newPage();

  const alice = makeUser("Alice");
  const bob = makeUser("Bob");

  await signUp(alicePage, alice);
  await signUp(bobPage, bob);

  // Alice signed up before Bob existed, so reload to refresh her contacts list.
  await alicePage.reload();

  await openChatWith(alicePage, bob);
  await openChatWith(bobPage, alice);

  // Alice → Bob: shows up for Bob over Socket.io without a reload.
  const hello = `Hi Bob, this message is end-to-end encrypted ${Date.now()}`;
  await alicePage.getByPlaceholder("Type a message…").fill(hello);
  await alicePage.getByPlaceholder("Type a message…").press("Enter");

  await expect(messageText(alicePage, hello)).toBeVisible();
  await expect(messageText(bobPage, hello)).toBeVisible();

  // Bob → Alice
  const reply = `Got it, Alice, and it arrived in real time ${Date.now()}`;
  await bobPage.getByPlaceholder("Type a message…").fill(reply);
  await bobPage.getByPlaceholder("Type a message…").press("Enter");
  await expect(messageText(alicePage, reply)).toBeVisible();

  // The server only ever sees ciphertext: fetch the raw history through the API.
  const bobId = await bobPage.evaluate(async () => {
    const res = await fetch("/api/auth/check", { credentials: "include" });
    return (await res.json()).user._id;
  });
  const stored = await alicePage.evaluate(async (id) => {
    const res = await fetch(`/api/messages/${id}`, { credentials: "include" });
    return (await res.json()).messages;
  }, bobId);

  expect(stored).toHaveLength(2);
  for (const m of stored) {
    expect(m.isEncrypted).toBe(true);
    expect(m.text).not.toContain("Bob");
    expect(m.text).not.toContain("Alice");
  }

  await aliceCtx.close();
  await bobCtx.close();
});
