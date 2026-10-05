import { hashCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { jsonError, readJson, withCookie } from "@/lib/http";
import { hashPassword } from "@/lib/passwords";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { pairSchema } from "@/lib/schemas";
import { DEVICE_COOKIE, KIOSK_COOKIE, signToken } from "@/lib/session";
import { HttpError, assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`pair:${clientIp(req)}`, 8, 15 * 60 * 1000)) {
      throw new HttpError(429, "しばらくしてから、もう一度どうぞ。");
    }
    const parsed = pairSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError(400, "コードと、4けたの番号を確認してください。");
    const household = await prisma.household.findFirst({
      where: { pairingCodeHash: hashCode(parsed.data.code) },
    });
    if (!household?.pairingCodeExpiresAt || household.pairingCodeExpiresAt < new Date()) {
      throw new HttpError(400, "コードが違います。家族の画面で、新しいコードを出してください。");
    }
    const generation = household.deviceGeneration + 1;
    await prisma.household.update({
      where: { id: household.id },
      data: {
        devicePinHash: await hashPassword(parsed.data.pin),
        deviceGeneration: generation,
        pairingCodeHash: null,
        pairingCodeExpiresAt: null,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
    });
    const device = await signToken(
      { typ: "device", householdId: household.id, generation },
      "400d",
    );
    const kiosk = await signToken(
      { typ: "kiosk", householdId: household.id, generation },
      "12h",
    );
    return withCookie({ ok: true }, [
      { name: DEVICE_COOKIE, value: device, maxAge: 60 * 60 * 24 * 400 },
      { name: KIOSK_COOKIE, value: kiosk, maxAge: 60 * 60 * 12 },
    ]);
  } catch (err) {
    return jsonError(err);
  }
}
