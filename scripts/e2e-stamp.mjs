// 蓋指印／印章的真實瀏覽器測試（桌機 Edge、390x844）。
// 用 Math.random 固定抽到哪一種手印（只在按「就是我」那一刻固定，因為手印在名字確定後才抽）。
// 用法：node scripts/with-preview.mjs scripts/e2e-stamp.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:4173/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync('shots', { recursive: true });
let failed = 0;
const ok = (m) => console.log('✓ ' + m);
const bad = (m) => { failed++; console.log('✗ ' + m); };
const check = (c, m) => (c ? ok(m) : bad(m));

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

const KINDS = { finger: 0.2, seal: 0.5, cat: 0.78, dog: 0.95 };

/** 走到蓋手印頁。vibrate：'android' 會記錄 navigator.vibrate 的呼叫；'none' 則刪掉 vibrate（像 iPhone） */
async function toStamp(kind, { name = '王小明', vibrate = 'android' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'zh-TW' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/functions/v1/count', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }));
  await page.addInitScript((mode) => {
    window.__vib = [];
    if (mode === 'android') navigator.vibrate = (p) => { window.__vib.push(p); return true; };
    else { try { delete Navigator.prototype.vibrate; } catch { /* 刪不掉就算了 */ } try { navigator.vibrate = undefined; } catch { /* 同上 */ } }
    // 記錄「畫面微震」：buzz() 會替 #root 加上 jolt 這個 class
    window.__jolt = 0;
    new MutationObserver(() => { if (document.getElementById('root')?.classList.contains('jolt')) window.__jolt++; })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }, vibrate);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /進廟求籤/ }).click();
  await page.getByLabel('你的名字或暱稱').fill(name);
  await page.evaluate((v) => { window.__orig = Math.random; Math.random = () => v; }, KINDS[kind]);
  await page.getByRole('button', { name: '就是我' }).click();
  await page.evaluate(() => { Math.random = window.__orig; });
  await page.locator('.topic').first().click();
  await page.locator('.pain').first().click();
  await page.locator('.stampzone').waitFor();
  await settle(page);
  return { ctx, page, errors };
}
/** 等進場動畫跑完再量位置（不寫死等待時間；會一直循環的動畫，像「按在這裡」的呼吸，不等） */
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
const zoneBox = (page) => page.locator('.stampzone').boundingBox();
const press = async (page, fx = 0.5, fy = 0.5) => {
  const z = await zoneBox(page);
  await page.mouse.move(z.x + z.width * fx, z.y + z.height * fy);
  await page.mouse.down();
  return z;
};
const litAt = (page) => page.evaluate(() => {
  const s = document.querySelector('.scan');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, lit: [...s.querySelectorAll('.scan-lit')].filter((e) => parseFloat(getComputedStyle(e).strokeDashoffset) < 0.999).length, all: s.querySelectorAll('.scan-lit').length };
});

