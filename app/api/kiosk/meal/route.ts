import { NextResponse } from "next/server";
import { ensureAlert } from "@/lib/alerts";
import { prisma } from "@/lib/db";
import { requireKiosk } from "@/lib/guards";
import { jsonError, readJson } from "@/lib/http";
import { HttpError, assertSameOrigin, cleanUtterance } from "@/lib/text";
import { tokyoParts } from "@/lib/time";

export const dynamic = "force-dynamic";

function isMeal(value: unknown): value is keyof typeof MEALS {
  return value === "breakfast" || value === "lunch" || value === "dinner";
}

const MEALS = {
  breakfast: { title: "朝ごはん", speech: "朝ごはんを食べたんですね。家族に伝えます。" },
  lunch: { title: "昼ごはん", speech: "昼ごはんを食べたんですね。家族に伝えます。" },
  dinner: { title: "夜ご飯", speech: "夜ご飯を食べたんですね。家族に伝えます。" },
} as const;

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const bundle = await requireKiosk();
    const body = await readJson(req);
    const dateKey = tokyoParts().dateKey;
    const name = bundle.elder.displayName;

    if (typeof body.request === "string") {
      const request = cleanUtterance(body.request);
      if (!request) throw new HttpError(400, "お願いを書いてください。");
      await ensureAlert(bundle.household.id, null, {
        type: "meal_request",
        title: "お願い",
        body: `${name}さんからのお願いです。${request}`,
      });
      return NextResponse.json({ speech: "家族に伝えました。" });
    }

    const meal = body.meal;
    if (!isMeal(meal)) throw new HttpError(400, "入力を確認してください。");
    const current = await prisma.mealDay.findUnique({
      where: { householdId_dateKey: { householdId: bundle.household.id, dateKey } },
    });
    if (current?.[meal]) {
      return NextResponse.json({
        speech: "もう食べたと、伝えてあります。",
        meals: {
          breakfast: current.breakfast,
          lunch: current.lunch,
          dinner: current.dinner,
        },
      });
    }
    const saved = await prisma.mealDay.upsert({
      where: { householdId_dateKey: { householdId: bundle.household.id, dateKey } },
      create: { householdId: bundle.household.id, dateKey, [meal]: true },
      update: { [meal]: true },
    });
    const label = MEALS[meal];
    await ensureAlert(bundle.household.id, `meal:${meal}:${dateKey}`, {
      type: "meal",
      title: label.title,
      body: `${name}さんが${label.title}を食べました。`,
    });
    return NextResponse.json({
      speech: label.speech,
      meals: { breakfast: saved.breakfast, lunch: saved.lunch, dinner: saved.dinner },
    });
  } catch (err) {
    return jsonError(err);
  }
}
