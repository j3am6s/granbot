import { prisma } from "../lib/db";
import { purgeOldRecords } from "../lib/retention";

const base = process.env.BASE ?? "http://127.0.0.1:3000";

function jar() {
  const cookies = new Map<string, string>();
  return {
    store(response: Response) {
      for (const line of response.headers.getSetCookie()) {
        const [pair] = line.split(";");
        const eq = pair.indexOf("=");
        cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    },
    headers(json = true) {
      return {
        origin: base,
        cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
        ...(json ? { "content-type": "application/json" } : {}),
      };
    },
  };
}

async function post(session: ReturnType<typeof jar>, path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: session.headers(),
    body: JSON.stringify(body),
  });
  session.store(response);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function get(session: ReturnType<typeof jar>, path: string) {
  const response = await fetch(`${base}${path}`, { headers: session.headers(false) });
  session.store(response);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const family = jar();
  const device = jar();
  const stamp = Date.now();
  const email = `family${stamp}@example.com`;

  const registered = await post(family, "/api/family/register", {
    name: "花子",
    email,
    password: "correct-horse",
  });
  assert(registered.status === 200, `register ${registered.status} ${JSON.stringify(registered.data)}`);

  const setup = await post(family, "/api/family/setup", {
    displayName: "太郎",
    age: 78,
    prefectureCode: "130000",
    city: "新宿",
    fallRisk: true,
    shelterName: "区立第一小学校",
    shelterAddress: "東京都新宿区4-5-6",
    kitLocation: "玄関の下駄箱",
    contacts: [{ name: "花子", phone: "09012345678" }],
  });
  assert(setup.status === 200 && typeof setup.data.pairingCode === "string", "setup");

  const paired = await post(device, "/api/kiosk/pair", {
    code: setup.data.pairingCode,
    pin: "1234",
  });
  assert(paired.status === 200, `pair ${paired.status} ${JSON.stringify(paired.data)}`);

  const boot = await get(device, "/api/kiosk/bootstrap");
  assert(boot.status === 200, "bootstrap");
  assert(boot.data.routine.id === "chair", "age 78 uses the chair routine");
  assert(boot.data.mental.length === 5, "five thinking tasks");
  assert(boot.data.bodyDone === 0, "no body progress yet");
  assert(!boot.data.recipe, "recipes are gone");

  const quiet = await get(device, "/api/kiosk/quake");
  assert(quiet.status === 200, "quake poll");

  const drill = await post(family, "/api/family/quake-drill", {});
  assert(drill.status === 200, "family drill");
  const alarm = await get(device, "/api/kiosk/quake");
  assert(alarm.data.eid === "drill", "drill reaches the iPad");
  assert(String(alarm.data.duringSpeech).includes("机の下"), "during script");
  assert(!String(alarm.data.duringSpeech).includes("区立第一小学校"), "during script stays indoors");
  assert(String(alarm.data.afterSpeech).includes("玄関の下駄箱"), "kit location");
  assert(String(alarm.data.afterSpeech).includes("区立第一小学校"), "shelter after shaking");

  const acked = await post(device, "/api/kiosk/quake", { eid: "drill" });
  assert(acked.status === 200, "ack");
  const cleared = await get(device, "/api/kiosk/quake");
  assert(cleared.data.eid === null, "acked drill stays quiet");

  const saved = await post(device, "/api/kiosk/progress", { kind: "body", completed: 2 });
  assert(saved.status === 200, "save exercise progress");
  const again = await get(device, "/api/kiosk/bootstrap");
  assert(again.data.bodyDone === 2, "progress is kept for today");

  const outing = await post(device, "/api/kiosk/outing", {});
  assert(outing.status === 200 && String(outing.data.speech).includes("電話"), "outing speech");
  const returned = await post(device, "/api/kiosk/outing", { back: true });
  assert(String(returned.data.speech).includes("おかえり"), "return speech");
  const finished = await post(device, "/api/kiosk/progress", { kind: "mind", completed: 5 });
  assert(finished.status === 200, "finish mental set");
  await post(device, "/api/kiosk/progress", { kind: "mind", completed: 5 });
  const breakfast = await post(device, "/api/kiosk/meal", { meal: "breakfast" });
  assert(breakfast.status === 200 && String(breakfast.data.speech).includes("朝ごはん"), "breakfast");
  const againMeal = await post(device, "/api/kiosk/meal", { meal: "breakfast" });
  assert(String(againMeal.data.speech).includes("もう食べた"), "breakfast is not sent twice");
  const mealsNow = await get(device, "/api/kiosk/bootstrap");
  assert(mealsNow.data.meals.breakfast === true && mealsNow.data.meals.lunch === false, "one meal is checked");
  const request = await post(device, "/api/kiosk/meal", { request: "牛乳を2本" });
  assert(String(request.data.speech).includes("伝えました"), "shopping request");
  const music = await get(device, "/api/kiosk/music");
  assert(music.status === 200 && music.data.tracks.length > 20, "city pop list");
  assert(String(music.data.tracks[0].previewUrl).startsWith("https://p.scdn.co/"), "preview audio");

  const familyHome = await get(family, "/api/family/home");
  assert(familyHome.data.alerts.some((alert: { type: string }) => alert.type === "outing"), "family hears about the outing");
  assert(familyHome.data.alerts.some((alert: { type: string }) => alert.type === "return"), "family hears they are back");
  const exerciseAlerts = familyHome.data.alerts.filter((alert: { type: string; title: string }) => alert.type === "exercise" && alert.title === "頭の運動");
  assert(exerciseAlerts.length === 1, "mental set notifies the family once");
  assert(familyHome.data.alerts.some((alert: { type: string }) => alert.type === "meal"), "family hears about breakfast");
  const requests = familyHome.data.alerts.filter((alert: { type: string }) => alert.type === "meal_request");
  assert(requests.length === 1 && String(requests[0].body).includes("牛乳を2本"), "family receives the request");

  const weather = await get(device, "/api/kiosk/weather");
  assert(weather.status === 200 && String(weather.data.speech).includes("新宿"), "weather");

  const gone = await post(device, "/api/kiosk/chat", { text: "こんにちは" });
  assert(gone.status === 404, "chat route is gone");

  const settingsAsDevice = await get(device, "/api/family/settings");
  assert(settingsAsDevice.status === 403, "iPad cannot read family settings");
  const bootAsFamily = await get(family, "/api/kiosk/bootstrap");
  assert(bootAsFamily.status === 403, "family cannot drive the kiosk");

  const page = await fetch(`${base}/`);
  const html = await page.text();
  assert(html.includes("グランボット") || html.includes("コード"), "kiosk page renders");
  assert(!html.includes("家族の画面"), "kiosk html is not the family dashboard");

  const familyPage = await fetch(`${base}/family`, { redirect: "manual" });
  assert(familyPage.status === 307 || familyPage.status === 302, "family page redirects when logged out");

  const household = await prisma.household.findFirst({ orderBy: { createdAt: "desc" } });
  if (!household) throw new Error("household exists");
  const stale = await prisma.alert.create({
    data: {
      householdId: household.id,
      type: "stale",
      title: "古い",
      body: "古いお知らせ",
      createdAt: new Date("2020-01-01T00:00:00+09:00"),
    },
  });
  const fresh = await prisma.alert.create({
    data: { householdId: household.id, type: "fresh", title: "新しい", body: "新しいお知らせ" },
  });
  await purgeOldRecords();
  assert(!(await prisma.alert.findUnique({ where: { id: stale.id } })), "records older than 30 days are erased");
  assert(await prisma.alert.findUnique({ where: { id: fresh.id } }), "newer records stay");
  await prisma.alert.delete({ where: { id: fresh.id } });
  assert(await prisma.household.findUnique({ where: { id: household.id } }), "the household profile stays");
  await prisma.$disconnect();

  console.log("flow checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
