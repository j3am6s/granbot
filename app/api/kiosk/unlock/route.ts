import { prisma } from "@/lib/db";
import { jsonError, readJson, withCookie } from "@/lib/http";
import { readDeviceToken } from "@/lib/guards";
import { verifyPassword } from "@/lib/passwords";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { pinSchema } from "@/lib/schemas";
import { KIOSK_COOKIE, signToken } from "@/lib/session";
import { HttpError, assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`unlock:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
      throw new HttpError(429, "しばらくしてから、もう一度どうぞ。");
    }
    const device = await readDeviceToken();
    if (!device) throw new HttpError(403, "forbidden");
    const parsed = pinSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError(400, "4けたの番号を入れてください。");
    const household = await prisma.household.findUnique({ where: { id: device.householdId } });
    if (!household || household.deviceGeneration !== device.generation || !household.devicePinHash) {
      throw new HttpError(403, "forbidden");
    }
    if (household.pinLockedUntil && household.pinLockedUntil > new Date()) {
      throw new HttpError(429, "番号を何回か間違えたので、10分後にもう一度どうぞ。");
    }
    const ok = await verifyPassword(household.devicePinHash, parsed.data.pin);
    if (!ok) {
      const attempts = household.pinFailedAttempts + 1;
      await prisma.household.update({
        where: { id: household.id },
        data:
          attempts >= 5
            ? { pinFailedAttempts: 0, pinLockedUntil: new Date(Date.now() + 10 * 60 * 1000) }
            : { pinFailedAttempts: attempts },
      });
      throw new HttpError(401, "番号が違います。");
    }
    await prisma.household.update({
      where: { id: household.id },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
    });
    const kiosk = await signToken(
      { typ: "kiosk", householdId: household.id, generation: household.deviceGeneration },
      "12h",
    );
    return withCookie({ ok: true }, [{ name: KIOSK_COOKIE, value: kiosk, maxAge: 60 * 60 * 12 }]);
  } catch (err) {
    return jsonError(err);
  }
}
