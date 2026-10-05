import { NextResponse } from "next/server";
import { ensureAlert } from "@/lib/alerts";
import { prisma } from "@/lib/db";
import { requireKiosk } from "@/lib/guards";
import { jsonError, readJson } from "@/lib/http";
import { HttpError, assertSameOrigin } from "@/lib/text";
import { tokyoParts } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const bundle = await requireKiosk();
    const body = await readJson(req);
    const kind = body.kind === "body" || body.kind === "mind" ? body.kind : "";
    const completed = Number(body.completed);
    if (!kind || !Number.isInteger(completed) || completed < 0 || completed > 5) {
      throw new HttpError(400, "入力を確認してください。");
    }
    const dateKey = tokyoParts().dateKey;
    await prisma.exerciseProgress.upsert({
      where: {
        householdId_kind_dateKey: {
          householdId: bundle.household.id,
          kind,
          dateKey,
        },
      },
      create: { householdId: bundle.household.id, kind, dateKey, completed },
      update: { completed },
    });
    if (completed >= 5) {
      const label = kind === "body" ? "体の運動" : "頭の運動";
      await ensureAlert(bundle.household.id, `exercise:${kind}:${dateKey}`, {
        type: "exercise",
        title: label,
        body: `${bundle.elder.displayName}さんが、今日の${label}を終わりました。`,
      });
    }
    return NextResponse.json({ ok: true, completed });
  } catch (err) {
    return jsonError(err);
  }
}
