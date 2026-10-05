import { clearCookie, jsonError } from "@/lib/http";
import { requireFamily } from "@/lib/guards";
import { FAMILY_COOKIE } from "@/lib/session";
import { assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireFamily();
    return clearCookie({ ok: true }, FAMILY_COOKIE);
  } catch (err) {
    return jsonError(err);
  }
}
