// 替需要「預覽伺服器」的 e2e 腳本自己啟動、結束後自己關掉，不留背景程序。
// 用法：npm run build && node scripts/with-preview.mjs scripts/e2e-smoke.mjs [腳本參數...]
// 腳本會拿到環境變數 URL（預設 http://127.0.0.1:4177/）。
import { spawn } from 'node:child_process';

const [script, ...args] = process.argv.slice(2);
if (!script) { console.error('用法：node scripts/with-preview.mjs <腳本> [參數...]'); process.exit(2); }
const PORT = 4177;
const URL = `http://127.0.0.1:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* 已經結束 */ } };
process.on('exit', stop);
for (let i = 0; ; i++) {
  if (await fetch(URL).then((r) => r.ok).catch(() => false)) break;
  if (i >= 40) { console.error('預覽伺服器沒有起來'); stop(); process.exit(1); }
  await new Promise((r) => setTimeout(r, 250));
}
const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit', env: { ...process.env, URL } });
child.on('exit', (code) => { stop(); process.exit(code ?? 1); });
