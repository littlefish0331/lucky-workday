// 籤卡上的手印：指印、印章（刻名字）、貓掌、狗掌，以及「舊紀錄的掌印」，各畫一張 1080×1920 的籤卡檢查。
// 要用 vite dev server（preview 沒有 /src 可以 import）。這支腳本自己啟動 dev server（前景子程序、跑完自己結束），
// 所以直接跑：node scripts/e2e-stamp-card.mjs
// 圖存在 shots/stamp-card/，要用眼睛看一遍：像素數只能證明有紅色墨跡，不能證明長得對。
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const PORT = 5198;
const URL = `http://127.0.0.1:${PORT}/`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync('shots/stamp-card', { recursive: true });
let failed = 0;
const ok = (m) => console.log('✓ ' + m);
const bad = (m) => { failed++; console.log('✗ ' + m); };
const check = (c, m) => (c ? ok(m) : bad(m));

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* 已結束 */ } };
process.on('exit', stop);
for (let i = 0; i < 80; i++) {
  if (await fetch(URL).then((r) => r.ok).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 250));
  if (i === 79) { bad('dev server 沒有起來'); stop(); process.exit(1); }
}

const F = JSON.parse(readFileSync('src/data/fortunes.generated.json', 'utf8'));
const good = F.find((f) => f.level === '吉');
const badF = F.find((f) => f.level === '小凶');

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('requestfailed', (r) => { if (/stamp-|\.webp|\.woff/.test(r.url())) errs.push('requestfailed ' + r.url()); });
const notFound = [];
page.on('response', (r) => { if (r.status() === 404) notFound.push(r.url()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const cases = [
  ['finger', { kind: 'finger', idx: 1, rot: 10, scale: 1.05 }, good, '指印'],
  ['seal4', { kind: 'seal', idx: 0, rot: -8, scale: 1.0, text: '王小明陳' }, good, '印章（4 字）'],
  ['seal2', { kind: 'seal', idx: 0, rot: 12, scale: 1.1, text: '小明' }, badF, '印章（2 字，凶籤）'],
  ['seal1', { kind: 'seal', idx: 0, rot: 0, scale: 0.95, text: '明' }, good, '印章（1 字）'],
  ['cat', { kind: 'cat', idx: 0, rot: -12, scale: 1.0 }, good, '貓掌（胖橘代為簽收）'],
  ['dog', { kind: 'dog', idx: 1, rot: 8, scale: 1.1 }, badF, '狗掌（旺財代為簽收，凶籤）'],
  ['palm-old', { kind: 'palm', idx: 0, rot: 12, scale: 1.1 }, good, '舊紀錄的掌印（不再抽出，但要能顯示）'],
];

const results = await page.evaluate(async ({ cases }) => {
  const { drawCard } = await import('/src/lib/card.ts');
  const out = [];
  for (const [key, stamp, f] of cases) {
    const r = {
      name: '王小明', date: '2026-11-23', pain: '下班訊息', topic: f.topic, stamp, fortuneId: f.id,
      snap: { no: f.no, eye: f.eye, body: f.body, tip: f.tip }, level: f.level, outcome: 'direct', hao: '明・全員待命受難者', at: 1,
    };
    const cv = await drawCard(r);
    // 手印區的像素：在 (790, baseY+100) 附近。只量「有沒有紅色墨跡」，不依賴 baseY：掃整張卡右下三分之一
    const ctx = cv.getContext('2d');
    const x0 = 560, y0 = 1250, w = 460, h = 520;
    const d = ctx.getImageData(x0, y0, w, h).data;
    let red = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90) red++;
    out.push({ key, w: cv.width, h: cv.height, red, png: cv.toDataURL('image/jpeg', 0.85) });
  }
  return out;
}, { cases });

for (const r of results) {
  writeFileSync(`shots/stamp-card/${r.key}.jpg`, Buffer.from(r.png.split(',')[1], 'base64'));
  const [, , , label] = cases.find((c) => c[0] === r.key);
  check(r.w === 1080 && r.h === 1920, `${label}：籤卡畫出來是 1080×1920`);
  check(r.red > 800, `${label}：手印區有紅色墨跡（${r.red} 像素）`);
}
check(!notFound.some((u) => /stamp-seal/.test(u)), '印章沒有去要一張不存在的圖（沒有 stamp-seal-* 的 404）');
check(errs.length === 0, '沒有頁面錯誤與資源失敗' + (errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''));

await browser.close();
stop();
console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
process.exit(failed ? 1 : 0);
