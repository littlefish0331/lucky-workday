// 投票（有感／沒感）的真實瀏覽器測試。用法：先 `npm run build && npx vite preview --port 4173`，再 `node scripts/e2e-vote.mjs`
// 所有送往 Supabase 的請求都被攔下來、不會真的送出，所以不會污染線上的計數與票數。
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://127.0.0.1:4173/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
mkdirSync('shots', { recursive: true });
let failed = 0;
const ok = (m) => console.log('✓ ' + m);
const bad = (m) => { failed++; console.log('✗ ' + m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));

/** 一個全新的 context = 全新的 localStorage。mode：'ok' 正常回應、'down' 讓 Supabase 全部失敗 */
async function session(mode) {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'zh-TW' });
  const page = await ctx.newPage();
  const sent = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('**/functions/v1/count', async (route) => {
    const body = route.request().postDataJSON?.() ?? null;
    sent.push(body);
    if (mode === 'down') return route.abort('failed');
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, today: 3, total: 3, knocks: 0 }) });
  });
  return { browser, page, sent, errors };
}

/** 走完整個儀式，停在「可以投票」的籤卡（凶籤就選認命） */
async function reachCard(page, name) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /進廟求籤|看今天的籤/ }).click();
  await page.getByLabel('你的名字或暱稱').fill(name);
  await page.getByRole('button', { name: '就是我' }).click();
  await page.locator('.topic').first().click();
  await page.locator('.pain').first().click();
  const pad = page.locator('.stampzone');
  await pad.waitFor();
  const box = await pad.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1400);
  await page.mouse.up();
  await page.locator('.cyl').waitFor({ timeout: 4000 });
  const sb = await page.locator('.stage').boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 24; i++) await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 + (i % 2 ? 90 : -90), { steps: 3 });
  await page.mouse.up();
  await page.getByRole('button', { name: '擲筊' }).waitFor({ timeout: 5000 });
  for (let i = 0; i < 3; i++) {
    const b = page.getByRole('button', { name: /^擲筊$|再擲一次/ });
    await b.waitFor({ timeout: 8000 });
    await b.click();
    const next = await Promise.race([
      page.locator('.cardimg, .cardskel').first().waitFor({ timeout: 9000 }).then(() => 'card'),
      page.getByRole('button', { name: '再擲一次' }).waitFor({ timeout: 9000 }).then(() => 'again'),
    ]).catch(() => 'none');
    if (next !== 'again') break;
  }
  await page.locator('.cardimg').waitFor({ timeout: 15000 });
  // 凶籤：先擋在「重抽／認命」之前，投票鈕不該出現
  const reroll = page.getByRole('button', { name: /敲木魚積功德/ });
  if (await reroll.count()) {
    check((await page.locator('.vote').count()) === 0, '凶籤還在「重抽或認命」時，不顯示投票');
    await page.getByRole('button', { name: /認命/ }).click();
    await page.waitForTimeout(400);
  }
  await page.locator('.vote').waitFor();
}

const votesIn = (sent) => sent.filter((b) => b?.action === 'vote');

// ───── 1. 有感：回應句、送出的內容、不能改票、重新整理後還在 ─────
{
  const { browser, page, sent, errors } = await session('ok');
  await reachCard(page, '投票測試甲' + Date.now());
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/v1-before.png' });
  check((await page.getByRole('button', { name: '有感' }).count()) === 1 && (await page.getByRole('button', { name: '沒感' }).count()) === 1, '籤卡下方有「有感／沒感」兩顆鈕');
  const sizes = await page.evaluate(() => [...document.querySelectorAll('.vote button')].map((b) => Math.round(b.getBoundingClientRect().height)));
  check(sizes.every((h) => h >= 48), `投票鈕高度 ≥ 48px（${sizes.join('、')}）`);

  const imgBefore = await page.locator('.cardimg').getAttribute('src');
  await page.getByRole('button', { name: '有感' }).click();
  await page.locator('.vote.done').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/v2-after-up.png' });
  const said = await page.locator('.vote.done').innerText();
  check(/績效伯伯|發薪婆婆|旺財|胖橘/.test(said), `出現神明的回應：${said.replace(/\s+/g, ' ')}`);
  check((await page.locator('.vote button').count()) === 0, '投完之後投票鈕消失（不能改票）');
  check((await page.locator('.cardimg').getAttribute('src')) === imgBefore, '籤卡存圖沒有被投票改動（投票區在圖外面）');
  const v = votesIn(sent);
  check(v.length === 1 && v[0].v === 'up' && /^[0-9a-f]{8}$/.test(v[0].fid), `送出 1 筆 vote：${JSON.stringify(v[0])}`);
  check(!JSON.stringify(v).includes('投票測試'), '送出的內容不含玩家名字');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /看今天的籤/ }).click();
  await page.locator('.cardimg').waitFor();
  await page.locator('.vote.done').waitFor({ timeout: 3000 }).then(() => ok('重新整理後仍顯示已投票的回應'), () => bad('重新整理後投票狀態不見了'));
  check(votesIn(sent).length === 1, '重新整理後沒有再送一次票');
  const fs = await page.evaluate(() => [...document.querySelectorAll('.vote *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  check(fs.every((s) => s >= 14), `投票區文字皆 ≥ 14px（${[...new Set(fs)].join('、')}）`);
  check(errors.length === 0, 'JS 沒有錯誤' + (errors.length ? '：' + errors.join(' | ') : ''));
  await browser.close();
}

// ───── 2. 沒感 ─────
{
  const { browser, page, sent } = await session('ok');
  await reachCard(page, '投票測試乙' + Date.now());
  await page.getByRole('button', { name: '沒感' }).click();
  await page.locator('.vote.done').waitFor();
  await page.screenshot({ path: 'shots/v3-after-down.png' });
  const v = votesIn(sent);
  check(v.length === 1 && v[0].v === 'down', `沒感：送出 ${JSON.stringify(v[0])}`);
  await browser.close();
}

// ───── 3. 伺服器掛掉：照樣顯示回應，遊戲不受影響 ─────
{
  const { browser, page, sent, errors } = await session('down');
  await reachCard(page, '投票測試丙' + Date.now());
  await page.getByRole('button', { name: '有感' }).click();
  await page.locator('.vote.done').waitFor({ timeout: 3000 }).then(() => ok('Supabase 全部失敗時，神明照樣回應'), () => bad('伺服器失敗時沒有顯示回應'));
  check(votesIn(sent).length === 1, '有嘗試送出（失敗被靜默吞掉）');
  check((await page.locator('.cardimg').count()) === 1, '籤卡仍然正常');
  check(errors.length === 0, '伺服器失敗時沒有 JS 例外' + (errors.length ? '：' + errors.join(' | ') : ''));
  await browser.close();
}

console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
process.exitCode = failed ? 1 : 0;
