import { prisma } from "./db";
import { tokyoStartOfToday } from "./time";

const DAY = 24 * 60 * 60 * 1000;

export function retentionCutoff(now = new Date()) {
  return new Date(tokyoStartOfToday(now).getTime() - 30 * DAY);
}

export async function purgeOldRecords(now = new Date()) {
  const cutoff = retentionCutoff(now);
  await prisma.$transaction([
    prisma.alert.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.exerciseProgress.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.mealDay.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
}
