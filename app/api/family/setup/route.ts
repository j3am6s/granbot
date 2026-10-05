import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { requireFamily } from "@/lib/guards";
import { saveProfile } from "@/lib/profile";
import { parseSetup } from "@/lib/schemas";
import { assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { householdId } = await requireFamily();
    const existing = await prisma.elderProfile.findUnique({ where: { householdId } });
    const input = parseSetup(await readJson(req));
    const pairingCode = await saveProfile(householdId, input, !existing);
    return NextResponse.json({ ok: true, pairingCode });
  } catch (err) {
    return jsonError(err);
  }
}
