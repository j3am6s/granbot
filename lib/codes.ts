import { createHash, randomInt } from "crypto";

export function randomDigits(length: number) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += String(randomInt(0, 10));
  }
  return out;
}

export function hashCode(code: string) {
  const pepper = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${pepper}:${code}`).digest("hex");
}
