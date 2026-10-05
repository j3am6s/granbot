export const WARNING_NAMES: Record<string, string> = {
  "02": "暴風雪警報",
  "03": "大雨警報",
  "04": "洪水警報",
  "05": "暴風警報",
  "06": "大雪警報",
  "07": "波浪警報",
  "08": "高潮警報",
  "10": "大雨注意報",
  "12": "大雪注意報",
  "13": "風雪注意報",
  "14": "雷注意報",
  "15": "強風注意報",
  "16": "波浪注意報",
  "17": "融雪注意報",
  "18": "洪水注意報",
  "19": "高潮注意報",
  "20": "濃霧注意報",
  "21": "乾燥注意報",
  "22": "なだれ注意報",
  "23": "低温注意報",
  "24": "霜注意報",
  "25": "着氷注意報",
  "26": "着雪注意報",
  "32": "暴風雪特別警報",
  "33": "大雨特別警報",
  "35": "暴風特別警報",
  "36": "大雪特別警報",
  "37": "波浪特別警報",
  "38": "高潮特別警報",
};

const RAIN_EVAC = new Set(["03", "04", "33"]);
const RAIN_WATCH = new Set(["10", "18"]);

export type RainLevel = "none" | "watch" | "evacuate";

type WarningEntry = { code?: string; status?: string };

function isActive(status: string | undefined) {
  if (!status) return false;
  if (status.includes("解除")) return false;
  if (status.includes("なし")) return false;
  return true;
}

function walkCodes(payload: unknown) {
  const codes: string[] = [];
  const root = payload as {
    headlineText?: string;
    areaTypes?: { areas?: { warnings?: WarningEntry[] }[] }[];
  };
  for (const areaType of root.areaTypes ?? []) {
    for (const area of areaType.areas ?? []) {
      for (const warning of area.warnings ?? []) {
        if (!warning.code || !isActive(warning.status)) continue;
        codes.push(warning.code);
      }
    }
  }
  return { codes, headline: root.headlineText ?? "" };
}

export function assessWarnings(payload: unknown, extraText = "") {
  const { codes, headline } = walkCodes(payload);
  const text = `${headline}\n${extraText}`
    .split(/[。．\n]/)
    .filter((part) => !part.includes("解除"))
    .join("\n");
  const labels = codes.map((code) => WARNING_NAMES[code] ?? code);
  let rain: RainLevel = "none";
  if (codes.some((code) => RAIN_EVAC.has(code))) rain = "evacuate";
  if (/土砂災害警戒|大雨特別警報|大雨警報|洪水警報/.test(text)) rain = "evacuate";
  if (rain === "none" && (codes.some((code) => RAIN_WATCH.has(code)) || /大雨注意報|洪水注意報/.test(text))) {
    rain = "watch";
  }
  const heat = /高温注意報|熱中症/.test(text);
  return { rain, heat, labels, headline };
}

type ForecastArea = {
  area?: { name?: string };
  weathers?: string[];
  temps?: string[];
};

export function summarizeForecast(data: unknown) {
  const reports = Array.isArray(data) ? data : [];
  const first = reports[0] as { timeSeries?: { areas?: ForecastArea[] }[] } | undefined;
  let weather = "";
  let areaName = "";
  let low: string | null = null;
  let high: string | null = null;
  for (const series of first?.timeSeries ?? []) {
    for (const area of series.areas ?? []) {
      if (!weather && area.weathers?.[0]) {
        weather = area.weathers[0];
        areaName = area.area?.name ?? "";
      }
      if (low === null && area.temps && area.temps.length >= 2) {
        low = area.temps[0] || null;
        high = area.temps[1] || null;
      }
    }
  }
  return { weather, low, high, areaName };
}

export function weatherSpeech(
  summary: { weather: string; low: string | null; high: string | null },
  city: string,
) {
  if (!summary.weather) {
    return `${city}の天気を、今は確認できません。着替えは、家族と相談してください。`;
  }
  const short = summary.weather.replace(/\s+/g, "").slice(0, 40);
  const temp =
    summary.low && summary.high
      ? `気温は、${summary.low}度から${summary.high}度です。`
      : "";
  return `今日の${city}の天気は、${short}です。${temp}`;
}

const cache = new Map<string, { at: number; value: unknown }>();

async function fetchJson(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.value;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { "user-agent": "Granbot/0.1 (elder companion)" },
  });
  if (!response.ok) throw new Error(`jma ${response.status}`);
  const value = await response.json();
  cache.set(url, { at: Date.now(), value });
  return value;
}

export async function loadWeather(prefectureCode: string) {
  const [forecast, warning, overview] = await Promise.all([
    fetchJson(`https://www.jma.go.jp/bosai/forecast/data/forecast/${prefectureCode}.json`),
    fetchJson(`https://www.jma.go.jp/bosai/warning/data/warning/${prefectureCode}.json`).catch(() => ({})),
    fetchJson(`https://www.jma.go.jp/bosai/forecast/data/overview_forecast/${prefectureCode}.json`).catch(() => ""),
  ]);
  const extra = typeof overview === "string" ? overview : JSON.stringify(overview).slice(0, 500);
  return {
    summary: summarizeForecast(forecast),
    warnings: assessWarnings(warning, extra),
  };
}
