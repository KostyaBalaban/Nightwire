import { vi, describe, test, expect } from "vitest";

vi.mock("../store/session.store.js", () => ({
  useSessionStore: {
    getState: () => ({ user: { _id: "test-user-id" } }),
  },
}));

import { generateKeyPair, encryptMessage, decryptMessage } from "../lib/crypto.js";

describe("generateKeyPair", () => {
  test("shouldGenerateKeyPair — returns JSON strings for publicKey and privateKey", async () => {
    const { publicKey, privateKey } = await generateKeyPair();

    expect(typeof publicKey).toBe("string");
    expect(typeof privateKey).toBe("string");

    const pub  = JSON.parse(publicKey);
    const priv = JSON.parse(privateKey);

    expect(pub.kty).toBe("RSA");
    expect(pub.key_ops).toContain("encrypt");
    expect(priv.kty).toBe("RSA");
    expect(priv.key_ops).toContain("decrypt");
  });
});

describe("encrypt / decrypt", () => {
  let publicKey;
  let privateKey;

  test("setup — generate key pair", async () => {
    const pair = await generateKeyPair();
    publicKey  = pair.publicKey;
    privateKey = pair.privateKey;
    expect(publicKey).toBeTruthy();
    expect(privateKey).toBeTruthy();
  });

  test("shouldEncryptMessage — encrypted text differs from plaintext", async () => {
    const pair = await generateKeyPair();
    const encrypted = await encryptMessage("hello world", pair.publicKey);

    expect(encrypted).not.toBe("hello world");
    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);
  });

  test("shouldDecryptMessage — round-trip recovers the original plaintext", async () => {
    const pair      = await generateKeyPair();
    const plaintext = "secret message 🔒";
    const encrypted = await encryptMessage(plaintext, pair.publicKey);
    const decrypted = await decryptMessage(encrypted, pair.privateKey);

    expect(decrypted).toBe(plaintext);
  });

  test("shouldDecryptMessage — returns error string when private key is missing", async () => {
    const pair      = await generateKeyPair();
    const encrypted = await encryptMessage("test", pair.publicKey);
    const result    = await decryptMessage(encrypted, null);

    expect(result).toBe("[No private key — cannot decrypt]");
  });

  test("shouldDecryptMessage — returns error string when private key is wrong", async () => {
    const pair1     = await generateKeyPair();
    const pair2     = await generateKeyPair();
    const encrypted = await encryptMessage("test", pair1.publicKey);
    const result    = await decryptMessage(encrypted, pair2.privateKey);

    expect(result).toBe("[Could not decrypt message]");
  });
});
