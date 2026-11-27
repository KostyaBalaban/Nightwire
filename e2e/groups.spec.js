import { test, expect } from "@playwright/test";
import { makeUser, signUp, messageText } from "./helpers.js";

async function openGroups(page) {
  await page.getByTitle("Groups").click();
  await expect(page.getByPlaceholder("Search groups…")).toBeVisible();
}

test("create a group, join it by invite code and chat in it", async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  const memberCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  const memberPage = await memberCtx.newPage();

  const owner = makeUser("Olivia");
  const member = makeUser("Mike");
  const groupName = `Launch team ${Date.now()}`;

  await signUp(ownerPage, owner);
  await signUp(memberPage, member);

  // Owner creates the group
  await openGroups(ownerPage);
  await ownerPage.getByTitle("Create group").click();
  await ownerPage.getByPlaceholder("Group name").fill(groupName);
  await ownerPage.getByPlaceholder("Description (optional)").fill("Created by an e2e test");
  await ownerPage.getByRole("button", { name: "Create", exact: true }).click();
  await expect(ownerPage.getByText(`Group "${groupName}" created`)).toBeVisible();

  // Open it and read the invite code from the header
  await ownerPage.getByRole("button", { name: groupName }).click();
  const invite = ownerPage.getByText(/^Invite:/);
  await expect(invite).toBeVisible();
  const inviteCode = (await invite.locator("span").textContent()).trim();
  expect(inviteCode).toMatch(/^[0-9a-f]{8}$/);

  // Second user joins with the code
  await openGroups(memberPage);
  await memberPage.getByTitle("Join by invite").click();
  await memberPage.getByPlaceholder("Invite code").fill(inviteCode);
  await memberPage.getByRole("button", { name: "Join", exact: true }).click();
  await expect(memberPage.getByText(`Joined "${groupName}"`)).toBeVisible();
  await memberPage.getByRole("button", { name: groupName }).click();
  await expect(memberPage.getByPlaceholder("Message group…")).toBeVisible();

  // The owner sees the join event live, then the member sees the owner's message live
  await expect(ownerPage.getByText("joined the group")).toBeVisible();

  const text = `Welcome aboard, this group message is live ${Date.now()}`;
  await ownerPage.getByPlaceholder("Message group…").fill(text);
  await ownerPage.getByPlaceholder("Message group…").press("Enter");
  await expect(messageText(memberPage, text)).toBeVisible();

  await ownerCtx.close();
  await memberCtx.close();
});
