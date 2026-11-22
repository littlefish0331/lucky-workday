// 用真的 Edge 以手機尺寸（390x844）走完整個流程並截圖。用法：先 `npm run build && npm run preview -- --port 4173`，再 `node scripts/e2e-smoke.mjs`
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:4173/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync('shots', { recursive: true });
const log = [];
const ok = (m) => { log.push('✓ ' + m); console.log('✓ ' + m); };
const bad = (m) => { log.push('✗ ' + m); console.log('✗ ' + m); process.exitCode = 1; };

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'zh-TW' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url().slice(0, 90)));

const shot = (n) => page.screenshot({ path: `shots/${n}.png` });
const NAME = process.env.NAME ?? '王小明';

await page.goto(URL, { waitUntil: 'networkidle' });
await shot('01-home');
(await page.locator('h1').innerText()) === '準時下班宮' ? ok('首頁標題') : bad('首頁標題');

// 版面：不能橫向捲動，字級不能小於 14
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
overflow <= 0 ? ok('首頁無橫向捲動') : bad(`首頁橫向溢出 ${overflow}px`);

await page.getByRole('button', { name: /進廟求籤|看今天的籤/ }).click();
await page.getByLabel('你的名字').fill(NAME);
await shot('02-name');
await page.getByRole('button', { name: '就是我' }).click();

// 痛點：有 6 個，可換一批
await page.locator('.pain').first().waitFor();
const n1 = await page.locator('.pain').count();
n1 === 6 ? ok('痛點 6 個選項') : bad(`痛點數量 ${n1}`);
const t1 = await page.locator('.pain b').allInnerTexts();
await page.getByRole('button', { name: /換一批/ }).click();
const t2 = await page.locator('.pain b').allInnerTexts();
t1.join() !== t2.join() ? ok('換一批會換內容') : bad('換一批沒有變');
await shot('03-pain');
await page.locator('.pain').nth(0).click();

// 按手印：按住 1.3 秒
const pad = page.locator('.inkpad');
await pad.waitFor();
await shot('04-stamp-before');
const box = await pad.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(500);
await shot('04b-stamp-holding');
await page.waitForTimeout(800);
await page.mouse.up();
await page.waitForTimeout(300);
await shot('05-stamp-done');
await page.locator('.cyl').waitFor({ timeout: 4000 });
ok('按手印 → 進入搖籤');

// 搖籤：左右拖
const stage = page.locator('.stage');
const sb = await stage.boundingBox();
await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
await page.mouse.down();
for (let i = 0; i < 24; i++) {
  await page.mouse.move(sb.x + sb.width / 2 + (i % 2 ? 90 : -90), sb.y + sb.height / 2, { steps: 3 });
}
await shot('06-shake');
await page.mouse.up();
await page.getByRole('button', { name: '擲筊' }).waitFor({ timeout: 5000 });
ok('搖籤 → 進入擲筊');

// 擲筊：笑筊要再擲；最多 2 擲
let tosses = 0;
for (let i = 0; i < 3; i++) {
  const b = page.getByRole('button', { name: /擲筊|再擲一次/ });
  if (!(await b.isVisible().catch(() => false))) break;
  if (await b.isDisabled()) break;
  await b.click();
  tosses++;
  await page.waitForTimeout(1250);
  if (i === 0) await shot('07-toss');
  if (await page.locator('.cardimg, .cardskel').count()) break;
}
await page.locator('.cardimg').waitFor({ timeout: 15000 });
tosses <= 2 ? ok(`擲筊 ${tosses} 次就揭曉`) : bad(`擲筊 ${tosses} 次`);
await page.waitForTimeout(600);
await shot('08-card');

// 籤卡圖片：尺寸 1080x1920、不是空白
const meta = await page.evaluate(async () => {
  const img = document.querySelector('.cardimg');
  await img.decode();
  return { w: img.naturalWidth, h: img.naturalHeight, alt: img.alt };
});
meta.w === 1080 && meta.h === 1920 ? ok(`籤卡 ${meta.w}x${meta.h}：${meta.alt}`) : bad(`籤卡尺寸 ${meta.w}x${meta.h}`);

// 凶籤路線：重抽 / 認命
const reroll = page.getByRole('button', { name: /敲木魚積陰德/ });
if (await reroll.count()) {
  ok('抽到凶側 → 出現重抽按鈕');
  await reroll.click();
  await page.locator('.woodwrap').waitFor();
  await shot('09-wood');
  await page.getByRole('button', { name: '我手痠了，幫我敲' }).click();
  await page.locator('.cardimg').waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  await shot('10-after-reroll');
  ok('木魚自動敲完 → 回到籤卡');
  const decide = page.getByRole('button', { name: /再敲一輪木魚，化解它/ });
  if (await decide.count()) {
    ok('重抽仍凶 → 出現認命／化解');
    await page.getByRole('button', { name: /認命/ }).click();
    await page.waitForTimeout(500);
  }
} else {
  ok('抽到吉側（沒有重抽按鈕）');
}
await page.waitForTimeout(500);
await shot('11-final');

// 存圖 / 分享按鈕
const saveBtn = page.getByRole('button', { name: '存成圖片' });
if (await saveBtn.count()) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 6000 }).catch(() => null), saveBtn.click()]);
  dl ? ok('存圖：觸發下載 ' + dl.suggestedFilename()) : ok('存圖：走系統分享或長按（無下載事件）');
  const th = await page.locator('a[href*="threads.com/intent/post"]').getAttribute('href');
  th && th.includes('text=') && th.includes('url=') ? ok('Threads 發文連結含文字與網址') : bad('Threads 連結異常');
}

// 重新整理：同名同日應直接回到同一張籤
const eye1 = await page.locator('.cardimg').getAttribute('alt');
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /看今天的籤/ }).click();
await page.locator('.cardimg').waitFor();
const eye2 = await page.locator('.cardimg').getAttribute('alt');
eye1 === eye2 ? ok('重新整理後仍是同一支籤') : bad(`重新整理後籤變了：${eye1} → ${eye2}`);

// 籤冊
await page.getByRole('button', { name: '我的籤冊' }).click();
await page.locator('.book li').first().waitFor();
await shot('12-book');
ok('籤冊有 ' + (await page.locator('.book li').count()) + ' 筆');

// 文字大小：畫面上所有可見文字不能小於 14px
const tiny = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 14) bad.push(`${el.tagName}.${el.className} ${fs}px「${el.textContent.trim().slice(0, 12)}」`);
  }
  return bad;
});
tiny.length === 0 ? ok('可見文字皆 ≥ 14px') : bad('文字過小：' + tiny.join(' | '));

const realErrors = errors.filter((e) => !/supabase\.co/.test(e));
realErrors.length === 0 ? ok('沒有 JS 錯誤與資源載入失敗（不含計數 API）') : bad('錯誤：\n  ' + realErrors.join('\n  '));
await browser.close();
console.log(`\n${log.filter((l) => l.startsWith('✓')).length} 項通過，${log.filter((l) => l.startsWith('✗')).length} 項失敗`);
