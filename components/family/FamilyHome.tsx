"use client";

import { useEffect, useState } from "react";
import { FamilyShell } from "./FamilyShell";
import { SetupWizard } from "./SetupWizard";

type AlertItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  dateKey: string;
  dateLabel: string;
};

export function FamilyHome() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [feed, setFeed] = useState<{
    elderName: string;
    city: string;
    devicePaired: boolean;
    todayKey: string;
    alerts: AlertItem[];
  } | null>(null);
  const [openDays, setOpenDays] = useState<string[]>([]);

  async function load() {
    const response = await fetch("/api/family/home");
    if (response.status === 403) {
      window.location.href = "/family/login";
      return;
    }
    const data = await response.json();
    if (data.needsSetup) {
      setNeedsSetup(true);
      return;
    }
    setNeedsSetup(false);
    setFeed(data);
    setOpenDays((current) => (current.length ? current : [data.todayKey]));
  }

  useEffect(() => {
    void load();
  }, []);

  if (needsSetup === null) return <p className="p-6">読み込み中です。</p>;
  if (needsSetup && !code) {
    return (
      <SetupWizard
        onDone={(pairingCode) => {
          setCode(pairingCode);
          setNeedsSetup(false);
        }}
      />
    );
  }
  if (code) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-[#f3f6f4] px-4 py-10">
        <h1 className="text-2xl">iPadに入れるコード</h1>
        <p className="mt-4 text-5xl tracking-widest">{code}</p>
        <p className="mt-4 text-sm leading-relaxed">30分で使えなくなります。iPadでこのコードと、4けたの番号を入れます。番号は祖父母と共有し、この画面には残りません。</p>
        <button type="button" className="mt-6 min-h-12 rounded-2xl bg-[#1c1915] px-4 text-white" onClick={() => { setCode(null); void load(); }}>お知らせへ</button>
      </main>
    );
  }

  const groups = groupAlerts(feed?.alerts ?? []);

  return (
    <FamilyShell>
      <p className="text-xl">{feed?.elderName}　{feed?.city}</p>
      <p className="mt-1 text-sm">{feed?.devicePaired ? "iPadは接続されています。" : "iPadはまだ接続されていません。設定でコードを出してください。"}</p>
      <div className="mt-4 grid gap-3">
        {groups.length ? groups.map((group) => {
          const open = openDays.includes(group.dateKey);
          return (
            <section key={group.dateKey} className="rounded-2xl bg-white">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left text-lg font-semibold"
                aria-expanded={open}
                onClick={() => setOpenDays((current) => (
                  current.includes(group.dateKey)
                    ? current.filter((day) => day !== group.dateKey)
                    : [...current, group.dateKey]
                ))}
              >
                <span>{group.label}</span>
                <span className="text-sm font-normal">{open ? "とじる" : "ひらく"}</span>
              </button>
              {open ? (
                <ul className="grid gap-3 px-4 pb-4">
                  {group.items.map((alert) => (
                    <li key={alert.id} className={`rounded-2xl bg-[#f3f6f4] p-4 ${alert.type === "fall" || alert.type === "quake" ? "border-2 border-[#9b2335]" : ""}`}>
                      <p className="text-sm text-[#5c564e]">{alert.createdAt}{alert.read ? "" : "　未読"}</p>
                      <p className="text-lg font-semibold">{alert.title}</p>
                      <p className="mt-1 leading-relaxed">{alert.body}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        }) : <p className="rounded-2xl bg-white p-4">お知らせはまだありません。</p>}
      </div>
      <button
        type="button"
        className="mt-4 min-h-12 w-full rounded-2xl bg-white"
        onClick={() => {
          void fetch("/api/family/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(load);
        }}
      >
        すべて確認した
      </button>
    </FamilyShell>
  );
}

function groupAlerts(alerts: AlertItem[]) {
  const groups: { dateKey: string; label: string; items: AlertItem[] }[] = [];
  for (const alert of alerts) {
    const found = groups.find((group) => group.dateKey === alert.dateKey);
    if (found) found.items.push(alert);
    else groups.push({ dateKey: alert.dateKey, label: alert.dateLabel, items: [alert] });
  }
  return groups;
}
