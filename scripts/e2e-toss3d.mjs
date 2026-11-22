// 3D 擲筊的真實瀏覽器測試（桌機 Edge、390x844，無頭模式用軟體 WebGL）。
// 自己啟動並關閉 vite preview。用法：npm run build && node scripts/e2e-toss3d.mjs
// 驗證重點：(1) three 只在擲筊頁才下載 (2) 3D 能畫出來（看截圖）(3) 退回 2D 的三種情況 (4) 結果與畫面一致 (5) 全程沒有 JS 錯誤
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4176;
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

const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function open({ reduce = false, blockScene = false, noWebgl = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'zh-TW', reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  const reqs = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase\.co|Failed to load resource|Error creating WebGL context/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('request', (r) => reqs.push(r.url()));
  await page.route('**/functions/v1/count', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }));
  if (blockScene) await page.route('**/jiaobei-scene-*.js', (r) => r.abort('failed'));
  if (noWebgl) await page.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(String(t)) ? null : g.call(this, t, ...a); }; });
  return { ctx, page, errors, reqs };
}

async function toToss(page, name) {
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
  const st = page.locator('.stage');
  await st.waitFor();
  const s = await st.boundingBox();
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 24; i++) await page.mouse.move(s.x + s.width / 2 + (i % 2 ? 90 : -90), s.y + s.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.getByRole('button', { name: /擲筊|再擲一次/ }).waitFor({ timeout: 6000 });
}

const sceneReq = (reqs) => reqs.filter((u) => /jiaobei-scene-.*\.js/.test(u));
/**
 * 畫布區域截圖後，數有多少像素是「筊杯的紅橘色」，並回傳重心（單位＝畫布寬高的 %）。
 * 用截圖量，因為 WebGL 預設繪製後會清掉緩衝區，readPixels 讀不到。
 * 沒有 PNG 解碼套件，所以把截圖丟回瀏覽器的 2D canvas 去讀像素。
 */
const shootCanvas = async (page) => page.screenshot({ clip: await page.locator('.toss-canvas').boundingBox() });
const paintedPixels = async (page, shot) => {
  const b64 = (shot ?? (await shootCanvas(page))).toString('base64');
  const probe = await page.context().newPage();
  try {
    const r = await probe.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      // 背景是深棕漸層；筊杯是紅橘（R 高、R-G 大）。陰影比背景更暗，不會被算進去
      let n = 0, sx = 0, sy = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
        const i = (y * c.width + x) * 4;
        if (d[i] > 110 && d[i] - d[i + 1] > 50) { n++; sx += x; sy += y; }
      }
      return { n, cx: n ? Math.round((sx / n / c.width) * 100) : null, cy: n ? Math.round((sy / n / c.height) * 100) : null };
    }, b64);
    paintedPixels.centroid = r.n ? [r.cx, r.cy] : null;
    return r.n;
  } finally {
    await probe.close();
  }
};

