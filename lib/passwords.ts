import { randomBytes } from "crypto";
import { argon2id, argon2Verify } from "hash-wasm";

const ARGON2_PARAMS = {
  parallelism: 4,
  iterations: 3,
  memorySize: 65536,
  hashLength: 32,
} as const;

export async function hashPassword(password: string) {
  return argon2id({
    password,
    salt: randomBytes(16),
    ...ARGON2_PARAMS,
    outputType: "encoded",
  });
}

export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;

export function dummyPasswordHash() {
  dummyHashPromise ??= hashPassword("not-a-real-password-for-timing");
  return dummyHashPromise;
}
