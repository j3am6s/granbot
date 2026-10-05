"use client";

import { useState } from "react";
import { prefectures } from "@/content/prefectures";

type Contact = { name: string; phone: string };

const empty = {
  displayName: "",
  age: 75,
  prefectureCode: "130000",
  city: "",
  fallRisk: false,
  shelterName: "",
  shelterAddress: "",
  kitLocation: "",
  contacts: [
    { name: "", phone: "" },
    { name: "", phone: "" },
  ] as Contact[],
};

export function SetupWizard({ onDone }: { onDone: (code: string | null) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  function patch(partial: Partial<typeof empty>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function save() {
    setError("");
    const response = await fetch("/api/family/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        age: Number(form.age),
        contacts: form.contacts.filter((contact) => contact.name && contact.phone),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "保存できませんでした。");
      return;
    }
    onDone(typeof data.pairingCode === "string" ? data.pairingCode : null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#f3f6f4] px-4 py-8 text-[#1c1915]">
      <h1 className="text-2xl font-semibold">祖父母の設定</h1>
      <p className="mt-2 text-sm">ステップ {step + 1} / 4</p>
      {step === 0 ? (
        <div className="mt-4 grid gap-3">
          <Field label="呼び名（さん、は自動です）" value={form.displayName} onChange={(value) => patch({ displayName: value })} />
          <label className="grid gap-1">年齢
            <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" type="number" min={60} max={110} value={form.age} onChange={(event) => patch({ age: Number(event.target.value) })} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.fallRisk} onChange={(event) => patch({ fallRisk: event.target.checked })} />
            転びやすい、または75歳以上でいすの運動にする
          </label>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">予報区
            <select className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={form.prefectureCode} onChange={(event) => patch({ prefectureCode: event.target.value })}>
              {prefectures.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <Field label="市区町村" value={form.city} onChange={(value) => patch({ city: value })} />
          <Field label="指定緊急避難場所の名前" value={form.shelterName} onChange={(value) => patch({ shelterName: value })} />
          <Field label="避難場所の住所" value={form.shelterAddress} onChange={(value) => patch({ shelterAddress: value })} />
          <Field label="防災バッグの場所" value={form.kitLocation} onChange={(value) => patch({ kitLocation: value })} />
        </div>
      ) : null}
      {step === 2 ? (
        <div className="mt-4 grid gap-4">
          {form.contacts.map((contact, index) => (
            <div key={index} className="grid gap-2 rounded-2xl bg-white p-3">
              <Field label={`家族 ${index + 1}`} value={contact.name} onChange={(value) => {
                const contacts = [...form.contacts];
                contacts[index] = { ...contact, name: value };
                patch({ contacts });
              }} />
              <Field label="電話" value={contact.phone} onChange={(value) => {
                const contacts = [...form.contacts];
                contacts[index] = { ...contact, phone: value };
                patch({ contacts });
              }} />
            </div>
          ))}
          {form.contacts.length < 3 ? (
            <button type="button" className="underline" onClick={() => patch({ contacts: [...form.contacts, { name: "", phone: "" }] })}>家族を足す</button>
          ) : null}
        </div>
      ) : null}
      {step === 3 ? (
        <div className="mt-4 grid gap-2 text-sm leading-relaxed">
          <p>{form.displayName}さん、{form.age}歳、{form.city}</p>
          <p>避難場所: {form.shelterName}</p>
          <p>防災バッグ: {form.kitLocation}</p>
          <p>iPadのガイドアクセスをオンにすると、祖父母がこの家族画面へ移りにくくなります。設定アプリのアクセシビリティから、グランボットを開いた状態で開始します。</p>
          {error ? <p className="text-[#9b2335]">{error}</p> : null}
          <button type="button" className="mt-2 min-h-12 rounded-2xl bg-[#1c1915] text-white" onClick={() => void save()}>保存してコードを出す</button>
        </div>
      ) : null}
      <div className="mt-6 flex gap-3">
        {step > 0 ? <button type="button" className="min-h-12 flex-1 rounded-2xl bg-white" onClick={() => setStep(step - 1)}>戻る</button> : null}
        {step < 3 ? <button type="button" className="min-h-12 flex-1 rounded-2xl bg-[#1c1915] text-white" onClick={() => setStep(step + 1)}>次へ</button> : null}
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">{label}
      <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