// ───── A. 3D：進頁面才下載 three、能擲出、落地、判定一致 ─────
{
  const { ctx, page, errors, reqs } = await open();
  // 先確認「前面幾頁」沒有碰 three
  await page.goto(URL, { waitUntil: 'networkidle' });
  check(sceneReq(reqs).length === 0, '首頁沒有下載 three（jiaobei-scene 還沒被要）');
  await toToss(page, '擲測三維甲' + Date.now());
  await page.waitForFunction(() => document.querySelector('.toss-canvas')?.dataset.gl !== 'loading', null, { timeout: 15000 });
  const gl = await page.locator('.toss-canvas').getAttribute('data-gl');
  check(sceneReq(reqs).length === 1, `進到擲筊頁才下載 three（請求 ${sceneReq(reqs).length} 次）`);
  check(gl === 'ready', `3D 場景建立成功（data-gl=${gl}）`);
  if (gl === 'ready') {
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/t1-ready.png' });
    const before = await paintedPixels(page);
    check(before > 500, `待機時畫布有畫出東西（${before} 個不透明像素）`);
    check((await page.locator('.blocks').count()) === 0, '3D 可用時不顯示 2D 的筊杯');
    const cvBox = await page.locator('.toss-canvas').boundingBox();
    check(cvBox.height >= 300 && cvBox.width >= 340, `畫布尺寸合理（${Math.round(cvBox.width)}×${Math.round(cvBox.height)}）`);

    const btn = page.getByRole('button', { name: /擲筊|再擲一次/ });
    await btn.click();
    check((await page.getByRole('button', { name: '擲出去了……' }).count()) === 1, '擲出時按鈕變成「擲出去了……」且不能重複點');
    await page.waitForTimeout(450);
    await page.screenshot({ path: 'shots/t2-flying.png' });
    // 判定文字一出現就立刻截圖並讀文字（聖筊／陰筊會在 1.1～1.5 秒後自動換頁，分析要放在後面）
    await page.waitForFunction(() => document.querySelector('.verdict')?.textContent.trim(), null, { timeout: 6000 });
    const landedShot = await shootCanvas(page);
    const verdict = (await page.locator('.verdict').innerText().catch(() => '')).trim();
    await page.screenshot({ path: 'shots/t3-landed.png' }).catch(() => {});
    const after = await paintedPixels(page, landedShot);
    check(after > 500, `落地後畫布有畫出東西（${after} 個不透明像素）`);
    check(/聖筊|笑筊|陰筊/.test(verdict), `揭曉判定：「${verdict}」`);
  }
  // 不論判定是什麼，最後要能走到籤卡（笑筊要再擲）
  for (let i = 0; i < 3; i++) {
    if (await page.locator('.cardimg, .cardskel').count()) break;
    const again = page.getByRole('button', { name: '再擲一次' });
    if (await again.isVisible().catch(() => false)) { await again.click(); await page.waitForTimeout(2300); } else await page.waitForTimeout(1800);
  }
  await page.locator('.cardimg').waitFor({ timeout: 15000 }).then(() => ok('擲完之後走到籤卡'), () => bad('擲完沒有走到籤卡'));
  check(errors.length === 0, '3D 路線沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── B. 連擲多次：落點每次不同 ─────
{
  const { ctx, page, errors } = await open();
  await toToss(page, '擲測落點' + Date.now());
  await page.waitForFunction(() => document.querySelector('.toss-canvas')?.dataset.gl !== 'loading', null, { timeout: 15000 });
  if ((await page.locator('.toss-canvas').getAttribute('data-gl')) === 'ready') {
    const spots = [];
    for (let i = 0; i < 2; i++) {
      const b = page.getByRole('button', { name: /^擲筊$|再擲一次/ });
      if (!(await b.isVisible().catch(() => false)) || (await b.isDisabled())) break;
      await b.click();
      await page.waitForTimeout(2600);
      if ((await paintedPixels(page)) > 0) spots.push(paintedPixels.centroid);
      await page.screenshot({ path: `shots/t5-throw-${i + 1}.png` });
    }
    console.log('  （各次落地後筊杯重心，單位＝畫布寬高的 %：' + JSON.stringify(spots) + '）');
    if (spots.length === 2) check(Math.hypot(spots[0][0] - spots[1][0], spots[0][1] - spots[1][1]) > 3, '連擲兩次，落點不同');
    else console.log('  （第一次不是笑筊，所以只擲了一次；落點變化由 vitest 的 5000 個 seed 掃描保證）');
  }
  check(errors.length === 0, '連擲沒有 JS 錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

// ───── C. 三種「退回 2D」的情況：載入失敗、沒有 WebGL、使用者要求減少動畫 ─────
for (const [label, opt] of [['three 載入失敗', { blockScene: true }], ['沒有 WebGL', { noWebgl: true }], ['使用者要求減少動畫', { reduce: true }]]) {
  const { ctx, page, errors, reqs } = await open(opt);
  await toToss(page, '擲測退回' + label + Date.now());
  await page.waitForFunction(() => document.querySelector('.toss-canvas')?.dataset.gl !== 'loading', null, { timeout: 15000 });
  const gl = await page.locator('.toss-canvas').getAttribute('data-gl');
  check(gl === 'off', `${label}：退回 2D（data-gl=${gl}）`);
  check((await page.locator('.blocks .block').count()) === 2, `${label}：顯示 2D 的兩個筊杯`);
  if (opt.reduce) check(sceneReq(reqs).length === 0, `${label}：連 three 都不下載`);
  await page.screenshot({ path: `shots/t4-fallback-${Object.keys(opt)[0]}.png` });
  for (let i = 0; i < 3; i++) {
    if (await page.locator('.cardimg').count()) break;
    const b = page.getByRole('button', { name: /^擲筊$|再擲一次/ });
    if (await b.isVisible().catch(() => false)) await b.click();
    await page.waitForTimeout(2400);
  }
  await page.locator('.cardimg').waitFor({ timeout: 15000 }).then(() => ok(`${label}：2D 版仍能走到籤卡`), () => bad(`${label}：沒走到籤卡`));
  check(errors.length === 0, `${label}：沒有 JS 錯誤` + (errors.length ? '：' + errors.join(' | ') : ''));
  await ctx.close();
}

await browser.close();
stop();
console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
process.exit(failed ? 1 : 0);
