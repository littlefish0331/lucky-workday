#!/usr/bin/env node
// 籤詩檢查器。用法：
//   node scripts/check-fortunes.mjs                      檢查 content/batches 全部
//   node scripts/check-fortunes.mjs --batch <檔>          只檢查一個批次
//   node scripts/check-fortunes.mjs --report              另外印出 等級×主題 矩陣與痛點覆蓋
// 有「錯誤」時結束碼為 1；「警告」只提醒，仍需處理到合理範圍。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['上上籤', '大吉', '吉', '小吉', '小凶', '凶', '大凶', '下下籤'];
const QUOTA = { 上上籤: 40, 大吉: 60, 吉: 75, 小吉: 75, 小凶: 75, 凶: 75, 大凶: 55, 下下籤: 45 };
const STYLES = ['quote', 'notice', 'dialogue', 'checklist', 'murmur', 'yiji'];
const STYLE_TARGET = { quote: 0.2, notice: 0.16, dialogue: 0.16, checklist: 0.14, murmur: 0.16, yiji: 0.18 };
const SEASONS = ['yearend', 'tailparty', 'newyear', 'cny', 'payday'];

const args = process.argv.slice(2);
const getArg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const batchFile = getArg('--batch');
const wantReport = args.includes('--report');

const pains = JSON.parse(readFileSync(join(ROOT, 'src/data/pains.json'), 'utf8'));
const TOPICS = Object.keys(pains.topics);
const painsByTopic = {};
for (const p of pains.pains) (painsByTopic[p.topic] ??= new Set()).add(p.label);

// ---------- 讀檔 ----------
const cards = [];
const dir = join(ROOT, 'content/batches');
const files = batchFile
  ? [resolve(process.cwd(), batchFile)]
  : existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f))
    : [];
