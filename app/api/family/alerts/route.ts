import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { requireFamily } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { householdId } = await requireFamily();
    await readJson(req);
    await prisma.alert.updateMany({
      where: { householdId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
