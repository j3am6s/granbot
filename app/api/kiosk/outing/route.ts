import { NextResponse } from "next/server";
import { ensureAlert } from "@/lib/alerts";
import { requireKiosk } from "@/lib/guards";
import { jsonError, readJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const bundle = await requireKiosk();
    const body = await readJson(req);
    const back = body.back === true;
    const name = bundle.elder.displayName;
    if (back) {
      await ensureAlert(bundle.household.id, null, {
        type: "return",
        title: "戻りました",
        body: `${name}さんが戻りました。`,
      });
      return NextResponse.json({ speech: "おかえりなさい。" });
    }
    await ensureAlert(bundle.household.id, null, {
      type: "outing",
      title: "お出かけ",
      body: `${name}さんが出かけました。電話を持つように、iPadから伝えています。`,
    });
    return NextResponse.json({
      speech: "いってらっしゃい。楽しんできてください。出かける前に、電話を持って、電池が十分か確かめてください。",
    });
  } catch (err) {
    return jsonError(err);
  }
}
