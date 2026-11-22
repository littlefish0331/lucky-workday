#!/usr/bin/env node
// 隨機抽 N 張籤，輸出成方便使用者標註「有共鳴／沒感覺」的 Markdown。
// 用法：node scripts/sample-fortunes.mjs 30  → content/samples/sample-<時間>.md
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const N = Number(process.argv[2] ?? 30);
const dir = join(ROOT, 'content/batches');
const all = existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  : [];
for (let i = all.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [all[i], all[j]] = [all[j], all[i]];
}
const pick = all.slice(0, N);
const md = [
  `# 抽樣 ${pick.length} 張（共 ${all.length} 張）`,
  '',
  '請在每張後面的方括號填 **有感／普通／沒感**，有想法可以補一句。',
  '',
  ...pick.map(
    (c, i) =>
      `### ${i + 1}. ${c.level}｜${c.topic}｜${c.pain}｜${c.style}\n**${c.eye}**\n${c.body.map((l) => `> ${l}`).join('\n')}\n\n神明叮嚀：${c.tip}\n\n[　　]\n`,
  ),
].join('\n');
mkdirSync(join(ROOT, 'content/samples'), { recursive: true });
const out = join(ROOT, 'content/samples', `sample-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.md`);
writeFileSync(out, md);
console.log(`已輸出 ${pick.length} 張到 ${out}`);
