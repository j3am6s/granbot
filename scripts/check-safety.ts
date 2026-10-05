import assert from "node:assert/strict";
import { selectMentalSession, selectRoutine } from "../lib/content";
import { clothingAdvice } from "../lib/feeds/advice";
import { assessWarnings, summarizeForecast, weatherSpeech } from "../lib/feeds/jma";
import { matchingQuake, suggestedPhase } from "../lib/feeds/quake";
import { retentionCutoff } from "../lib/retention";
import { renderSafety } from "../lib/safety/render";

const ctx = {
  shelterName: "区立第一小学校",
  shelterAddress: "東京都テスト区1-2-3",
  kitLocation: "玄関の下駄箱",
  contactName: "花子",
  displayName: "太郎",
  honorific: "さん",
};

const during = renderSafety("during", ctx);
assert.match(during, /頭を守って/);
assert.match(during, /机の下/);
assert.match(during, /外に出ない/);
assert.match(during, /火は/);
assert.equal(during.includes(ctx.shelterName), false);
assert.equal(during.includes(ctx.kitLocation), false);

const after = renderSafety("after", ctx);
assert.match(after, /玄関の下駄箱/);
assert.match(after, /区立第一小学校/);
assert.match(after, /東京都テスト区1-2-3/);

const missingKit = renderSafety("after", { ...ctx, kitLocation: "  " });
assert.match(missingKit, /まだ登録されていない場所/);

const rain = renderSafety("rain", ctx);
assert.match(rain, /指定緊急避難場所/);
assert.match(rain, /区立第一小学校/);

const drill = renderSafety("during", ctx, true);
assert.match(drill, /^これは練習です。/);
assert.match(drill, /机の下/);

const warning = assessWarnings({
  headlineText: "",
  areaTypes: [
    {
      areas: [
        {
          warnings: [
            { code: "03", status: "継続" },
            { code: "14", status: "継続" },
            { code: "10", status: "解除" },
          ],
        },
      ],
    },
  ],
});
assert.equal(warning.rain, "evacuate");

const cleared = assessWarnings({
  headlineText: "大雨警報は解除しました",
  areaTypes: [{ areas: [{ warnings: [{ code: "03", status: "解除" }] }] }],
});
assert.equal(cleared.rain, "none");

const watch = assessWarnings({
  headlineText: "",
  areaTypes: [{ areas: [{ warnings: [{ code: "10", status: "発表" }] }] }],
});
assert.equal(watch.rain, "watch");

const landslide = assessWarnings({
  headlineText: "土砂災害警戒情報",
  areaTypes: [],
});
assert.equal(landslide.rain, "evacuate");

const heat = assessWarnings({ headlineText: "高温注意報", areaTypes: [] });
assert.equal(heat.heat, true);

const summary = summarizeForecast([
  {
    timeSeries: [
      { areas: [{ area: { name: "東京地方" }, weathers: ["晴れ"] }] },
      { areas: [{ temps: ["16", "23"] }] },
    ],
  },
]);
assert.match(weatherSpeech(summary, "新宿"), /晴れ/);
assert.match(weatherSpeech(summary, "新宿"), /16度から23度/);

const cold = clothingAdvice({ weather: "晴れ", low: "4", high: "12", heat: false });
assert.match(cold, /セーター/);
const wet = clothingAdvice({ weather: "雨", low: "18", high: "22", heat: false });
assert.match(wet, /傘/);
const hot = clothingAdvice({ weather: "晴れ", low: "26", high: "33", heat: true });
assert.match(hot, /水筒/);
assert.match(hot, /扇風機/);

const now = new Date("2026-10-04T12:00:00+09:00");
const felt = matchingQuake(
  [{ eid: "a", at: "2026-10-04T11:59:00+09:00", int: [{ code: "13", maxi: "4" }] }],
  "130000",
  now,
);
assert.equal(felt?.eid, "a");
assert.equal(suggestedPhase(felt!.at, now), "during");

const later = matchingQuake(
  [{ eid: "b", at: "2026-10-04T11:50:00+09:00", int: [{ code: "13", maxi: "5弱" }] }],
  "130000",
  now,
);
assert.equal(suggestedPhase(later!.at, now), "after");

const weak = matchingQuake(
  [{ eid: "c", at: "2026-10-04T11:59:00+09:00", int: [{ code: "13", maxi: "1" }] }],
  "130000",
  now,
);
assert.equal(weak, null);

assert.equal(selectRoutine(70, false).id, "standing");
assert.equal(selectRoutine(80, false).id, "chair");
assert.equal(selectRoutine(68, true).id, "chair");
assert.equal(selectRoutine(70, false, now).steps.length, 5);
assert.equal(selectMentalSession(now).length, 5);
const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
assert.notEqual(selectRoutine(70, false, now).steps[0].speech, selectRoutine(70, false, nextDay).steps[0].speech);

const cutoff = retentionCutoff(new Date("2026-10-04T15:00:00+09:00"));
assert.equal(cutoff.toISOString(), new Date("2026-09-04T00:00:00+09:00").toISOString());

console.log("safety checks passed");
