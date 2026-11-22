// 搖手機搖籤的真實瀏覽器測試（桌機 Edge、390x844）。
// 這裡用「合成」的 devicemotion 事件模擬手機：不是實機，只能證明程式邏輯，不能證明感測器真的有資料。
// 自己啟動 vite preview（前景子程序、跑完自己結束），所以不需要事先開伺服器。
// 用法：npm run build && node scripts/e2e-shake.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4175;
const URL = `http://127.0.0.1:${PORT}/`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync('shots', { recursive: true });
let failed = 0;
const ok = (m) => console.log('✓ ' + m);
const bad = (m) => { failed++; console.log('✗ ' + m); };
const check = (c, m) => (c ? ok(m) : bad(m));

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* 已經結束 */ } };
process.on('exit', stop);
for (let i = 0; i < 40; i++) {
  if (await fetch(URL).then((r) => r.ok).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
  if (i === 39) { bad('預覽伺服器沒有起來'); stop(); process.exit(1); }
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

/**
 * mode：
 *  'desktop' 桌機：DeviceMotionEvent 存在，但不會有資料
 *  'android' 有 DeviceMotionEvent、不需授權，會收到事件
 *  'ios'     requestPermission() 存在；answer 決定授權結果
 *  'none'    根本沒有 DeviceMotionEvent
 */
async function session(mode, answer = 'granted') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'zh-TW' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/functions/v1/count', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }));
  await page.addInitScript(({ mode, answer }) => {
    window.__perm = 0;
    if (mode === 'none') { try { delete window.DeviceMotionEvent; } catch { window.DeviceMotionEvent = undefined; } return; }
    if (typeof window.DeviceMotionEvent === 'undefined') window.DeviceMotionEvent = function DeviceMotionEvent() {};
    if (mode === 'ios') window.DeviceMotionEvent.requestPermission = () => { window.__perm++; return Promise.resolve(answer); };
    else delete window.DeviceMotionEvent.requestPermission;
  }, { mode, answer });
  return { ctx, page, errors };
}

/** 派發一串合成的 devicemotion：用力左右搖 seconds 秒（約 4Hz、幅度 25 m/s²），每 16ms 一筆 */
async function shakeHard(page, seconds) {
  await page.evaluate(async (seconds) => {
    const G = 9.81;
    const fire = (x, y, z) => {
      const e = new Event('devicemotion');
      e.accelerationIncludingGravity = { x, y, z };
      e.acceleration = null;
      window.dispatchEvent(e);
    };
    const start = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        fire(25 * Math.sin(2 * Math.PI * 4 * t), 0, G);
        t >= seconds ? resolve() : setTimeout(tick, 16);
      };
      tick();
    });
  }, seconds);
}

/** 走到搖籤頁。回傳 page 已停在「搖籤筒」 */
async function toShake(page, name) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /進廟求籤|看今天的籤/ }).click();
  await page.getByLabel('你的名字或暱稱').fill(name);
  await page.getByRole('button', { name: '就是我' }).click();
  await page.locator('.pain').first().click();
  const pad = page.locator('.inkpad');
  await pad.waitFor();
  const b = await pad.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1400);
  await page.mouse.up();
  await page.locator('.cyl').waitFor({ timeout: 4000 });
}

const meter = (page) => page.evaluate(() => parseFloat(document.querySelector('.meter i')?.style.width ?? '0'));
const tiltOf = (page) => page.evaluate(() => document.querySelector('.cyl')?.style.transform ?? '');

