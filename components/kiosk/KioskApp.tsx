"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CatFace } from "./CatFace";
import { MusicPlayer } from "./MusicPlayer";

type Gate = "loading" | "pair" | "pin" | "ready";
type Mode = "home" | "family" | "body" | "mind" | "outing" | "meal" | "music";
type Meals = { breakfast: boolean; lunch: boolean; dinner: boolean };
type ExerciseKind = "body" | "mind";
type Contact = { name: string; phone: string };
type Step = { id: string; speech: string };
type Bootstrap = {
  greeting: string;
  contacts: Contact[];
  routine: { title: string; steps: Step[] };
  mental: Step[];
  stopSpeech: string;
  bodyDone: number;
  mindDone: number;
  meals: Meals;
};
type Quake = {
  eid: string;
  suggestedPhase: "during" | "after";
  duringSpeech: string;
  afterSpeech: string;
};

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? "{}" : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "うまくいきませんでした。");
  }
  return data as Record<string, unknown>;
}

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const japanese = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
  return japanese.find((voice) => /kyoko|o-ren|nanami|female|女/i.test(voice.name)) ?? japanese[0] ?? null;
}

export function KioskApp() {
  const [gate, setGate] = useState<Gate>("loading");
  const [mode, setMode] = useState<Mode>("home");
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("こんにちは。");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [step, setStep] = useState(0);
  const [bodyDone, setBodyDone] = useState(0);
  const [mindDone, setMindDone] = useState(0);
  const [meals, setMeals] = useState<Meals>({ breakfast: false, lunch: false, dinner: false });
  const [asking, setAsking] = useState(false);
  const [order, setOrder] = useState("");
  const [quake, setQuake] = useState<Quake | null>(null);
  const [quakePhase, setQuakePhase] = useState<"during" | "after">("during");
  const audio = useRef<AudioContext | null>(null);
  const siren = useRef<(() => void) | null>(null);
  const shownQuake = useRef("");
  const lastText = useRef("");

  function armAudio() {
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio.current ??= new Ctx();
    void audio.current.resume();
  }

  function stopSiren() {
    siren.current?.();
    siren.current = null;
  }

  function startSiren() {
    const ctx = audio.current;
    if (!ctx || siren.current) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 740;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const timer = window.setInterval(() => {
      osc.frequency.value = osc.frequency.value > 800 ? 520 : 880;
    }, 280);
    siren.current = () => {
      window.clearInterval(timer);
      osc.stop();
    };
  }

  const speakGen = useRef(0);

  function hush() {
    speakGen.current += 1;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  async function speak(text: string) {
    const gen = ++speakGen.current;
    lastText.current = text;
    setCaption(text);
    setSpeaking(true);
    if (!window.speechSynthesis) {
      window.setTimeout(() => {
        if (gen === speakGen.current) setSpeaking(false);
      }, 800);
      return;
    }
    window.speechSynthesis.cancel();
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.85;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      utterance.onend = done;
      utterance.onerror = done;
      window.speechSynthesis.speak(utterance);
      window.setTimeout(done, 12000);
    });
    if (gen === speakGen.current) setSpeaking(false);
  }

  async function openHome(hello: boolean) {
    const response = await fetch("/api/kiosk/bootstrap");
    if (!response.ok) throw new Error("画面を開けませんでした。");
    const data = (await response.json()) as Bootstrap;
    setBoot(data);
    setBodyDone(data.bodyDone ?? 0);
    setMindDone(data.mindDone ?? 0);
    setMeals(data.meals ?? { breakfast: false, lunch: false, dinner: false });
    setGate("ready");
    setMode("home");
    if (hello) await speak(data.greeting);
    else setCaption(data.greeting);
  }

  const openHomeRef = useRef(openHome);
  openHomeRef.current = openHome;

  useEffect(() => {
    void fetch("/api/kiosk/status")
      .then((response) => response.json())
      .then(async (data: { paired?: boolean; unlocked?: boolean }) => {
        if (data.unlocked) {
          await openHomeRef.current(true);
          return;
        }
        setGate(data.paired ? "pin" : "pair");
        setCaption(data.paired ? "4けたの番号を入れてください。" : "家族からもらったコードを入れてください。");
      })
      .catch(() => setError("接続を確認してください。"));
  }, []);

  useEffect(() => {
    if (gate !== "ready") return;
    let stop = false;
    async function poll() {
      const response = await fetch("/api/kiosk/quake");
      if (!response.ok || stop) return;
      const data = (await response.json()) as Quake & { eid: string | null };
      if (!data.eid || data.eid === shownQuake.current) return;
      shownQuake.current = data.eid;
      setQuake(data);
      setQuakePhase(data.suggestedPhase);
      setMode("home");
      if (data.suggestedPhase === "during") startSiren();
      await speak(data.suggestedPhase === "during" ? data.duringSpeech : data.afterSpeech);
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 12000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [gate]);

  useEffect(() => {
    if (!quake || quakePhase !== "during") return;
    const after = quake.afterSpeech;
    const timer = window.setTimeout(() => {
      stopSiren();
      setQuakePhase("after");
      void speak(after);
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [quake, quakePhase]);

  async function onPair(event: FormEvent) {
    event.preventDefault();
    armAudio();
    if (pin !== pinAgain) {
      setError("番号が、同じではありません。");
      return;
    }
    try {
      await postJson("/api/kiosk/pair", { code, pin });
      await openHome(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続できませんでした。");
    }
  }

  async function onUnlock(event: FormEvent) {
    event.preventDefault();
    armAudio();
    try {
      await postJson("/api/kiosk/unlock", { pin });
      setPin("");
      await openHome(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "番号が違います。");
    }
  }

  useEffect(() => {
    const color = quake ? "#9b2335" : "#f6f1e7";
    document.body.style.background = color;
    document.documentElement.style.background = color;
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, [quake]);

  async function showOuting() {
    setMode("outing");
    const leave = "いってらっしゃい。楽しんできてください。出かける前に、電話を持って、電池が十分か確かめてください。";
    const [weather, outing] = await Promise.all([
      fetch("/api/kiosk/weather").then(async (response) => response.json() as Promise<{ speech?: string }>).catch(() => ({ speech: "" })),
      postJson("/api/kiosk/outing", {}).catch(() => ({ speech: leave })),
    ]);
    await speak(`${weather.speech ?? ""}${String(outing.speech ?? leave)}`);
  }

  async function markMeal(meal: keyof Meals) {
    const data = await postJson("/api/kiosk/meal", { meal });
    if (data.meals && typeof data.meals === "object") setMeals(data.meals as Meals);
    await speak(String(data.speech ?? ""));
  }

  async function sendOrder(event: FormEvent) {
    event.preventDefault();
    const data = await postJson("/api/kiosk/meal", { request: order });
    setOrder("");
    setAsking(false);
    await speak(String(data.speech ?? "家族に伝えました。"));
  }

  async function cameHome() {
    hush();
    try {
      const data = await postJson("/api/kiosk/outing", { back: true });
      setMode("home");
      await speak(String(data.speech ?? "おかえりなさい。"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "うまくいきませんでした。");
    }
  }

  function exerciseSteps(kind: ExerciseKind) {
    return kind === "body" ? boot?.routine.steps ?? [] : boot?.mental ?? [];
  }

  function exerciseDone(kind: ExerciseKind) {
    return kind === "body" ? bodyDone : mindDone;
  }

  function startExercise(kind: ExerciseKind) {
    const steps = exerciseSteps(kind);
    const done = exerciseDone(kind);
    if (done >= steps.length) {
      void speak("今日の分は、もう終わりました。また明日です。");
      return;
    }
    setMode(kind);
    setStep(done);
    void speak(steps[done]?.speech ?? "");
  }

  async function saveProgress(kind: ExerciseKind, completed: number) {
    if (kind === "body") setBodyDone(completed);
    else setMindDone(completed);
    await postJson("/api/kiosk/progress", { kind, completed }).catch(() => undefined);
  }

  async function pauseExercise(kind: ExerciseKind) {
    hush();
    await saveProgress(kind, step);
    setMode("home");
    if (boot) setCaption(boot.greeting);
  }

  async function nextExercise(kind: ExerciseKind) {
    const steps = exerciseSteps(kind);
    const next = step + 1;
    await saveProgress(kind, next);
    if (next >= steps.length) {
      setMode("home");
      await speak("今日の分は、終わりました。");
      return;
    }
    setStep(next);
    void speak(steps[next].speech);
  }

  function goHome() {
    hush();
    setMode("home");
    if (boot) setCaption(boot.greeting);
  }

  async function finishShaking() {
    if (!quake) return;
    stopSiren();
    setQuakePhase("after");
    await speak(quake.afterSpeech);
  }

  async function ackQuake() {
    if (!quake) return;
    stopSiren();
    await postJson("/api/kiosk/quake", { eid: quake.eid }).catch(() => undefined);
    setQuake(null);
    setMode("home");
    if (boot) setCaption(boot.greeting);
  }

  const move = boot?.routine.steps[step];
  const mind = boot?.mental[step];
  const alertMode = Boolean(quake);
  const screen = alertMode ? "bg-[#9b2335] text-white" : "bg-[#f6f1e7] text-[#1c1915]";
  const bodyTotal = boot?.routine.steps.length ?? 5;
  const mindTotal = boot?.mental.length ?? 5;
  const mealDone = Number(meals.breakfast) + Number(meals.lunch) + Number(meals.dinner);

  return (
    <div className={`min-h-screen ${screen}`} onPointerDown={() => { armAudio(); if (quake && quakePhase === "during") startSiren(); }}>
    <main className={`mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-4 ${screen}`}>
      <div className="mt-2 flex flex-col items-center">
        <CatFace speaking={speaking} />
      </div>
      <p aria-live="polite" className="mt-4 min-h-32 text-3xl leading-snug">{caption}</p>
      {error ? <p className="mt-2 text-xl">{error}</p> : null}

      {gate === "ready" && !alertMode ? (
        <button type="button" className="mt-3 min-h-16 self-start rounded-3xl border-2 border-current px-5 text-2xl" onClick={() => void speak(lastText.current || caption)}>
          もう一度
        </button>
      ) : null}

      {gate === "pair" ? (
        <form className="mt-6 grid gap-4" onSubmit={(event) => void onPair(event)}>
          <Label text="コード" value={code} onChange={setCode} />
          <Label text="4けたの番号" value={pin} onChange={setPin} secret />
          <Label text="もう一度" value={pinAgain} onChange={setPinAgain} secret />
          <button className="min-h-16 rounded-3xl bg-[#1c1915] text-2xl text-white" type="submit">つなぐ</button>
        </form>
      ) : null}

      {gate === "pin" ? (
        <form className="mt-6 grid gap-4" onSubmit={(event) => void onUnlock(event)}>
          <Label text="4けたの番号" value={pin} onChange={setPin} secret />
          <button className="min-h-16 rounded-3xl bg-[#1c1915] text-2xl text-white" type="submit">はじめる</button>
        </form>
      ) : null}

      {alertMode && quake ? (
        <section className="mt-4 grid gap-4">
          {quakePhase === "during" ? (
            <BigButton light onClick={() => void finishShaking()}>ゆれが止まった</BigButton>
          ) : (
            <BigButton light onClick={() => void ackQuake()}>わかった</BigButton>
          )}
        </section>
      ) : null}

      {gate === "ready" && !alertMode && mode === "home" ? (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <BigButton onClick={() => { hush(); setAsking(false); setMode("meal"); setCaption("ごはんのボタンを押してください。"); }}>
            <span className="block">ご飯</span>
            <span className="block text-xl">{mealDone}/3</span>
          </BigButton>
          <BigButton onClick={() => { hush(); setMode("family"); setCaption("電話する人を選んでください。"); }}>家族に電話</BigButton>
          <BigButton onClick={() => startExercise("body")}>
            <span className="block">体の運動</span>
            <span className="block text-xl">{bodyDone}/{bodyTotal}</span>
          </BigButton>
          <BigButton onClick={() => startExercise("mind")}>
            <span className="block">頭の運動</span>
            <span className="block text-xl">{mindDone}/{mindTotal}</span>
          </BigButton>
          <BigButton onClick={() => void showOuting()}>お出かけ</BigButton>
          <BigButton onClick={() => { hush(); setMode("music"); setCaption("シティポップです。"); }}>音楽</BigButton>
        </div>
      ) : null}

      {gate === "ready" && !alertMode && mode === "family" ? <CallList contacts={boot?.contacts ?? []} /> : null}

      {gate === "ready" && !alertMode && mode === "body" && move ? (
        <section className="mt-4 grid gap-4">
          <p className="text-center text-4xl">{step + 1}/{bodyTotal}</p>
          <p className="text-xl">{boot?.routine.title}</p>
          <BigButton onClick={() => void pauseExercise("body")}>あとで続ける</BigButton>
          <BigButton onClick={() => boot && void speak(boot.stopSpeech)}>痛みがある</BigButton>
          <BigButton onClick={() => void nextExercise("body")}>次へ</BigButton>
        </section>
      ) : null}

      {gate === "ready" && !alertMode && mode === "mind" && mind ? (
        <section className="mt-4 grid gap-4">
          <p className="text-center text-4xl">{step + 1}/{mindTotal}</p>
          <BigButton onClick={() => void pauseExercise("mind")}>あとで続ける</BigButton>
          <BigButton onClick={() => void nextExercise("mind")}>次へ</BigButton>
        </section>
      ) : null}

      {gate === "ready" && !alertMode && mode === "outing" ? (
        <section className="mt-4 grid gap-4">
          <BigButton onClick={() => void cameHome()}>戻りました</BigButton>
        </section>
      ) : null}

      {gate === "ready" && !alertMode && mode === "meal" && !asking ? (
        <section className="mt-4 grid gap-4">
          <MealButton label="朝ごはんを食べました" done={meals.breakfast} onClick={() => void markMeal("breakfast")} />
          <MealButton label="昼ごはんを食べました" done={meals.lunch} onClick={() => void markMeal("lunch")} />
          <MealButton label="夜ご飯を食べました" done={meals.dinner} onClick={() => void markMeal("dinner")} />
          <BigButton onClick={() => { hush(); setAsking(true); setCaption("家族に頼みたいことを、書いてください。"); }}>家族に頼む</BigButton>
        </section>
      ) : null}

      {gate === "ready" && !alertMode && mode === "meal" && asking ? (
        <form className="mt-4 grid gap-4" onSubmit={(event) => void sendOrder(event)}>
          <textarea className="min-h-40 rounded-3xl border-2 border-[#1c1915] bg-white p-4 text-3xl text-[#1c1915]" value={order} maxLength={120} onChange={(event) => setOrder(event.target.value)} />
          <button className="min-h-16 rounded-3xl border-2 border-[#1c1915] bg-white text-2xl text-[#1c1915]" type="submit">送る</button>
        </form>
      ) : null}

      {gate === "ready" && !alertMode && mode === "music" ? <MusicPlayer /> : null}

      {gate === "ready" && !alertMode && mode !== "home" ? (
        <button type="button" className="mt-4 mb-6 min-h-16 text-2xl underline" onClick={goHome}>もどる</button>
      ) : null}
      {gate === "ready" && !alertMode ? (
        <button type="button" className="mb-6 min-h-16 self-start text-xl underline" onClick={() => {
          hush();
          void postJson("/api/kiosk/lock").then(() => {
            shownQuake.current = "";
            setGate("pin");
            setCaption("4けたの番号を入れてください。");
          });
        }}>休む</button>
      ) : null}
    </main>
    </div>
  );
}

function CallList({ contacts }: { contacts: Contact[] }) {
  return (
    <ul className="mt-4 grid gap-4">
      {contacts.map((contact) => (
        <li key={contact.phone} className="rounded-3xl bg-white p-4 text-[#1c1915]">
          <p className="text-3xl">{contact.name}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <a className="min-h-16 rounded-3xl bg-[#1c1915] px-3 py-4 text-center text-2xl text-white" href={`tel:${contact.phone}`}>電話</a>
            <a className="min-h-16 rounded-3xl border-2 border-[#1c1915] px-3 py-4 text-center text-2xl" href={`facetime:${contact.phone}`}>顔を見て話す</a>
          </div>
        </li>
      ))}
    </ul>
  );
}

function BigButton({ children, onClick, light }: { children: ReactNode; onClick: () => void; light?: boolean }) {
  const tone = light ? "border-white bg-white text-[#9b2335]" : "border-[#1c1915] bg-white text-[#1c1915]";
  return (
    <button type="button" onClick={onClick} className={`min-h-16 rounded-3xl border-2 px-4 text-2xl ${tone}`}>
      {children}
    </button>
  );
}

function MealButton({ label, done, onClick }: { label: string; done: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-16 items-center justify-between rounded-3xl border-2 border-[#1c1915] bg-white px-4 text-2xl text-[#1c1915]">
      <span>{label}</span>
      <span>{done ? "済" : "まだ"}</span>
    </button>
  );
}

function Label({ text, value, onChange, secret }: { text: string; value: string; onChange: (value: string) => void; secret?: boolean }) {
  return (
    <label className="grid gap-2 text-2xl">{text}
      <input className="min-h-16 rounded-2xl border-2 border-[#1c1915] bg-white px-4 text-3xl text-[#1c1915]" type={secret ? "password" : "text"} inputMode="numeric" maxLength={secret ? 4 : 8} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
