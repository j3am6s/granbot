import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { readDeviceToken } from "@/lib/guards";
import { KIOSK_COOKIE, verifyToken, type KioskToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const device = await readDeviceToken();
    const jar = await cookies();
    const kiosk = await verifyToken<KioskToken>(jar.get(KIOSK_COOKIE)?.value, "kiosk");
    let paired = false;
    let unlocked = false;
    if (device) {
      const household = await prisma.household.findUnique({ where: { id: device.householdId } });
      paired = Boolean(
        household && household.deviceGeneration === device.generation && household.devicePinHash,
      );
    }
    if (kiosk) {
      const household = await prisma.household.findUnique({ where: { id: kiosk.householdId } });
      unlocked = Boolean(household && household.deviceGeneration === kiosk.generation);
    }
    return NextResponse.json({ paired, unlocked });
  } catch (err) {
    return jsonError(err);
  }
}