// ───── A. 桌機（有 DeviceMotionEvent 但沒有資料）：不出現授權鈕、拖曳照常、不報錯 ─────
{
  const { ctx, page, errors } = await session('desktop');
  await toShake(page, '搖測桌機' + Date.now());
  await page.waitForTimeout(2000); // 超過「沒有資料」的等待時間
  check((await page.locator('.shake-allow').count()) === 0, '桌機：沒有出現授權鈕');
  check(/左右拖曳/.test(await page.locator('.sub').first().innerText()), '桌機：提示文字仍是拖曳版本');
  const sb = await page.locator('.stage').boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 24; i++) await page.mouse.move(sb.x + sb.width / 2 + (i % 2 ? 90 : -90), sb.y + sb.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.getByRole('button', { name: '擲筊' }).waitFor({ timeout: 5000 }).then(() => ok('桌機：手指拖曳照常搖出籤'), () => bad('桌機：拖曳之後沒進到擲筊'));
  check(errors.length === 0, '桌機：沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── B. Android（不需授權）：合成搖動事件能把進度推滿、籤跳出來 ─────
{
  const { ctx, page, errors } = await session('android');
  await toShake(page, '搖測安卓' + Date.now());
  check((await page.locator('.shake-allow').count()) === 0, 'Android：不需要授權鈕');
  const before = await meter(page);
  await shakeHard(page, 0.8);
  const mid = await meter(page);
  check(mid > before && mid > 5, `Android：搖 0.8 秒進度條動了（${before}% → ${Math.round(mid)}%）`);
  check(/左右拖曳/.test(await page.locator('.sub').first().innerText()) && /搖手機/.test(await page.locator('.sub').first().innerText()), 'Android：收到資料後提示改成「搖手機，或左右拖曳」');
  // 搖的過程中連續取樣籤筒角度：要同時看到左傾與右傾（每一下會換邊）
  const seen = new Set();
  const sampler = (async () => {
    for (let i = 0; i < 60; i++) { seen.add(Math.round(parseFloat((await tiltOf(page)).match(/rotate\((-?[\d.]+)deg/)?.[1] ?? '0'))); await page.waitForTimeout(25); }
  })();
  await shakeHard(page, 1.2);
  await sampler;
  check(seen.has(12) && seen.has(-12), `Android：搖的過程中籤筒左右各傾斜過（看到的角度：${[...seen].sort((a, b) => a - b).join('、')}）`);
  await page.waitForTimeout(400);
  check(Math.round(parseFloat((await tiltOf(page)).match(/rotate\((-?[\d.]+)deg/)?.[1] ?? '99')) === 0, 'Android：停手之後籤筒回正');
  await page.screenshot({ path: 'shots/s1-shaking.png' });
  await shakeHard(page, 4);
  await page.getByRole('button', { name: '擲筊' }).waitFor({ timeout: 6000 }).then(() => ok('Android：搖滿之後籤跳出來、進到擲筊'), () => bad('Android：搖了 4.8 秒還是沒進到擲筊'));
  check(errors.length === 0, 'Android：沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── C. 走路／輕微晃動不會誤觸（進度不動） ─────
{
  const { ctx, page } = await session('android');
  await toShake(page, '搖測走路' + Date.now());
  await page.evaluate(async () => {
    const G = 9.81;
    const start = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        const e = new Event('devicemotion');
        e.accelerationIncludingGravity = { x: 0.8 * Math.sin(2 * Math.PI * 2 * t), y: 0, z: G + 3 * Math.sin(2 * Math.PI * 2 * t + 1) };
        window.dispatchEvent(e);
        t >= 3 ? resolve() : setTimeout(tick, 16);
      };
      tick();
    });
  });
  check((await meter(page)) === 0, '走路的晃動（2Hz、3 m/s²）不會讓進度條動');
  await ctx.close();
}

// ───── D. iOS：出現授權鈕；允許 → 開始聽；點之前不會偷偷聽 ─────
{
  const { ctx, page, errors } = await session('ios', 'granted');
  await toShake(page, '搖測蘋果允' + Date.now());
  const btn = page.getByRole('button', { name: /搖手機的方式搖/ });
  check((await btn.count()) === 1, 'iOS：出現「用搖手機的方式搖」鈕');
  const h = await btn.evaluate((e) => Math.round(e.getBoundingClientRect().height));
  check(h >= 48, `iOS：授權鈕高度 ≥ 48px（${h}）`);
  await shakeHard(page, 0.8);
  check((await meter(page)) === 0, 'iOS：還沒按授權之前，搖動不會動到進度（沒有偷聽）');
  check((await page.evaluate(() => window.__perm)) === 0, 'iOS：還沒按之前沒有呼叫 requestPermission');
  await page.screenshot({ path: 'shots/s2-ios-ask.png' });
  await btn.click();
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.__perm)) === 1, 'iOS：按下去才呼叫 requestPermission（在點擊裡）');
  check((await page.locator('.shake-allow').count()) === 0, 'iOS：授權後按鈕消失');
  await shakeHard(page, 0.8);
  check((await meter(page)) > 5, 'iOS：授權之後，搖動會推進度');
  check(errors.length === 0, 'iOS 允許：沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── E. iOS 使用者拒絕：不卡關，改提示用拖曳，拖曳仍可完成 ─────
{
  const { ctx, page, errors } = await session('ios', 'denied');
  await toShake(page, '搖測蘋果拒' + Date.now());
  await page.getByRole('button', { name: /搖手機的方式搖/ }).click();
  await page.waitForTimeout(300);
  const note = await page.locator('.note').first().innerText().catch(() => '');
  check(/拖曳/.test(note), `iOS 拒絕：出現不卡關的提示「${note}」`);
  check((await page.locator('.shake-allow').count()) === 0, 'iOS 拒絕：授權鈕收起來，不糾纏');
  await page.screenshot({ path: 'shots/s3-ios-denied.png' });
  const sb = await page.locator('.stage').boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 24; i++) await page.mouse.move(sb.x + sb.width / 2 + (i % 2 ? 90 : -90), sb.y + sb.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.getByRole('button', { name: '擲筊' }).waitFor({ timeout: 5000 }).then(() => ok('iOS 拒絕：用手指拖曳仍能完成'), () => bad('iOS 拒絕：拖曳之後沒進到擲筊'));
  check(errors.length === 0, 'iOS 拒絕：沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── F. 完全沒有 DeviceMotionEvent：不報錯、不出現授權鈕、拖曳可用 ─────
{
  const { ctx, page, errors } = await session('none');
  await toShake(page, '搖測無感測' + Date.now());
  await page.waitForTimeout(500);
  check((await page.locator('.shake-allow').count()) === 0, '沒有 DeviceMotion：不出現授權鈕');
  check(errors.length === 0, '沒有 DeviceMotion：沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

await browser.close();
stop();
console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
process.exit(failed ? 1 : 0);
