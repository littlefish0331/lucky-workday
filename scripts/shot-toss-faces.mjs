// 目視用：強制擲出聖／笑／陰三種結果，各截一張落地後的畫面，拼成一張圖（shots/toss-faces.png）。
// 用來確認「判定」和「畫面上朝上的那一面」一致。固定 Math.random 來決定結果：<0.75 聖、<0.97 笑、其餘陰。
// 用法：npm run build && node scripts/with-preview.mjs scripts/shot-toss-faces.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:4177/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const warnings = [];

for (const [name, r] of [['sheng', 0.1], ['xiao', 0.8], ['yin', 0.99]]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'zh-TW' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(`[${name}] ${m.type()}: ${m.text().slice(0, 160)}`); });
  await page.route('**/functions/v1/count', (x) => x.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }));
  await page.addInitScript((r) => { Math.random = () => r; }, r);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /進廟求籤|看今天的籤/ }).click();
  await page.getByLabel('你的名字或暱稱').fill('驗面' + name + Date.now());
  await page.getByRole('button', { name: '就是我' }).click();
  await page.locator('.pain').first().click();
  const pad = page.locator('.inkpad'); await pad.waitFor();
  const b = await pad.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(1400); await page.mouse.up();
  const st = page.locator('.stage'); await st.waitFor();
  const s = await st.boundingBox();
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2); await page.mouse.down();
  for (let i = 0; i < 24; i++) await page.mouse.move(s.x + s.width / 2 + (i % 2 ? 90 : -90), s.y + s.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.getByRole('button', { name: /^擲筊$/ }).waitFor({ timeout: 6000 });
  await page.waitForFunction(() => document.querySelector('.toss-canvas')?.dataset.gl === 'ready', null, { timeout: 15000 });
  await page.getByRole('button', { name: /^擲筊$/ }).click();
  await page.waitForFunction(() => document.querySelector('.verdict')?.textContent.trim(), null, { timeout: 6000 }); // 等判定文字出現（動畫 1330ms + 250ms）
  await page.waitForTimeout(120);
  const box = await page.locator('.toss-canvas').boundingBox();
  await page.screenshot({ path: `shots/face-${name}.png`, clip: { x: box.x, y: box.y + 20, width: box.width, height: box.height - 20 } });
  console.log(name, '→ 畫面判定文字：', (await page.locator('.verdict').innerText()).trim());
  await ctx.close();
}
await browser.close();
console.log(warnings.length ? '主控台警告／錯誤：\n  ' + [...new Set(warnings)].join('\n  ') : '主控台沒有警告');
