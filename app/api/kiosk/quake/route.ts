import { NextResponse } from "next/server";
import { ensureAlert } from "@/lib/alerts";
import { prisma } from "@/lib/db";
import { loadQuakeList, matchingQuake, suggestedPhase } from "@/lib/feeds/quake";
import { requireKiosk, safetyContext } from "@/lib/guards";
import { jsonError, readJson } from "@/lib/http";
import { renderSafety } from "@/lib/safety/render";
import { HttpError, assertSameOrigin } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bundle = await requireKiosk();
    const { ctx, household } = await safetyContext(bundle.household.id);
    const now = new Date();
    const drillOn =
      Boolean(household.quakeDrillUntil && household.quakeDrillUntil > now) &&
      household.lastQuakeAck !== "drill";

    let eid: string | null = null;
    let phase: "during" | "after" = "during";
    let drill = false;

    if (drillOn) {
      eid = "drill";
      phase = "during";
      drill = true;
    } else {
      try {
        const list = await loadQuakeList();
        const hit = matchingQuake(list, bundle.elder.prefectureCode, now);
        if (hit && household.lastQuakeAck !== hit.eid) {
          eid = hit.eid;
          phase = suggestedPhase(hit.at, now);
          await ensureAlert(bundle.household.id, `quake:${hit.eid}`, {
            type: "quake",
            title: "地震",
            body: `${hit.place || bundle.elder.prefectureName}で、震度4以上の地震がありました。iPadには、まず机の下、そのあと防災バッグと避難場所を伝えています。`,
          });
        }
      } catch {
        eid = null;
      }
    }

    if (!eid) return NextResponse.json({ eid: null });
    return NextResponse.json({
      eid,
      suggestedPhase: phase,
      duringSpeech: renderSafety("during", ctx, drill),
      afterSpeech: renderSafety("after", ctx, drill),
      drill,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const bundle = await requireKiosk();
    const body = await readJson(req);
    const eid = typeof body.eid === "string" ? body.eid.slice(0, 40) : "";
    if (!eid) throw new HttpError(400, "入力を確認してください。");
    await prisma.household.update({
      where: { id: bundle.household.id },
      data: {
        lastQuakeAck: eid,
        ...(eid === "drill" ? { quakeDrillUntil: null } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
