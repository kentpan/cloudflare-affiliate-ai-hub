// Edge-compatible libsodium sealed box implementation.
//
// GitHub Actions secrets API requires encrypting values with the repo's
// public key using libsodium's crypto_box_seal. The standard `tweetsodium`
// package wraps `libsodium-wrappers-sumo` which loads a WASM binary —
// incompatible with the Cloudflare Pages edge runtime build.
//
// This module reimplements crypto_box_seal using pure-JavaScript primitives:
//   - tweetnacl: X25519 key exchange + XSalsa20-Poly1305 encryption (nacl.box)
//   - @noble/hashes/blake2b: BLAKE2b hash for nonce derivation
//
// Both libraries are pure JS (no WASM, no Node.js APIs), so they bundle
// cleanly for the Cloudflare Workers edge runtime.
//
// Algorithm (matching libsodium's crypto_box_seal):
//   1. Generate ephemeral X25519 keypair (epk, esk)
//   2. nonce = blake2b(epk || recipient_pk, outputLength=24)
//   3. ciphertext = nacl.box(message, nonce, recipient_pk, esk)
//   4. sealed = epk (32 bytes) || ciphertext (16 + message.length bytes)

import nacl from "tweetnacl";
import { blake2b } from "@noble/hashes/blake2.js";

/**
 * Encrypt a message using libsodium's sealed box algorithm.
 *
 * @param message  The plaintext message (Uint8Array or string)
 * @param recipientPublicKey  The recipient's 32-byte X25519 public key (Uint8Array, base64-decoded)
 * @returns  The sealed box: ephemeral_pk (32) || ciphertext, as Uint8Array
 */
export function seal(message: Uint8Array | string, recipientPublicKey: Uint8Array): Uint8Array {
  const messageBytes = typeof message === "string"
    ? new TextEncoder().encode(message)
    : message;

  // 1. Generate ephemeral keypair
  const ephemeralKeyPair = nacl.box.keyPair();
  const ephemeralPublicKey = ephemeralKeyPair.publicKey;
  const ephemeralSecretKey = ephemeralKeyPair.secretKey;

  // 2. Derive nonce = blake2b(ephemeral_pk || recipient_pk, 24)
  const nonceInput = new Uint8Array(ephemeralPublicKey.length + recipientPublicKey.length);
  nonceInput.set(ephemeralPublicKey, 0);
  nonceInput.set(recipientPublicKey, ephemeralPublicKey.length);
  const nonce = blake2b(nonceInput, { dkLen: 24 });

  // 3. Encrypt: nacl.box(message, nonce, recipient_pk, ephemeral_sk)
  const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, ephemeralSecretKey);

  // 4. Sealed = ephemeral_pk || ciphertext
  const sealed = new Uint8Array(ephemeralPublicKey.length + ciphertext.length);
  sealed.set(ephemeralPublicKey, 0);
  sealed.set(ciphertext, ephemeralPublicKey.length);

  return sealed;
}

/**
 * Convenience: encrypt and return as base64 string (for GitHub API).
 */
export function sealToBase64(message: string, recipientPublicKeyBase64: string): string {
  const recipientPublicKey = base64ToUint8Array(recipientPublicKeyBase64);
  const sealed = seal(message, recipientPublicKey);
  return uint8ArrayToBase64(sealed);
}

// ─── Base64 helpers (edge-compatible, no Buffer) ──────────────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
