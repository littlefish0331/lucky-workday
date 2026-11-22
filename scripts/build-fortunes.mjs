#!/usr/bin/env node
// 把 content/batches/*.json 合併成 src/data/fortunes.generated.json（前端唯一讀的籤詩來源）。
// id 由內容雜湊決定（穩定，Redis 計數用），籤號依等級與雜湊排序後編號（僅供顯示）。
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['上上籤', '大吉', '吉', '小吉', '小凶', '凶', '大凶', '下下籤'];

const check = spawnSync(process.execPath, [join(ROOT, 'scripts/check-fortunes.mjs')], { encoding: 'utf8' });
if (check.status !== 0) {
  process.stdout.write(check.stdout);
  console.error('\n籤詩檢查未通過，停止建置。');
  process.exit(1);
}

const dir = join(ROOT, 'content/batches');
const all = [];
if (existsSync(dir)) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    all.push(...JSON.parse(readFileSync(join(dir, f), 'utf8')));
  }
}
const withId = all.map((c) => ({
  id: createHash('sha1').update(`${c.level}|${c.eye}`).digest('hex').slice(0, 8),
  level: c.level,
  topic: c.topic,
  pain: c.pain,
  style: c.style,
  eye: c.eye,
  body: c.body,
  tip: c.tip,
  season: c.season ?? null,
  expires: c.expires ?? null,
  meme: c.meme ?? null,
}));
withId.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id.localeCompare(b.id));
const ids = new Set();
withId.forEach((c, i) => {
  if (ids.has(c.id)) throw new Error(`id 雜湊衝突：${c.id}`);
  ids.add(c.id);
  c.no = i + 1;
});

mkdirSync(join(ROOT, 'src/data'), { recursive: true });
writeFileSync(join(ROOT, 'src/data/fortunes.generated.json'), JSON.stringify(withId));

// Edge Function 用：籤 id → 等級。伺服器靠它驗證前端回報的籤，不信任前端傳的等級。
const known = Object.fromEntries(withId.map((c) => [c.id, c.level]));
mkdirSync(join(ROOT, 'supabase/functions/count'), { recursive: true });
writeFileSync(join(ROOT, 'supabase/functions/count/known-ids.json'), JSON.stringify(known));

console.log(`已輸出 ${withId.length} 張籤到 src/data/fortunes.generated.json（並更新 Edge Function 的 known-ids.json）`);
