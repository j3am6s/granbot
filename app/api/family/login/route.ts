import { prisma } from "@/lib/db";
import { jsonError, readJson, withCookie } from "@/lib/http";
import { dummyPasswordHash, verifyPassword } from "@/lib/passwords";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";
import { FAMILY_COOKIE, signToken } from "@/lib/session";
import { HttpError, assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`login:${clientIp(req)}`, 8, 15 * 60 * 1000)) {
      throw new HttpError(429, "しばらくしてから、もう一度どうぞ。");
    }
    const parsed = loginSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError(400, "メールとパスワードを確認してください。");
    const email = parsed.data.email.toLowerCase();
    const member = await prisma.member.findUnique({ where: { email } });
    const hash = member?.passwordHash ?? (await dummyPasswordHash());
    const ok = await verifyPassword(hash, parsed.data.password);
    if (!member || !ok) throw new HttpError(401, "メールかパスワードが違います。");
    const token = await signToken(
      { typ: "family", householdId: member.householdId, memberId: member.id, email },
      "14d",
    );
    return withCookie({ ok: true }, [
      { name: FAMILY_COOKIE, value: token, maxAge: 60 * 60 * 24 * 14 },
    ]);
  } catch (err) {
    return jsonError(err);
  }
}
