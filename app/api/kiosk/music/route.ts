import { NextResponse } from "next/server";
import tracks from "@/content/city-pop.json";
import { jsonError } from "@/lib/http";
import { requireKiosk } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireKiosk();
    return NextResponse.json({ tracks });
  } catch (err) {
    return jsonError(err);
  }
}
