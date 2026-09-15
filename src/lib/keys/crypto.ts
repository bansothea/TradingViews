import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption for user-supplied API keys.
 *
 * AES-256-GCM rather than CBC or a plain hash: GCM is authenticated, so a
 * ciphertext altered in the database fails to decrypt instead of yielding
 * plausible garbage that then gets sent to Google as somebody's credential.
 *
 * The secret lives only in the server environment, never in Postgres. That
 * separation is the point -- a database dump on its own decrypts to nothing.
 */

const ALGORITHM = "aes-256-gcm";
/** AES-256 takes a 32-byte key; GCM's standard nonce is 12 bytes. */
const KEY_BYTES = 32;
const IV_BYTES = 12;

let cached: Buffer | null = null;

/**
 * Reads and validates the encryption secret.
 *
 * Resolved lazily rather than at module load so that a deployment missing the
 * variable fails when someone saves a key -- with a message saying exactly
 * what to do -- instead of refusing to boot the whole application.
 */
function secret(): Buffer {
  if (cached) return cached;

  const raw = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!raw) {
    throw new KeyCryptoError(
      "API_KEY_ENCRYPTION_SECRET is not set. Generate one with: " +
        "openssl rand -base64 32"
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new KeyCryptoError(
      `API_KEY_ENCRYPTION_SECRET must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        "Generate one with: openssl rand -base64 32"
    );
  }

  cached = key;
  return key;
}

export class KeyCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeyCryptoError";
  }
}

export interface SealedKey {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Encrypts a key for storage.
 *
 * A fresh random IV per call is not optional with GCM: reusing a nonce under
 * the same key is the one mistake that breaks the mode outright.
 */
export function seal(plaintext: string): SealedKey {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, secret(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

/** Decrypts a stored key. Throws if the ciphertext or tag has been tampered with. */
export function open(sealed: SealedKey): string {
  const decipher = createDecipheriv(ALGORITHM, secret(), sealed.iv);
  decipher.setAuthTag(sealed.authTag);

  try {
    return Buffer.concat([
      decipher.update(sealed.ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Either the secret rotated without re-encrypting, or the row was altered.
    // Both mean the stored value is unusable; neither should leak detail.
    throw new KeyCryptoError("Stored credential could not be decrypted");
  }
}

/**
 * The tail of a key, for display.
 *
 * Four characters is enough for someone to tell two of their own keys apart
 * and far too few to be useful to anyone else.
 */
export function hintOf(plaintext: string): string {
  return plaintext.slice(-4);
}

/** Postgres returns bytea as a `\x`-prefixed hex string over PostgREST. */
export function fromPostgresBytea(value: string): Buffer {
  return Buffer.from(value.startsWith("\\x") ? value.slice(2) : value, "hex");
}

/** Encodes a buffer in the `\x`-prefixed hex form bytea columns accept. */
export function toPostgresBytea(value: Buffer): string {
  return `\\x${value.toString("hex")}`;
}
