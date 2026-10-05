import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { requireFamily } from "@/lib/guards";
import { purgeOldRecords } from "@/lib/retention";
import { dateLabelTokyo, formatTokyo, tokyoParts } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { householdId } = await requireFamily();
    await purgeOldRecords().catch(() => undefined);
    const elder = await prisma.elderProfile.findUnique({ where: { householdId } });
    if (!elder) return NextResponse.json({ needsSetup: true });
    const [alerts, household] = await Promise.all([
      prisma.alert.findMany({
        where: { householdId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.household.findUnique({ where: { id: householdId } }),
    ]);
    return NextResponse.json({
      needsSetup: false,
      elderName: `${elder.displayName}${elder.honorific}`,
      city: elder.city,
      devicePaired: Boolean(household?.devicePinHash),
      todayKey: tokyoParts().dateKey,
      alerts: alerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        body: alert.body,
        read: alert.read,
        createdAt: formatTokyo(alert.createdAt),
        dateKey: tokyoParts(alert.createdAt).dateKey,
        dateLabel: dateLabelTokyo(alert.createdAt),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}