// ───── A. 指印：標題、框與四角、按在哪裡就在哪裡亮、一圈一圈、按滿蓋好 ─────
{
  const { ctx, page, errors } = await toStamp('finger');
  check((await page.locator('h2').innerText()) === '蓋個指印', 'A. 標題是「蓋個指印」');
  check((await page.locator('.inkpad, .ring').count()) === 0, 'A. 沒有紅印泥了');
  check((await page.locator('.stampzone .corner').count()) === 4, 'A. 蓋章區四個角都有標示');
  const z = await zoneBox(page);
  check(z.height >= 200 && z.width >= 300, `A. 蓋章區夠大（${Math.round(z.width)}×${Math.round(z.height)}）`);
  await page.screenshot({ path: 'shots/st-A0-idle.png' });

  // 按在偏左上的位置：掃描圖示要在手指下，而不是固定在正中央
  await press(page, 0.28, 0.35);
  await page.waitForTimeout(250);
  const a = await litAt(page);
  const tx = z.x + z.width * 0.28, ty = z.y + z.height * 0.35;
  check(a && Math.abs(a.cx - tx) < 3 && Math.abs(a.cy - ty) < 3, `A. 指紋出現在按下的位置（差 ${a ? Math.round(Math.hypot(a.cx - tx, a.cy - ty)) : '?'}px）`);
  const early = a?.lit ?? 0;
  await page.waitForTimeout(350);
  const mid = (await litAt(page))?.lit ?? 0;
  check(early > 0 && mid > early && mid < (a?.all ?? 0), `A. 線條一段一段亮起（${early} → ${mid} / ${a?.all} 圈）`);
  await page.waitForTimeout(550);
  await page.mouse.up();
  await page.locator('.signed.on').waitFor({ timeout: 2000 });
  const s = await page.locator('.signed').boundingBox();
  check(Math.abs(s.x + s.width / 2 - tx) < 12 && Math.abs(s.y + s.height / 2 - ty) < 12, 'A. 蓋好的指印也在按下的位置');
  check((await page.locator('.sub').first().innerText()) === '登記完成。', 'A. 蓋好後顯示「登記完成。」');
  await page.locator('.cyl').waitFor({ timeout: 4000 });
  ok('A. 蓋完自動進到搖籤');
  check(errors.length === 0, 'A. 沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── B. 沒按滿：出現「按久一點」，可以再按；按滿才算 ─────
{
  const { ctx, page } = await toStamp('finger');
  await press(page);
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(150);
  check((await page.locator('.sub').first().innerText()) === '按久一點', 'B. 沒按滿：上方提示「按久一點」');
  check((await page.locator('.zone-tip').innerText()) === '按久一點', 'B. 沒按滿：框裡也提示「按久一點」');
  check((await page.locator('.scan').count()) === 0 && (await page.locator('.signed').count()) === 0, 'B. 沒按滿：不會留下指紋或手印');
  await page.screenshot({ path: 'shots/st-B-short.png' });
  await press(page);
  await page.waitForTimeout(150);
  check((await page.locator('.sub').first().innerText()) !== '按久一點', 'B. 再按一次：提示消失');
  await page.waitForTimeout(950);
  await page.mouse.up();
  await page.locator('.cyl').waitFor({ timeout: 4000 }).then(() => ok('B. 再按滿 1 秒就完成'), () => bad('B. 再按滿之後沒進到搖籤'));
  await ctx.close();
}

// ───── C. 印章：標題、先描框再亮字、蓋好刻的是名字 ─────
{
  const { ctx, page, errors } = await toStamp('seal', { name: '陳大文Amy' });
  check((await page.locator('h2').innerText()) === '蓋個印章', 'C. 標題是「蓋個印章」');
  check(/印章/.test(await page.locator('.sub').first().innerText()), 'C. 提示是蓋印章');
  await press(page, 0.7, 0.6);
  await page.waitForTimeout(450);
  const mid = await page.evaluate(() => [...document.querySelectorAll('.scan-char')].map((e) => ({ t: e.textContent, o: parseFloat(e.style.opacity) })));
  check(mid.map((m) => m.t).join('') === '陳大文', `C. 印章刻的是名字的漢字，英文略過（${mid.map((m) => m.t).join('')}）`);
  check(mid[0].o > mid[mid.length - 1].o, `C. 字是一個接一個亮的（${mid.map((m) => m.o.toFixed(2)).join('、')}）`);
  await page.screenshot({ path: 'shots/st-C-seal-mid.png' });
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.locator('.signed.on').waitFor({ timeout: 2000 });
  check((await page.locator('.signed').getAttribute('alt')) === '印章', 'C. 蓋好的是印章');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/st-C-seal-done.png' });
  check(errors.length === 0, 'C. 沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── D. 名字沒有漢字：不會抽到印章，改蓋指印 ─────
{
  const { ctx, page } = await toStamp('seal', { name: 'Amy007' });
  check((await page.locator('h2').innerText()) === '蓋個指印', 'D. 純英文數字的名字：抽到印章的機會改成指印');
  await ctx.close();
}

// ───── E. 貓掌、狗掌：標題仍是「蓋個指印」，蓋好在正中央並寫「代為簽收」 ─────
for (const [kind, who] of [['cat', '胖橘代為簽收'], ['dog', '旺財代為簽收']]) {
  const { ctx, page } = await toStamp(kind);
  check((await page.locator('h2').innerText()) === '蓋個指印', `E. ${kind}：你按的是指印（標題「蓋個指印」）`);
  await press(page, 0.2, 0.25); // 故意按在角落：掃描的指紋在按下處
  await page.waitForTimeout(300);
  check((await page.locator('.scan').count()) === 1, `E. ${kind}：按住時一樣有指紋掃描動畫`);
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.locator('.signed.on').waitFor({ timeout: 2000 });
  await page.waitForTimeout(800);
  const z = await zoneBox(page), s = await page.locator('.signed').boundingBox();
  check(Math.abs(s.x + s.width / 2 - (z.x + z.width / 2)) < 12 && Math.abs(s.y + s.height / 2 - (z.y + z.height / 2)) < 12, `E. ${kind}：蓋在框的正中央（不是按下處）`);
  check((await page.locator('.proxy-cap').innerText()) === who, `E. ${kind}：寫著「${who}」`);
  await page.screenshot({ path: `shots/st-E-${kind}.png` });
  await ctx.close();
}

// ───── F. 震動：Android 會震；iPhone（沒有 vibrate）不震、而且完全沒有畫面微震 ─────
{
  const { ctx, page } = await toStamp('finger', { vibrate: 'android' });
  await press(page);
  await page.waitForTimeout(1250);
  await page.mouse.up();
  const vib = await page.evaluate(() => window.__vib);
  check(vib.length >= 2, `F. Android：按住的過程有震動（${vib.length} 次：${JSON.stringify(vib)}）`);
  check((await page.evaluate(() => window.__jolt)) === 0, 'F. Android：手印這一步沒有畫面微震');
  await ctx.close();
}
{
  const { ctx, page, errors } = await toStamp('finger', { vibrate: 'none' });
  check((await page.evaluate(() => typeof navigator.vibrate)) !== 'function', 'F. 模擬 iPhone：沒有 navigator.vibrate');
  await press(page);
  await page.waitForTimeout(1250);
  await page.mouse.up();
  await page.locator('.signed.on').waitFor({ timeout: 2000 });
  check((await page.evaluate(() => window.__jolt)) === 0, 'F. iPhone：沒有畫面微震');
  check(errors.length === 0, 'F. iPhone：沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── G. 減少動畫：照樣能蓋完（不靠動畫等待） ─────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true, locale: 'zh-TW' });
  const page = await ctx.newPage();
  await page.route('**/functions/v1/count', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /進廟求籤/ }).click();
  await page.getByLabel('你的名字或暱稱').fill('減動畫');
  await page.getByRole('button', { name: '就是我' }).click();
  await page.locator('.topic').first().click();
  await page.locator('.pain').first().click();
  await press(page);
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.locator('.cyl').waitFor({ timeout: 4000 }).then(() => ok('G. 減少動畫模式：仍然能蓋完、進到搖籤'), () => bad('G. 減少動畫模式：蓋不完'));
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
process.exit(failed ? 1 : 0);
