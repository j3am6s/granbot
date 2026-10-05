import { NextResponse } from "next/server";
import { hashCode, randomDigits } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { requireFamily } from "@/lib/guards";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { HttpError, assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`pair-code:${clientIp(req)}`, 8, 60 * 60 * 1000)) {
      throw new HttpError(429, "しばらくしてから、もう一度どうぞ。");
    }
    const { householdId } = await requireFamily();
    const elder = await prisma.elderProfile.findUnique({ where: { householdId } });
    if (!elder) throw new HttpError(409, "先にプロフィールを保存してください。");
    const code = randomDigits(8);
    await prisma.household.update({
      where: { id: householdId },
      data: {
        pairingCodeHash: hashCode(code),
        pairingCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    return NextResponse.json({ code, minutes: 30 });
  } catch (err) {
    return jsonError(err);
  }
}
