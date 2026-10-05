import { NextResponse } from "next/server";
import { ensureAlert } from "@/lib/alerts";
import { clothingAdvice } from "@/lib/feeds/advice";
import { loadWeather, weatherSpeech } from "@/lib/feeds/jma";
import { requireKiosk, safetyContext } from "@/lib/guards";
import { jsonError } from "@/lib/http";
import { renderSafety } from "@/lib/safety/render";
import { tokyoParts } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bundle = await requireKiosk();
    const { ctx } = await safetyContext(bundle.household.id);
    const { dateKey } = tokyoParts();
    let speech = `${bundle.elder.city}の天気を、今は確認できません。着替えは、家族と相談してください。`;
    try {
      const loaded = await loadWeather(bundle.elder.prefectureCode);
      let advice = clothingAdvice({
        weather: loaded.summary.weather,
        low: loaded.summary.low,
        high: loaded.summary.high,
        heat: loaded.warnings.heat,
      });
      if (loaded.warnings.rain !== "none" && !advice.includes("傘")) {
        advice = `雨なので、傘を持ってください。${advice}`;
      }
      speech = `${weatherSpeech(loaded.summary, bundle.elder.city)}${advice}`;
      if (loaded.warnings.rain === "evacuate") {
        speech += renderSafety("rain", ctx);
        await ensureAlert(bundle.household.id, `weather:${dateKey}`, {
          type: "weather_evacuate",
          title: "大雨の警報",
          body: `${bundle.elder.prefectureName}に、大雨か洪水、土砂の警報が出ています。iPadには避難場所（${bundle.elder.shelterName}）を読むようにしています。電話で確認してください。`,
        });
      }
      if (loaded.warnings.heat) {
        if (!speech.includes("水筒")) speech += renderSafety("heat", ctx);
        await ensureAlert(bundle.household.id, `heat:${dateKey}`, {
          type: "weather_heat",
          title: "暑さの注意",
          body: `${bundle.elder.city}に暑さの注意があります。水分と、涼しい部屋を電話で確認してください。`,
        });
      }
    } catch {
      speech = `${bundle.elder.city}の天気を、今は確認できません。着替えは、家族と相談してください。`;
    }
    return NextResponse.json({ speech });
  } catch (err) {
    return jsonError(err);
  }
}
