import { NextResponse } from "next/server";
import { decryptString } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { requireFamily } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { householdId } = await requireFamily();
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        elder: true,
        contacts: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!household?.elder) return NextResponse.json({ needsSetup: true });
    const elder = household.elder;
    return NextResponse.json({
      needsSetup: false,
      displayName: elder.displayName,
      age: elder.age,
      prefectureCode: elder.prefectureCode,
      city: elder.city,
      fallRisk: elder.fallRisk,
      shelterName: elder.shelterName,
      shelterAddress: decryptString(elder.shelterAddressEnc),
      kitLocation: decryptString(elder.kitLocationEnc),
      devicePaired: Boolean(household.devicePinHash),
      contacts: household.contacts.map((contact) => ({
        name: contact.name,
        phone: contact.phone,
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}
