// 凶籤三條路線的真實瀏覽器測試（手機尺寸）。
// 名字是用引擎預先算好的（日期固定在台北當天），所以只在「當天」有效；過日要重新找。
//   節點：node scripts/e2e-bad-paths.mjs <改判名字> <仍凶名字>
// 預設值是 2026-11-20 找到的：測試6（小凶→小吉）、測試24（小凶→小凶）。
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:4173/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const [GOOD = '測試6', BAD = '測試24'] = process.argv.slice(2);
mkdirSync('shots', { recursive: true });
let fails = 0;
const ok = (m) => console.log('✓ ' + m);
const bad = (m) => { fails++; console.log('✗ ' + m); };
const must = (c, m) => (c ? ok(m) : bad(m));

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

async function ritual(page, name) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /進廟求籤|看今天的籤/ }).click();
  await page.getByLabel('你的名字或暱稱').fill(name);
  await page.getByRole('button', { name: '就是我' }).click();
  await page.locator('.topic').first().click();
  await page.locator('.pain').first().click();
  const pad = page.locator('.inkpad');
  const b = await pad.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
  const st = page.locator('.stage');
  await st.waitFor();
  const s = await st.boundingBox();
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 24; i++) await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2 + (i % 2 ? 90 : -90), { steps: 3 });
  await page.mouse.up();
  // 搖籤完成後約 1 秒才會切到擲筊畫面，先等按鈕出現
  const toss = page.getByRole('button', { name: /擲筊|再擲一次/ });
  await toss.waitFor({ timeout: 5000 });
  for (let i = 0; i < 3; i++) {
    await toss.click();
    // 擲出（0.9 秒）→ 聖筊停 1.1 秒才揭曉；笑筊則按鈕變成「再擲一次」
    const next = await Promise.race([
      page.locator('.cardimg').waitFor({ timeout: 6000 }).then(() => 'card'),
      page.getByRole('button', { name: '再擲一次' }).waitFor({ timeout: 6000 }).then(() => 'again'),
    ]).catch(() => 'none');
    if (next === 'card') break;
  }
  try {
    await page.locator('.cardimg').waitFor({ timeout: 15000 });
  } catch (e) {
    await page.screenshot({ path: 'shots/bad-FAIL.png' });
    console.log('停在：', JSON.stringify(await page.evaluate(() => ({ h2: document.querySelector('h2')?.textContent, btns: [...document.querySelectorAll('button')].map((b) => b.textContent.trim().slice(0, 12) + (b.disabled ? '(disabled)' : '')), verdict: document.querySelector('.verdict')?.textContent }))));
    throw e;
  }
}
const level = async (page) => (await page.locator('.cardimg').getAttribute('alt')).split('：')[0];
const newPage = async () => (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'zh-TW' })).newPage();

// ── 路線 A：凶 → 敲木魚 → 重抽成吉（改判）
{
  const page = await newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ritual(page, GOOD);
  const first = await level(page);
  must(['小凶', '凶', '大凶', '下下籤'].includes(first), `A. 第一抽是凶側：${first}`);
  await page.screenshot({ path: 'shots/bad-A1-first.png' });
  await page.getByRole('button', { name: /敲木魚積功德，重抽一次/ }).click();
  await page.locator('.woodwrap').waitFor();
  await page.getByRole('button', { name: '我手痠了，幫我敲' }).click();
  await page.locator('.cardimg').waitFor({ timeout: 30000 });
  await page.waitForTimeout(700);
  const second = await level(page);
  await page.screenshot({ path: 'shots/bad-A2-rerolled.png' });
  must(['上上籤', '大吉', '吉', '小吉'].includes(second), `A. 重抽成吉：${first} → ${second}`);
  must((await page.getByRole('button', { name: /存成圖片/ }).count()) === 1, 'A. 改判後可以存圖');
  must((await page.getByRole('button', { name: /重抽|認命|化解/ }).count()) === 0, 'A. 改判後不再出現重抽或認命按鈕');
  // 重新整理：要停在改判後的結果，不能回到原本的凶籤
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /看今天的籤/ }).click();
  await page.locator('.cardimg').waitFor();
  must((await level(page)) === second, 'A. 重新整理後仍是改判後的籤');
  must(errors.length === 0, 'A. 沒有 JS 錯誤' + (errors.length ? '：' + errors[0] : ''));
  await page.context().close();
}

// ── 路線 B：凶 → 重抽仍凶 → 認命
// ── 路線 C：凶 → 重抽仍凶 → 再敲木魚化解
for (const route of ['B', 'C']) {
  const page = await newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ritual(page, BAD);
  const first = await level(page);
  const rr = page.getByRole('button', { name: /敲木魚積功德，重抽一次/ });
  if (!(await rr.count())) { await page.screenshot({ path: `shots/bad-${route}-NOREROLL.png` }); console.log('停在：', first, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button,a.btn')].map((b) => b.textContent.trim().slice(0, 14))))); }
  await rr.click({ timeout: 5000 });
  await page.locator('.woodwrap').waitFor();
  await page.getByRole('button', { name: '我手痠了，幫我敲' }).click();
  await page.locator('.cardimg').waitFor({ timeout: 30000 });
  await page.waitForTimeout(700);
  const second = await level(page);
  must(['小凶', '凶', '大凶', '下下籤'].includes(second), `${route}. 重抽仍凶：${first} → ${second}`);
  const keep = page.getByRole('button', { name: /認命，收下這支/ });
  const resolve = page.getByRole('button', { name: /再敲一輪木魚，化解它/ });
  must((await keep.count()) === 1 && (await resolve.count()) === 1, `${route}. 同時出現「認命」與「化解」`);
  must((await page.getByRole('button', { name: /重抽/ }).count()) === 0, `${route}. 已用掉的重抽不能再按`);
  await page.screenshot({ path: `shots/bad-${route}1-decide.png` });
  if (route === 'B') {
    await keep.click();
    await page.waitForTimeout(800);
    must((await page.getByRole('button', { name: /存成圖片/ }).count()) === 1, 'B. 認命後可以存圖');
    must((await level(page)) === second, 'B. 認命後保留重抽那支');
    await page.screenshot({ path: 'shots/bad-B2-kept.png' });
  } else {
    await resolve.click();
    await page.locator('.woodwrap').waitFor();
    await page.getByRole('button', { name: '我手痠了，幫我敲' }).click();
    await page.locator('.cardimg').waitFor({ timeout: 40000 });
    await page.waitForTimeout(800);
    must((await page.getByRole('button', { name: /存成圖片/ }).count()) === 1, 'C. 化解後可以存圖');
    must((await level(page)) === second, 'C. 化解不改變籤本身');
    await page.screenshot({ path: 'shots/bad-C2-resolved.png' });
    // 籤冊要標「已化解」
    await page.getByRole('button', { name: '我的籤冊' }).click();
    const meta = await page.locator('.book .meta').first().innerText();
    must(meta.includes('已化解'), 'C. 籤冊標示「已化解」：' + meta);
  }
  must(errors.length === 0, `${route}. 沒有 JS 錯誤` + (errors.length ? '：' + errors[0] : ''));
  await page.context().close();
}

await browser.close();
console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
process.exitCode = fails ? 1 : 0;
