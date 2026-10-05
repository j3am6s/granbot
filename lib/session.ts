import { SignJWT, jwtVerify } from "jose";

export const FAMILY_COOKIE = "granbot_family";
export const DEVICE_COOKIE = "granbot_device";
export const KIOSK_COOKIE = "granbot_kiosk";

export type FamilyToken = {
  typ: "family";
  householdId: string;
  memberId: string;
  email: string;
};

export type DeviceToken = {
  typ: "device";
  householdId: string;
  generation: number;
};

export type KioskToken = {
  typ: "kiosk";
  householdId: string;
  generation: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET missing");
  }
  return new TextEncoder().encode(value);
}

export async function signToken(
  payload: FamilyToken | DeviceToken | KioskToken,
  expiresIn: string,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken<T extends { typ: string }>(
  token: string | undefined,
  typ: T["typ"],
): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== typ) return null;
    if (typeof payload.householdId !== "string") return null;
    return payload as T;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
