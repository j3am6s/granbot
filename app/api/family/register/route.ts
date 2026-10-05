import { prisma } from "@/lib/db";
import { jsonError, readJson, withCookie } from "@/lib/http";
import { hashPassword } from "@/lib/passwords";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { registerErrorMessage, registerSchema } from "@/lib/schemas";
import { FAMILY_COOKIE, signToken } from "@/lib/session";
import { HttpError, assertSameOrigin, cleanPlace } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`register:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
      throw new HttpError(429, "しばらくしてから、もう一度どうぞ。");
    }
    const parsed = registerSchema.safeParse(await readJson(req));
    if (!parsed.success) {
      throw new HttpError(400, registerErrorMessage(parsed.error));
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) throw new HttpError(400, "そのメールは登録済みです。");
    const name = cleanPlace(parsed.data.name);
    if (!name) throw new HttpError(400, "名前を確認してください。");
    const household = await prisma.household.create({ data: {} });
    const member = await prisma.member.create({
      data: {
        householdId: household.id,
        name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    const token = await signToken(
      { typ: "family", householdId: household.id, memberId: member.id, email },
      "14d",
    );
    return withCookie({ ok: true }, [
      { name: FAMILY_COOKIE, value: token, maxAge: 60 * 60 * 24 * 14 },
    ]);
  } catch (err) {
    return jsonError(err);
  }
}
