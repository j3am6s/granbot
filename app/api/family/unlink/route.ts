import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { requireFamily } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { householdId } = await requireFamily();
    await prisma.household.update({
      where: { id: householdId },
      data: {
        deviceGeneration: { increment: 1 },
        devicePinHash: null,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
