// 純邏輯：不依賴 Deno，可以在本機用 vitest 測試。
// 重點：日期由伺服器自己算、等級由伺服器用籤 id 反查，都不信任瀏覽器傳來的值。

export const LEVELS = ['上上籤', '大吉', '吉', '小吉', '小凶', '凶', '大凶', '下下籤'] as const;
export type Level = (typeof LEVELS)[number];

/** 籤 id → 等級。由 scripts/build-fortunes.mjs 產生 known-ids.json */
export type KnownIds = Record<string, Level>;

export const ALLOWED_ORIGINS = ['https://lucky-workday.vercel.app'];

/** 本機開發：localhost、127.0.0.1，以及手機測試用的區網位址 */
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/;

/** 沒有 Origin（curl、伺服器端）放行，有 Origin 就必須是我們自己的網站。 */
export function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin);
}

export function taipeiDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

export function parseHit(body: unknown, known: KnownIds): Parsed<{ fid: string; level: Level }> {
  const fid = (body as { fid?: unknown } | null)?.fid;
  if (typeof fid !== 'string' || !/^[0-9a-f]{8}$/.test(fid)) return { ok: false, reason: 'bad fid' };
  const level = known[fid];
  if (!level || !LEVELS.includes(level)) return { ok: false, reason: 'unknown fid' };
  return { ok: true, value: { fid, level } };
}

/** 一次最多 40 下（化解最高 36），超過就當作亂打 */
export const KNOCK_MAX = 40;
export function parseKnock(body: unknown): Parsed<number> {
  const n = (body as { n?: unknown } | null)?.n;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > KNOCK_MAX) return { ok: false, reason: 'bad n' };
  return { ok: true, value: n };
}

export type VoteValue = 'up' | 'down';

/** 投「有感／沒感」。fid 必須是已知的籤（和 hit 一樣由伺服器驗證）。 */
export function parseVote(body: unknown, known: KnownIds): Parsed<{ fid: string; v: VoteValue }> {
  const b = body as { fid?: unknown; v?: unknown } | null;
  const hit = parseHit({ fid: b?.fid }, known);
  if (!hit.ok) return hit;
  if (b?.v !== 'up' && b?.v !== 'down') return { ok: false, reason: 'bad v' };
  return { ok: true, value: { fid: hit.value.fid, v: b.v } };
}

// ---- Redis key 與指令。這個資料庫可能和其他專案共用，所以一律加 otld: 前綴 ----
export const K = {
  total: 'otld:total',
  knocks: 'otld:knocks',
  fortunes: 'otld:f',
  /** 有感／沒感：和 otld:f 同款的 hash，欄位是籤 id */
  voteUp: 'otld:vu',
  voteDown: 'otld:vd',
  day: (d: string) => `otld:d:${d}`,
  level: (d: string) => `otld:lv:${d}`,
  /** 限流：同一個 IP 在 N 秒內只收一次。SET NX EX 只要 1 個指令。 */
  rate: (action: string, ip: string) => `otld:rl:${action}:${ip}`,
  /** 投票限流：同一個 IP 對同一支籤，一天一票 */
  voteRate: (fid: string, ip: string) => `otld:rl:vote:${fid}:${ip}`,
};

export type Cmd = (string | number)[];

export const RATE_SECONDS = { hit: 2, knock: 2, stats: 1 } as const;

export function rateCommand(action: keyof typeof RATE_SECONDS, ip: string): Cmd {
  return ['SET', K.rate(action, ip), '1', 'NX', 'EX', RATE_SECONDS[action]];
}

export function hitCommands(date: string, fid: string, level: Level): Cmd[] {
  return [
    ['INCR', K.total],
    ['INCR', K.day(date)],
    ['HINCRBY', K.level(date), level, 1],
    ['HINCRBY', K.fortunes, fid, 1],
  ];
}

export const VOTE_RATE_SECONDS = 86_400;

/** 同一個 IP 對同一支籤一天只收一票。設成功回 OK，已存在回 null。 */
export function voteRateCommand(fid: string, ip: string): Cmd {
  return ['SET', K.voteRate(fid, ip), '1', 'NX', 'EX', VOTE_RATE_SECONDS];
}

export function voteCommand(fid: string, v: VoteValue): Cmd {
  return ['HINCRBY', v === 'up' ? K.voteUp : K.voteDown, fid, 1];
}

export function knockCommand(n: number): Cmd {
  return ['INCRBY', K.knocks, n];
}

export function statsCommand(date: string): Cmd {
  return ['MGET', K.total, K.day(date), K.knocks];
}

export interface Stats {
  total: number;
  today: number;
  knocks: number;
}

export function parseStats(mget: unknown): Stats {
  const arr = Array.isArray(mget) ? mget : [];
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };
  return { total: num(arr[0]), today: num(arr[1]), knocks: num(arr[2]) };
}

/** 從代理標頭取 IP。取不到就用固定字串（等於所有人共用一個限流，寧可嚴一點）。 */
export function clientIp(headers: { get(name: string): string | null }): string {
  const xff = headers.get('x-forwarded-for') ?? headers.get('cf-connecting-ip') ?? '';
  const ip = xff.split(',')[0].trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : 'unknown';
}
