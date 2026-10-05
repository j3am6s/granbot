import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/guards";
import { jsonError } from "@/lib/http";
import { assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { householdId } = await requireFamily();
    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    await prisma.household.update({
      where: { id: householdId },
      data: {
        quakeDrillUntil: new Date(Date.now() + 3 * 60 * 1000),
        lastQuakeAck: household.lastQuakeAck === "drill" ? null : household.lastQuakeAck,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
