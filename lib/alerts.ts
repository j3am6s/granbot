import { prisma } from "./db";

export async function ensureAlert(
  householdId: string,
  dedupeKey: string | null,
  data: { type: string; title: string; body: string },
) {
  if (dedupeKey) {
    const existing = await prisma.alert.findFirst({
      where: { householdId, dedupeKey },
    });
    if (existing) return existing;
  }
  return prisma.alert.create({
    data: { householdId, dedupeKey, ...data },
  });
}
