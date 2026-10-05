"use client";

import { useEffect, useState } from "react";
import { FamilyShell } from "./FamilyShell";

export function EvidencePanel() {
  const [scripts, setScripts] = useState<{ during?: string; after?: string; rain?: string; heat?: string }>({});

  useEffect(() => {
    void fetch("/api/family/scripts").then(async (response) => {
      if (response.ok) setScripts(await response.json());
    });
  }, []);

  return (
    <FamilyShell>
      <article className="grid gap-4 text-sm leading-relaxed">
        <p>これは診断や治療をする機器ではありません。家族に見せる数字は、自分で答えた記録です。</p>
        <h2 className="text-lg font-semibold">話し方</h2>
        <p>です・ますの短い文です。同じ言葉を画面に大きく出し、ゆっくり読みます。</p>
        <h2 className="text-lg font-semibold">体の運動</h2>
        <p>75歳未満で転びにくければ立つ運動、そうでなければいすの運動です。バランス、足の力、立ち座りの動きを短くします。痛み、めまい、胸の痛みでやめます。個人の転倒を防ぐとは言いません。</p>
        <p>根拠: WHO 2020の高齢者の多要素運動、厚生労働省の身体活動ガイド2023（ラジオ体操を含む）、地域在住高齢者の転倒に関するCochraneレビュー。</p>
        <h2 className="text-lg font-semibold">頭の練習</h2>
        <p>日付、三語、思い出、簡単な記憶です。脳トレアプリが認知症を防ぐとは言いません。</p>
        <h2 className="text-lg font-semibold">地震と大雨</h2>
        <p>気象庁の地震情報で、住んでいる県の震度が4以上のとき、iPadが赤くなり、まず机の下に入るよう伝えます。ゆれのあと、家族が登録した防災バッグの場所と、指定緊急避難場所を読みます。緊急地震速報より早く知らせることはしません。大雨・洪水・土砂の警報は、天気の中で避難場所を読みます。</p>
        <h2 className="text-lg font-semibold">この家の台本</h2>
        <p className="rounded-2xl bg-white p-3">{scripts.during}</p>
        <p className="rounded-2xl bg-white p-3">{scripts.after}</p>
        <p className="rounded-2xl bg-white p-3">{scripts.rain}</p>
        <p className="rounded-2xl bg-white p-3">{scripts.heat}</p>
      </article>
    </FamilyShell>
  );
}
