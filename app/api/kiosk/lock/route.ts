import { clearCookie, jsonError } from "@/lib/http";
import { requireKiosk } from "@/lib/guards";
import { KIOSK_COOKIE } from "@/lib/session";
import { assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await requireKiosk();
    return clearCookie({ ok: true }, KIOSK_COOKIE);
  } catch (err) {
    return jsonError(err);
  }
}
