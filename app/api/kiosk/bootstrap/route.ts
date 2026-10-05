import { NextResponse } from "next/server";
import { buildBootstrap } from "@/lib/bootstrap";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { requireKiosk } from "@/lib/guards";
import { purgeOldRecords } from "@/lib/retention";
import { tokyoParts } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bundle = await requireKiosk();
    await purgeOldRecords().catch(() => undefined);
    const dateKey = tokyoParts().dateKey;
    const rows = await prisma.exerciseProgress.findMany({
      where: { householdId: bundle.household.id, dateKey },
    });
    const done = (kind: string) => rows.find((row) => row.kind === kind)?.completed ?? 0;
    const meals = await prisma.mealDay.findUnique({
      where: { householdId_dateKey: { householdId: bundle.household.id, dateKey } },
    });
    return NextResponse.json({
      ...buildBootstrap(bundle),
      bodyDone: done("body"),
      mindDone: done("mind"),
      meals: {
        breakfast: meals?.breakfast ?? false,
        lunch: meals?.lunch ?? false,
        dinner: meals?.dinner ?? false,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
