import { chromium } from "playwright";

async function main() {
  const base = process.env.BASE ?? "http://127.0.0.1:3000";
  const stamp = Date.now();

  function assert(condition: unknown, message: string) {
    if (!condition) throw new Error(message);
  }

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const family = await browser.newContext();
  const familyPage = await family.newPage();
  await familyPage.goto(`${base}/family/login`);
  await familyPage.getByLabel("名前").fill("花子");
  await familyPage.getByLabel("メール").fill(`browser${stamp}@example.com`);
  await familyPage.getByLabel("パスワード（10文字以上）").fill("correct-horse");
  await familyPage.getByRole("button", { name: "家族の画面を作る" }).click();
  await familyPage.getByLabel("呼び名（さん、は自動です）").fill("太郎");
  await familyPage.getByLabel("年齢").fill("78");
  await familyPage.getByRole("button", { name: "次へ" }).click();
  await familyPage.getByLabel("市区町村").fill("新宿");
  await familyPage.getByLabel("指定緊急避難場所の名前").fill("区立第一小学校");
  await familyPage.getByLabel("避難場所の住所").fill("東京都新宿区4-5-6");
  await familyPage.getByLabel("防災バッグの場所").fill("玄関の下駄箱");
  await familyPage.getByRole("button", { name: "次へ" }).click();
  await familyPage.getByLabel("家族 1").fill("花子");
  await familyPage.getByLabel("電話").first().fill("09012345678");
  await familyPage.getByRole("button", { name: "次へ" }).click();
  await familyPage.getByRole("button", { name: "保存してコードを出す" }).click();
  const code = (await familyPage.locator("p.tracking-widest").textContent())?.trim() ?? "";
  assert(/^\d{8}$/.test(code), `pairing code missing: ${code}`);

  const kiosk = await browser.newContext({ viewport: { width: 834, height: 1112 } });
  const ipad = await kiosk.newPage();
  await ipad.goto(base);
  await ipad.getByLabel("コード").fill(code);
  await ipad.getByLabel("4けたの番号").fill("1234");
  await ipad.getByLabel("もう一度").fill("1234");
  await ipad.getByRole("button", { name: "つなぐ" }).click();
  await ipad.getByRole("button", { name: /ご飯/ }).waitFor();
  const homeText = await ipad.locator("body").innerText();
  assert(!homeText.includes("いま家にいます"), "home button is gone");
  assert(!homeText.includes("じしん"), "quake button is gone");
  assert(!homeText.includes("ニュース"), "news is gone");
  assert(!homeText.includes("おしゃべり"), "chat is gone");

  await ipad.getByRole("button", { name: "家族に電話" }).click();
  await ipad.getByText("花子").waitFor();
  await ipad.getByRole("button", { name: "もどる" }).click();

  await ipad.getByRole("button", { name: "体の運動" }).click();
  await ipad.getByText("1/5").waitFor();
  await ipad.getByRole("button", { name: "次へ" }).click();
  await ipad.getByText("2/5").waitFor();
  await ipad.getByRole("button", { name: "あとで続ける" }).click();
  await ipad.getByRole("button", { name: /体の運動/ }).waitFor();
  assert((await ipad.getByRole("button", { name: /体の運動/ }).innerText()).includes("1/5"), "menu keeps today's progress");

  await ipad.getByRole("button", { name: "頭の運動" }).click();
  await ipad.getByText("1/5").waitFor();
  await ipad.getByText(/何月何日|何曜日|季節|朝、昼|市区町村|天気を|何年/).waitFor();
  await ipad.getByRole("button", { name: "もどる" }).click();

  await ipad.getByRole("button", { name: "お出かけ" }).click();
  await ipad.locator("[aria-live='polite']", { hasText: "天気" }).waitFor();
  await ipad.getByText("楽しんで").waitFor();
  const returnBox = await ipad.getByRole("button", { name: "戻りました" }).boundingBox();
  assert((returnBox?.width ?? 0) >= 600, "return button spans the column");
  assert((returnBox?.height ?? 0) >= 64 && (returnBox?.height ?? 0) < 100, "return button matches the other large buttons");
  await ipad.getByRole("button", { name: "戻りました" }).click();
  await ipad.getByRole("button", { name: /ご飯/ }).waitFor();
  await ipad.getByRole("button", { name: /ご飯/ }).click();
  await ipad.getByRole("button", { name: "朝ごはんを食べました" }).click();
  await ipad.getByText("済").waitFor();
  await ipad.getByRole("button", { name: "家族に頼む" }).click();
  await ipad.locator("textarea").fill("牛乳を2本");
  await ipad.getByRole("button", { name: "送る" }).click();
  await ipad.getByText("伝えました").waitFor();
  await ipad.getByRole("button", { name: "もどる" }).click();
  await ipad.getByRole("button", { name: "音楽" }).click();
  await ipad.getByRole("button", { name: "次の曲" }).waitFor();
  await ipad.waitForFunction(() => !document.body.innerText.includes("読み込み中です。"));
  await ipad.getByRole("button", { name: "もどる" }).click();

  await familyPage.getByRole("button", { name: "お知らせへ" }).click();
  await familyPage.getByText("出かけました").waitFor();
  await familyPage.getByText("太郎さんが戻りました。").waitFor();
  await familyPage.getByText("朝ごはんを食べました").waitFor();
  await familyPage.getByText("牛乳を2本").waitFor();
  const familyBg = await familyPage.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert(familyBg === "rgb(243, 246, 244)", "family wallpaper is gray");
  await familyPage.getByRole("link", { name: "設定" }).click();
  assert(!(await familyPage.locator("body").innerText()).includes("誰が見たか"), "audit list is gone");
  await familyPage.getByRole("button", { name: "地震の練習" }).click();
  await ipad.getByText("机の下").waitFor({ timeout: 20000 });
  const alertClass = await ipad.locator("main").getAttribute("class");
  assert(alertClass?.includes("9b2335"), "screen turns red");
  assert(!(await ipad.locator("[aria-live='polite']").innerText()).includes("区立第一小学校"), "shelter waits");
  await ipad.getByRole("button", { name: "ゆれが止まった" }).click();
  await ipad.getByText("玄関の下駄箱").waitFor();
  await ipad.getByText("区立第一小学校").waitFor();
  await ipad.getByRole("button", { name: "わかった" }).click();
  await ipad.getByRole("button", { name: /ご飯/ }).waitFor();

  const kioskHtml = await ipad.content();
  assert(!kioskHtml.includes("家族の画面"), "iPad does not show the family dashboard");

  await browser.close();
  console.log("browser checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
