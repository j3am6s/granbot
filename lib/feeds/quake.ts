export type QuakeReport = {
  eid?: string;
  at?: string;
  anm?: string;
  maxi?: string;
  int?: { code?: string; maxi?: string }[];
};

const RANKS: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5-": 5,
  "5弱": 5,
  "5+": 5.5,
  "5強": 5.5,
  "6-": 6,
  "6弱": 6,
  "6+": 6.5,
  "6強": 6.5,
  "7": 7,
};

export function intensityRank(value: string | undefined) {
  return RANKS[value ?? ""] ?? 0;
}

export function prefectureQuakeCode(forecastCode: string) {
  return forecastCode.slice(0, 2);
}

export function matchingQuake(list: QuakeReport[], prefectureCode: string, now = new Date()) {
  const area = prefectureQuakeCode(prefectureCode);
  let best: { eid: string; at: Date; place: string; rank: number } | null = null;
  for (const report of list) {
    if (!report.eid || !report.at) continue;
    const at = new Date(report.at);
    if (Number.isNaN(at.getTime())) continue;
    const age = now.getTime() - at.getTime();
    if (age < -2 * 60 * 1000 || age > 20 * 60 * 1000) continue;
    const hit = (report.int ?? []).find((item) => item.code === area);
    if (!hit) continue;
    const rank = intensityRank(hit.maxi || report.maxi);
    if (rank < 4) continue;
    if (!best || at > best.at) {
      best = { eid: report.eid, at, place: report.anm ?? "", rank };
    }
  }
  return best;
}

export function suggestedPhase(at: Date, now = new Date()) {
  return now.getTime() - at.getTime() < 3 * 60 * 1000 ? "during" : "after";
}

let cache: { at: number; list: QuakeReport[] } | null = null;

export async function loadQuakeList() {
  if (cache && Date.now() - cache.at < 15_000) return cache.list;
  const response = await fetch("https://www.jma.go.jp/bosai/quake/data/list.json", {
    signal: AbortSignal.timeout(8000),
    headers: { "user-agent": "Granbot/0.1 (elder companion)" },
  });
  if (!response.ok) throw new Error("quake list failed");
  const list = (await response.json()) as QuakeReport[];
  cache = { at: Date.now(), list };
  return list;
}
