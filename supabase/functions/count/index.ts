// 準時下班宮：計數代理。
//   瀏覽器 ──(publishable key)──▶ 這個函式 ──(secret：Redis token)──▶ Upstash Redis
// 瀏覽器拿不到 Redis 金鑰；金鑰只存在 Supabase 的 Edge Function secrets。
// 路由（都是 POST，body 為 JSON）：
//   { action: 'hit',   fid }   記一次求籤
//   { action: 'knock', n }     記一輪木魚
//   { action: 'vote', fid, v } 對一支籤投「有感(up)／沒感(down)」；同 IP 同一支籤一天一票
//   { action: 'stats' }        取今日與累計數字（30 秒快取）。票數不對外提供
// 任何失敗都回 200 + { ok:false }，前端會直接忽略，不影響遊戲。
import known from './known-ids.json' with { type: 'json' };
import {
  ALLOWED_ORIGINS, clientIp, hitCommands, knockCommand, originAllowed, parseHit, parseKnock, parseStats, parseVote,
  rateCommand, statsCommand, taipeiDate, voteCommand, voteRateCommand, type Cmd, type KnownIds, type Stats,
} from './logic.ts';

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '';
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '';

/** 新式 publishable key 不會被平台驗證（verify_jwt=false），所以在這裡自己比對 apikey 標頭 */
const PUBLISHABLE: string[] = (() => {
  try {
    return Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>);
  } catch {
    return [];
  }
})();

async function redis(cmds: Cmd[]): Promise<{ result?: unknown; error?: string }[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds.map((c) => c.map(String))),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return await res.json();
}

let statsCache: { at: number; date: string; value: Stats } | null = null;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const allowOrigin = origin && originAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  const cors = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);
  if (!originAllowed(origin)) return json({ ok: false, reason: 'origin' }, 403);
  if (PUBLISHABLE.length && !PUBLISHABLE.includes(req.headers.get('apikey') ?? '')) return json({ ok: false, reason: 'apikey' }, 401);
  if (!REDIS_URL || !REDIS_TOKEN) return json({ ok: false, reason: 'not-configured' });

  try {
    const body = await req.json().catch(() => null);
    const action = (body as { action?: unknown } | null)?.action;
    const date = taipeiDate();
    const ip = clientIp(req.headers);
    /** 同一個 IP 短時間內只收一次。SET NX 設成功才回 OK，已存在回 null。 */
    const limited = async (a: 'hit' | 'knock') => (await redis([rateCommand(a, ip)]))[0]?.result == null;

    if (action === 'hit') {
      const p = parseHit(body, known as KnownIds);
      if (!p.ok) return json({ ok: false, reason: p.reason });
      if (await limited('hit')) return json({ ok: false, reason: 'rate' });
      await redis(hitCommands(date, p.value.fid, p.value.level));
      return json({ ok: true });
    }

    if (action === 'knock') {
      const p = parseKnock(body);
      if (!p.ok) return json({ ok: false, reason: p.reason });
      if (await limited('knock')) return json({ ok: false, reason: 'rate' });
      await redis([knockCommand(p.value)]);
      return json({ ok: true });
    }

    if (action === 'vote') {
      const p = parseVote(body, known as KnownIds);
      if (!p.ok) return json({ ok: false, reason: p.reason });
      // 同 IP 對同一支籤一天一票：SET NX 沒設成功（回 null）就不計
      if ((await redis([voteRateCommand(p.value.fid, ip)]))[0]?.result == null) return json({ ok: false, reason: 'rate' });
      await redis([voteCommand(p.value.fid, p.value.v)]);
      return json({ ok: true });
    }

    if (action === 'stats') {
      const now = Date.now();
      if (statsCache && statsCache.date === date && now - statsCache.at < 30_000) return json({ ok: true, ...statsCache.value });
      const value = parseStats((await redis([statsCommand(date)]))[0]?.result);
      statsCache = { at: now, date, value };
      return json({ ok: true, ...value });
    }

    return json({ ok: false, reason: 'action' });
  } catch (e) {
    console.error('count error', e instanceof Error ? e.message : e);
    return json({ ok: false, reason: 'upstream' });
  }
});
