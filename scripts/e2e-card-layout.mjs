// 籤卡排版壓力測試：用真實籤池裡「最長」的籤，每個等級各挑，在真實瀏覽器裡畫成 1080x1920，
// 量測內文有沒有壓到底部資訊區，並把最差的幾張存成圖給人眼檢查。
// 做法：開 vite preview 的頁面，在頁面裡動態 import 模組（vite dev 才有；preview 沒有，所以用 dev server）。
// 用法：npx vite --port 5199 --host 127.0.0.1 &  然後  node scripts/e2e-card-layout.mjs
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:5199/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync('shots/layout', { recursive: true });
const F = JSON.parse(readFileSync('src/data/fortunes.generated.json', 'utf8'));
const LV = ['上上籤', '大吉', '吉', '小吉', '小凶', '凶', '大凶', '下下籤'];
const weight = (f) => [...f.eye].length * 3 + f.body.reduce((a, l) => a + [...l].length, 0) + f.body.length * 8 + [...f.tip].length;
const picks = [];
for (const lv of LV) picks.push(...F.filter((f) => f.level === lv).sort((a, b) => weight(b) - weight(a)).slice(0, 4));
// 再加上不同籤型各一張最長的
for (const st of ['quote', 'notice', 'dialogue', 'checklist', 'murmur', 'yiji']) picks.push(F.filter((f) => f.style === st).sort((a, b) => weight(b) - weight(a))[0]);

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL, { waitUntil: 'networkidle' });

const rows = await page.evaluate(async (items) => {
  const { drawCard, layoutOf } = await import('/src/lib/card.ts');
  const out = [];
  for (const f of items) {
    for (const outcome of ['direct', 'resolved']) {
      const r = {
        name: '王小明二三四五', date: '2026-11-21', pain: '永遠再微調永遠', topic: f.topic,
        stamp: { kind: 'palm', idx: 0, rot: 12, scale: 1.1 }, fortuneId: f.id,
        snap: { no: f.no, eye: f.eye, body: f.body, tip: f.tip }, level: f.level,
        outcome, knocks: 36, resolveTip: '買一個平常不敢買的小零食', hao: '明・全員待命受難者', at: 1,
      };
      const cv = await drawCard(r);
      const L = layoutOf.get(cv);
      out.push({ id: f.id, level: f.level, style: f.style, outcome, eyeLen: [...f.eye].length, ...L, png: outcome === 'resolved' ? cv.toDataURL('image/jpeg', 0.8) : null });
    }
  }
  return out;
}, picks);

let worst = null, fail = 0;
for (const r of rows) {
  const gap = r.infoTop - Math.max(r.contentEnd, r.outcome === 'resolved' ? r.noteY : 0);
  r.gap = gap;
  if (!worst || gap < worst.gap) worst = r;
  if (gap < 20) { fail++; console.log(`✗ 內容壓到資訊區（間距 ${gap}px）：${r.level}／${r.style}／${r.outcome}／eye ${r.eyeLen} 字／${r.id}`); }
}
const worstRows = [...rows].sort((a, b) => a.gap - b.gap).slice(0, 4);
worstRows.forEach((r, i) => r.png && writeFileSync(`shots/layout/worst-${i + 1}.jpg`, Buffer.from(r.png.split(',')[1], 'base64')));
console.log(`量測 ${rows.length} 張（${picks.length} 籤 × 2 種結局）。最小間距 ${worst.gap}px（${worst.level}／${worst.style}／${worst.outcome}）`);
console.log(fail ? `\n${fail} 張排版有問題` : '\n全部排版合格（內容與資訊區至少隔 20px）');
if (errs.length) console.log('頁面錯誤：', errs[0]);
await browser.close();
process.exitCode = fail || errs.length ? 1 : 0;
