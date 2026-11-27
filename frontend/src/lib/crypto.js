const RSA_ALG = "RSA-OAEP";
const RSA_HASH = "SHA-256";
const AES_ALG = "AES-GCM";
const KEY_SIZE = 256;
import { useSessionStore } from "../store/session.store.js";

function pkKey() {
  const uid = useSessionStore.getState().user?._id;
  return uid ? `nw_pk_${uid}` : "nw_pk_anon";
}

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: RSA_ALG,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: RSA_HASH,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

export function savePrivateKey(jwkString) {
  localStorage.setItem(pkKey(), jwkString);
}

export function loadPrivateKey() {
  return localStorage.getItem(pkKey());
}

// ── Sent-message plaintext cache ──────────────────────────────────────────────
// Stores plaintext of own encrypted messages so they survive page reload.

function sentCacheKey() {
  const uid = useSessionStore.getState().user?._id;
  return uid ? `nw_sent_${uid}` : null;
}

export function cacheSentPlaintext(messageId, plaintext) {
  try {
    const k = sentCacheKey();
    if (!k) return;
    const cache = JSON.parse(localStorage.getItem(k) || "{}");
    cache[String(messageId)] = plaintext;
    const entries = Object.entries(cache);
    // keep last 1000 entries to avoid bloat
    const trimmed = entries.length > 1000 ? Object.fromEntries(entries.slice(-1000)) : cache;
    localStorage.setItem(k, JSON.stringify(trimmed));
  } catch {
    /* silent */
  }
}

export function loadSentPlaintext(messageId) {
  try {
    const k = sentCacheKey();
    if (!k) return null;
    const cache = JSON.parse(localStorage.getItem(k) || "{}");
    return cache[String(messageId)] ?? null;
  } catch {
    return null;
  }
}

async function importPublicKey(jwkString) {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkString),
    { name: RSA_ALG, hash: RSA_HASH },
    true,
    ["encrypt"],
  );
}

async function importPrivateKey(jwkString) {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkString),
    { name: RSA_ALG, hash: RSA_HASH },
    true,
    ["decrypt"],
  );
}

// Hybrid encryption: AES-GCM for data, RSA-OAEP for AES key
export async function encryptMessage(plaintext, recipientPublicKeyJwk) {
  if (!recipientPublicKeyJwk) throw new Error("No public key");

  // 1. Generate ephemeral AES key
  const aesKey = await crypto.subtle.generateKey({ name: AES_ALG, length: KEY_SIZE }, true, [
    "encrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 2. Encrypt plaintext
  const encoded = new TextEncoder().encode(plaintext);
  const encData = await crypto.subtle.encrypt({ name: AES_ALG, iv }, aesKey, encoded);

  // 3. Encrypt AES key with RSA
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);
  const pubKey = await importPublicKey(recipientPublicKeyJwk);
  const encAesKey = await crypto.subtle.encrypt({ name: RSA_ALG }, pubKey, rawAes);

  // 4. Pack: [4 bytes keyLen][encAesKey][12 bytes iv][encData]
  const combined = new Uint8Array(4 + encAesKey.byteLength + 12 + encData.byteLength);
  new DataView(combined.buffer).setUint32(0, encAesKey.byteLength, false);
  combined.set(new Uint8Array(encAesKey), 4);
  combined.set(iv, 4 + encAesKey.byteLength);
  combined.set(new Uint8Array(encData), 4 + encAesKey.byteLength + 12);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptMessage(encryptedBase64, privateKeyJwk) {
  if (!privateKeyJwk) return "[No private key — cannot decrypt]";
  try {
    const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const view = new DataView(combined.buffer);

    const keyLen = view.getUint32(0, false);
    const encAesKey = combined.slice(4, 4 + keyLen);
    const iv = combined.slice(4 + keyLen, 4 + keyLen + 12);
    const encData = combined.slice(4 + keyLen + 12);

    const privKey = await importPrivateKey(privateKeyJwk);
    const rawAes = await crypto.subtle.decrypt({ name: RSA_ALG }, privKey, encAesKey);

    const aesKey = await crypto.subtle.importKey("raw", rawAes, { name: AES_ALG }, false, [
      "decrypt",
    ]);
    const decrypted = await crypto.subtle.decrypt({ name: AES_ALG, iv }, aesKey, encData);

    return new TextDecoder().decode(decrypted);
  } catch {
    return "[Could not decrypt message]";
  }
}
