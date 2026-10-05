import { cookies } from "next/headers";
import { decryptString } from "./crypto";
import { prisma } from "./db";
import {
  DEVICE_COOKIE,
  FAMILY_COOKIE,
  KIOSK_COOKIE,
  verifyToken,
  type DeviceToken,
  type FamilyToken,
  type KioskToken,
} from "./session";
import { HttpError } from "./text";

export async function requireFamily() {
  const jar = await cookies();
  const token = await verifyToken<FamilyToken>(jar.get(FAMILY_COOKIE)?.value, "family");
  if (!token) throw new HttpError(403, "forbidden");
  const member = await prisma.member.findUnique({ where: { id: token.memberId } });
  if (!member || member.householdId !== token.householdId) {
    throw new HttpError(403, "forbidden");
  }
  return { member, householdId: member.householdId };
}

export async function readDeviceToken() {
  const jar = await cookies();
  return verifyToken<DeviceToken>(jar.get(DEVICE_COOKIE)?.value, "device");
}

export async function requireKiosk() {
  const jar = await cookies();
  const token = await verifyToken<KioskToken>(jar.get(KIOSK_COOKIE)?.value, "kiosk");
  if (!token) throw new HttpError(403, "forbidden");
  const household = await prisma.household.findUnique({
    where: { id: token.householdId },
    include: {
      elder: true,
      contacts: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!household || household.deviceGeneration !== token.generation) {
    throw new HttpError(403, "forbidden");
  }
  if (!household.elder) throw new HttpError(409, "setup");
  return { household, elder: household.elder, token };
}

export async function safetyContext(householdId: string) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      elder: true,
      contacts: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!household?.elder) throw new HttpError(409, "setup");
  return {
    household,
    elder: household.elder,
    ctx: {
      shelterName: household.elder.shelterName,
      shelterAddress: decryptString(household.elder.shelterAddressEnc),
      kitLocation: decryptString(household.elder.kitLocationEnc),
      contactName: household.contacts[0]?.name ?? "家族",
      displayName: household.elder.displayName,
      honorific: household.elder.honorific,
    },
  };
}