for (const f of files) {
  let arr;
  try {
    arr = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    console.error(`✗ ${basename(f)} 不是合法 JSON：${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(arr)) {
    console.error(`✗ ${basename(f)} 最外層必須是陣列`);
    process.exit(1);
  }
  arr.forEach((c, i) => cards.push({ ...c, _src: `${basename(f)}#${i + 1}` }));
}

const errors = [];
const warns = [];
const E = (c, msg) => errors.push(`${c._src}  ${msg}`);
const W = (msg) => warns.push(msg);
const len = (s) => [...String(s)].length;

// ---------- 規則 ----------
const BANNED = [
  [/不是[^。\n]{0,20}而是/, '「不是…而是…」'],
  [/彷彿|宛如|猶如|好似/, '「彷彿／宛如／猶如／好似」'],
  [/救贖|修行|浪漫|治癒|儀式感|小確幸/, '雞湯詞（救贖／修行／浪漫／治癒／儀式感／小確幸）'],
  [/也是一種/, '「也是一種…」'],
  [/默默/, '「默默」'],
  [/總有一天|終將|或許這就是/, '昇華式結尾'],
  [/在這個.{0,8}的時代/, '「在這個…的時代」'],
  [/——/, '破折號「——」'],
  [/。。|…{2,}|\.{4,}/, '堆疊省略號或句號'],
];
const FORBIDDEN = [
  [/總統|立委|民進黨|國民黨|民眾黨|選舉|投票|罷免|兩岸|共軍|統獨|政黨|藍營|綠營/, '政治'],
  [/自殺|輕生|跳樓|想死|尋死|割腕|燒炭/, '自傷'],
  [/性騷|強暴|猥褻/, '性騷擾'],
];

function checkCard(c) {
  if (!LEVELS.includes(c.level)) E(c, `level「${c.level}」不合法`);
  if (!TOPICS.includes(c.topic)) E(c, `topic「${c.topic}」不合法`);
  else if (!painsByTopic[c.topic].has(c.pain)) E(c, `pain「${c.pain}」不在 ${c.topic} 的痛點清單`);
  if (!STYLES.includes(c.style)) E(c, `style「${c.style}」不合法`);
  if (c.season != null && !SEASONS.includes(c.season)) E(c, `season「${c.season}」不合法`);
  if (c.expires != null && !/^\d{4}-\d{2}-\d{2}$/.test(c.expires)) E(c, `expires「${c.expires}」格式需為 YYYY-MM-DD`);

  if (typeof c.eye !== 'string') return E(c, 'eye 必須是字串');
  const eyeLen = len(c.eye);
  if (eyeLen < 6 || eyeLen > 24) E(c, `eye 長度 ${eyeLen}（需 6–24）：${c.eye}`);
  if (!Array.isArray(c.body) || c.body.length < 1 || c.body.length > 4) return E(c, 'body 需為 1–4 行的陣列');
  let total = 0;
  c.body.forEach((ln, i) => {
    const n = len(ln);
    total += n;
    if (n > 22) E(c, `body 第 ${i + 1} 行長度 ${n}（≤22）：${ln}`);
  });
  if (total > 80) E(c, `body 合計 ${total} 字（≤80）`);
  if (typeof c.tip !== 'string' || !c.tip.trim()) E(c, 'tip 不可為空');
  else if (len(c.tip) > 28) E(c, `tip 長度 ${len(c.tip)}（≤28）：${c.tip}`);

  const text = [c.eye, ...c.body, c.tip].join('\n');
  for (const [re, label] of BANNED) if (re.test(text)) E(c, `禁用句型：${label}`);
  for (const [re, label] of FORBIDDEN) if (re.test(text)) E(c, `禁區內容（${label}）：${text.replace(/\n/g, ' ')}`);
  if (/[A-Za-z]{4,}.*[A-Za-z]{4,}.*[A-Za-z]{4,}/.test(c.eye)) W(`${c._src}  eye 英文太多，截圖時可能不好讀`);

  // 籤型專屬
  const bodyText = c.body.join('\n');
  if (c.style === 'quote' && !/^「/.test(c.eye)) E(c, 'quote 型 eye 需以「開頭');
  if (c.style === 'notice' && !/【/.test(c.eye)) E(c, 'notice 型 eye 需含【系統通知】類標頭');
  if (c.style === 'dialogue' && c.body.length < 2) E(c, 'dialogue 型 body 至少 2 行');
  if (c.style === 'checklist' && c.body.filter((l) => /[★☆]/.test(l)).length < 3) E(c, 'checklist 型至少 3 行含 ★／☆');
  if (c.style === 'yiji' && !(/^宜/.test(c.tip) && /忌/.test(c.tip))) E(c, 'yiji 型 tip 需為「宜：…　忌：…」');
  if (c.style === 'murmur' && !/神明|祂|香爐|籤筒|廟|土地公|金身|供桌|籤詩|神像|香火|拜拜/.test(text)) W(`${c._src}  murmur 型沒有出現神明或廟的元素`);
}
cards.forEach(checkCard);

// ---------- 重複 ----------
const seenEye = new Map();
for (const c of cards) {
  if (seenEye.has(c.eye)) E(c, `eye 與 ${seenEye.get(c.eye)} 重複`);
  else seenEye.set(c.eye, c._src);
}
const grams = (s) => {
  const t = s.replace(/[\s，。：「」、！？（）]/g, '');
  const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
};
const gs = cards.map((c) => grams([c.eye, ...c.body].join('')));
for (let i = 0; i < cards.length; i++)
  for (let j = i + 1; j < cards.length; j++) {
    let inter = 0;
    for (const g of gs[i]) if (gs[j].has(g)) inter++;
    const sim = inter / (gs[i].size + gs[j].size - inter || 1);
    if (sim > 0.55) W(`${cards[i]._src} 與 ${cards[j]._src} 內容太像（相似度 ${sim.toFixed(2)}）`);
  }

// ---------- 批次層級（20 張以上才有意義） ----------
const n = cards.length;
const ratio = (fn) => cards.filter(fn).length / (n || 1);
const pct = (x) => `${Math.round(x * 100)}%`;
if (n >= 20) {
  const all = (c) => [c.eye, ...c.body, c.tip].join('');
  const mk = (label, x, max) => x > max && W(`批次：${label} ${pct(x)}（上限 ${pct(max)}）`);
  mk('含「你」', ratio((c) => all(c).includes('你')), 0.4);
  mk('含「卻」', ratio((c) => all(c).includes('卻')), 0.08);
  mk('含「終於」', ratio((c) => all(c).includes('終於')), 0.03);
  mk('含「突然」', ratio((c) => all(c).includes('突然')), 0.03);
  mk('含「讓你」', ratio((c) => all(c).includes('讓你')), 0.1);
  mk('含比喻詞（像／如同／好比／等於）', ratio((c) => /像|如同|好比|等於/.test(all(c))), 0.2);
  mk('標記為流行梗（meme）', ratio((c) => !!c.meme), 0.15);
  const quoteRatio = ratio((c) => /「/.test(all(c)) || c.style === 'dialogue');
  if (quoteRatio < 0.4) W(`批次：含引述或對話僅 ${pct(quoteRatio)}（下限 40%）`);
  const concrete = ratio((c) => /\d/.test(all(c)));
  if (concrete < 0.6) W(`批次：含具體數字僅 ${pct(concrete)}（建議 ≥60%）`);
  const nonYijiYiTip = cards.filter((c) => c.style !== 'yiji');
  const yiRate = nonYijiYiTip.filter((c) => /^宜/.test(c.tip)).length / (nonYijiYiTip.length || 1);
  if (yiRate > 0.45) W(`批次：非宜忌型卡片 tip 用「宜…忌…」占 ${pct(yiRate)}（建議 ≤45%）`);
  for (const s of STYLES) {
    const r = ratio((c) => c.style === s);
    if (n >= 40 && Math.abs(r - STYLE_TARGET[s]) > 0.08) W(`批次：籤型 ${s} 占 ${pct(r)}（目標 ${pct(STYLE_TARGET[s])}±8）`);
  }
  // 範式重複：同一個開頭用太多次，連抽幾次就會看出模板
  const notices = cards.filter((c) => c.style === 'notice');
  if (notices.length >= 8) {
    const r = notices.filter((c) => (c.body[0] ?? '').startsWith('神明補充')).length / notices.length;
    if (r > 0.4) W(`批次：notice 型的 body 以「神明補充」開頭占 ${pct(r)}（上限 40%）`);
    const sys = notices.filter((c) => /^【系統通知】/.test(c.eye)).length / notices.length;
    if (sys > 0.7) W(`批次：notice 型的 eye 都是「【系統通知】」開頭占 ${pct(sys)}（上限 70%，請換成【公告】【提醒】【帳單】【群組】等）`);
  }
  const eyeGod = ratio((c) => /^神明/.test(c.eye));
  if (eyeGod > 0.12) W(`批次：eye 以「神明」開頭占 ${pct(eyeGod)}（上限 12%，murmur 型請換成香爐、籤筒、廟公、土地公、金身等主詞）`);
  const eyeToday = ratio((c) => /^今日(運勢|總評)/.test(c.eye));
  if (eyeToday > 0.1) W(`批次：eye 以「今日運勢／今日總評」開頭占 ${pct(eyeToday)}（上限 10%）`);
  const lens = cards.map((c) => len(c.eye));
  const avg = lens.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / n);
  if (sd < 2.5) W(`批次：eye 長度太整齊（標準差 ${sd.toFixed(1)}）`);
}

// ---------- 輸出 ----------
if (wantReport || !batchFile) {
  console.log(`\n共 ${n} 張，來自 ${files.length} 個檔案`);
  const matrix = {};
  for (const c of cards) {
    matrix[c.level] ??= {};
    matrix[c.level][c.topic] = (matrix[c.level][c.topic] ?? 0) + 1;
  }
  console.log('\n等級 × 主題'.padEnd(10) + TOPICS.map((t) => t.padStart(9)).join('') + '     合計 / 目標');
  for (const lv of LEVELS) {
    const row = TOPICS.map((t) => String(matrix[lv]?.[t] ?? 0).padStart(9)).join('');
    const sum = cards.filter((c) => c.level === lv).length;
    console.log(lv.padEnd(8, '　') + row + `   ${String(sum).padStart(4)} / ${QUOTA[lv]}`);
  }
  console.log('\n籤型：' + STYLES.map((s) => `${s} ${cards.filter((c) => c.style === s).length}`).join('  '));
  console.log('時令：' + SEASONS.map((s) => `${s} ${cards.filter((c) => c.season === s).length}`).join('  '));
  const thin = [];
  for (const p of pains.pains) {
    const k = cards.filter((c) => c.pain === p.label && c.topic === p.topic).length;
    if (k < 3) thin.push(`${p.label}(${k})`);
  }
  if (thin.length && n >= 100) console.log(`\n不足 3 張的痛點：${thin.join('、')}`);
}

console.log('');
for (const w of warns.slice(0, 40)) console.log(`⚠ ${w}`);
if (warns.length > 40) console.log(`⚠ …另有 ${warns.length - 40} 則警告`);
for (const e of errors.slice(0, 60)) console.log(`✗ ${e}`);
if (errors.length > 60) console.log(`✗ …另有 ${errors.length - 60} 則錯誤`);
console.log(`\n結果：${n} 張，錯誤 ${errors.length}，警告 ${warns.length}`);
process.exit(errors.length ? 1 : 0);
