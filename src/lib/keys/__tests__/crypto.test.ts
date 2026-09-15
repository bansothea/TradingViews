import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { hintOf, fromPostgresBytea, toPostgresBytea } from "../crypto";

/**
 * The module caches the secret after first use, so every test resets the
 * module registry to exercise the validation path rather than a warm cache.
 */
async function freshModule(secret?: string): Promise<typeof import("../crypto")> {
  if (secret === undefined) delete process.env.API_KEY_ENCRYPTION_SECRET;
  else process.env.API_KEY_ENCRYPTION_SECRET = secret;

  vi.resetModules();
  return import("../crypto");
}

const VALID = randomBytes(32).toString("base64");

describe("seal and open", () => {
  beforeEach(() => {
    process.env.API_KEY_ENCRYPTION_SECRET = VALID;
  });

  it("round-trips a key", async () => {
    const { seal, open } = await freshModule(VALID);
    const key = "AIzaSyExampleKeyValueThatLooksLikeGoogles";

    const sealed = seal(key);
    expect(open(sealed)).toBe(key);
  });

  it("never stores the plaintext in the ciphertext", async () => {
    const { seal } = await freshModule(VALID);
    const key = "AIzaSyExampleKeyValueThatLooksLikeGoogles";

    const sealed = seal(key);
    expect(sealed.ciphertext.toString("utf8")).not.toContain(key);
    expect(sealed.ciphertext.toString("hex")).not.toContain(
      Buffer.from(key).toString("hex")
    );
  });

  it("uses a fresh nonce every time", async () => {
    // Reusing a nonce under the same key is the one mistake that breaks GCM.
    const { seal } = await freshModule(VALID);
    const a = seal("same-key-value-repeated-here");
    const b = seal("same-key-value-repeated-here");

    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it("refuses a tampered ciphertext instead of returning garbage", async () => {
    const { seal, open } = await freshModule(VALID);
    const sealed = seal("AIzaSyExampleKeyValueThatLooksLikeGoogles");

    const tampered = Buffer.from(sealed.ciphertext);
    tampered[0] = tampered[0]! ^ 0xff;

    // Authenticated encryption: an altered row fails loudly rather than
    // decrypting to something plausible that then gets sent to Google.
    // Matched on message, not class: resetModules() mints a fresh error class
    // per module instance, so identity comparison would always fail here.
    expect(() => open({ ...sealed, ciphertext: tampered })).toThrow(
      /could not be decrypted/i
    );
  });

  it("refuses a ciphertext sealed under a different secret", async () => {
    const { seal } = await freshModule(VALID);
    const sealed = seal("AIzaSyExampleKeyValueThatLooksLikeGoogles");

    const other = await freshModule(randomBytes(32).toString("base64"));
    expect(() => other.open(sealed)).toThrow(/could not be decrypted/i);
  });
});

describe("secret validation", () => {
  it("explains how to generate one when unset", async () => {
    const mod = await freshModule(undefined);
    expect(() => mod.seal("anything")).toThrow(/openssl rand -base64 32/);
  });

  it("rejects a secret of the wrong length", async () => {
    const mod = await freshModule(randomBytes(16).toString("base64"));
    expect(() => mod.seal("anything")).toThrow(/must decode to 32 bytes/);
  });
});

describe("hintOf", () => {
  it("keeps only the last four characters", () => {
    expect(hintOf("AIzaSyAbCdEfGh1234")).toBe("1234");
  });
});

describe("bytea encoding", () => {
  it("round-trips through the postgres hex form", () => {
    const value = randomBytes(24);
    expect(fromPostgresBytea(toPostgresBytea(value)).equals(value)).toBe(true);
  });

  it("tolerates a value without the prefix", () => {
    expect(fromPostgresBytea("deadbeef").toString("hex")).toBe("deadbeef");
  });
});
