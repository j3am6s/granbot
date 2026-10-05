import { NextResponse } from "next/server";
import { requireFamily, safetyContext } from "@/lib/guards";
import { jsonError } from "@/lib/http";
import { renderSafety } from "@/lib/safety/render";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { householdId } = await requireFamily();
    const { ctx } = await safetyContext(householdId);
    return NextResponse.json({
      during: renderSafety("during", ctx),
      after: renderSafety("after", ctx),
      rain: renderSafety("rain", ctx),
      heat: renderSafety("heat", ctx),
    });
  } catch (err) {
    return jsonError(err);
  }
}
