"use client";

import { useEffect, useState } from "react";
import { prefectures } from "@/content/prefectures";
import { FamilyShell } from "./FamilyShell";

type Settings = {
  needsSetup?: boolean;
  displayName: string;
  age: number;
  prefectureCode: string;
  city: string;
  fallRisk: boolean;
  shelterName: string;
  shelterAddress: string;
  kitLocation: string;
  devicePaired: boolean;
  contacts: { name: string; phone: string }[];
};

export function SettingsPanel() {
  const [form, setForm] = useState<Settings | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/family/settings").then(async (response) => {
      const data = await response.json();
      if (data.needsSetup) {
        window.location.href = "/family";
        return;
      }
      setForm(data);
    });
  }, []);

  if (!form) {
    return <FamilyShell><p>読み込み中です。</p></FamilyShell>;
  }

  async function save() {
    if (!form) return;
    const response = await fetch("/api/family/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "保存しました。" : (data.error ?? "保存できませんでした。"));
  }

  return (
    <FamilyShell>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">呼び名
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">年齢
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" type="number" value={form.age} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm">予報区
          <select className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={form.prefectureCode} onChange={(event) => setForm({ ...form, prefectureCode: event.target.value })}>
            {prefectures.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">市区町村
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        </label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.fallRisk} onChange={(event) => setForm({ ...form, fallRisk: event.target.checked })} />転びやすい</label>
        <label className="grid gap-1 text-sm">避難場所
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={form.shelterName} onChange={(event) => setForm({ ...form, shelterName: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">避難場所の住所
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={form.shelterAddress} onChange={(event) => setForm({ ...form, shelterAddress: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">防災バッグの場所
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={form.kitLocation} onChange={(event) => setForm({ ...form, kitLocation: event.target.value })} />
        </label>
        <button type="button" className="min-h-12 rounded-2xl bg-[#1c1915] text-white" onClick={() => void save()}>保存</button>
        {message ? <p>{message}</p> : null}
      </div>
      <section className="mt-8 grid gap-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">iPad</h2>
        <p>{form.devicePaired ? "接続中です。" : "未接続です。"}</p>
        <button type="button" className="min-h-12 rounded-2xl bg-white" onClick={() => {
          void fetch("/api/family/pairing", { method: "POST" }).then(async (response) => {
            const data = await response.json();
            setCode(data.code ?? "");
          });
        }}>新しいコードを出す</button>
        {code ? <p className="text-3xl tracking-widest">{code}</p> : null}
        <button type="button" className="min-h-12 rounded-2xl bg-white" onClick={() => {
          void fetch("/api/family/unlink", { method: "POST" }).then(() => setMessage("iPadの接続を切りました。"));
        }}>このiPadの接続を切る</button>
        <p>iPadではガイドアクセスを使い、祖父母がブラウザの外や家族画面へ移らないようにします。</p>
        <button type="button" className="min-h-12 rounded-2xl bg-white" onClick={() => {
          void fetch("/api/family/quake-drill", { method: "POST" }).then((response) => {
            setMessage(response.ok ? "iPadで地震の練習を始めます。3分以内に画面が赤くなります。" : "練習を始められませんでした。");
          });
        }}>地震の練習</button>
        <p>AirTagの位置をこのアプリが常時受け取る公式の方法はありません。祖父母が同意するなら、Appleの「探す」の家族共有を使ってください。</p>
      </section>
    </FamilyShell>
  );
}
