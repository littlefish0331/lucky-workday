import { describe, expect, it } from 'vitest';
import {
  K, KNOCK_MAX, clientIp, hitCommands, knockCommand, originAllowed, parseHit, parseKnock, parseStats,
  rateCommand, statsCommand, taipeiDate, type KnownIds,
} from '../supabase/functions/count/logic';

const known: KnownIds = { abcdef12: '大吉', '0a1b2c3d': '下下籤' };

describe('來源檢查', () => {
  it('放行自己的網站、本機與區網；擋掉別人的網站', () => {
    expect(originAllowed('https://littlefish0331.github.io')).toBe(true);
    expect(originAllowed('http://localhost:5173')).toBe(true);
    expect(originAllowed('http://127.0.0.1:4173')).toBe(true);
    expect(originAllowed('http://192.168.1.23:5173')).toBe(true);
    expect(originAllowed('https://evil.example.com')).toBe(false);
    expect(originAllowed('https://littlefish0331.github.io.evil.com')).toBe(false);
    expect(originAllowed('http://localhost.evil.com')).toBe(false);
    expect(originAllowed(null)).toBe(true);
  });
});

describe('求籤計數的輸入驗證', () => {
  it('合法的籤 id → 由伺服器反查等級，不信任前端傳的等級', () => {
    const r = parseHit({ fid: 'abcdef12', level: '上上籤' }, known);
    expect(r).toEqual({ ok: true, value: { fid: 'abcdef12', level: '大吉' } });
  });
  it('格式不對、不存在、型別錯誤都拒絕', () => {
    for (const bad of [null, {}, { fid: 1 }, { fid: 'ABCDEF12' }, { fid: 'abcdef1' }, { fid: 'zzzzzzzz' }, { fid: 'abcdef123' }, { fid: '../../x' }])
      expect(parseHit(bad, known).ok).toBe(false);
    expect(parseHit({ fid: '11111111' }, known).ok).toBe(false);
  });
});

describe('木魚計數的輸入驗證', () => {
  it('只接受 1 到 40 的整數', () => {
    expect(parseKnock({ n: 1 }).ok).toBe(true);
    expect(parseKnock({ n: KNOCK_MAX }).ok).toBe(true);
    for (const n of [0, -1, 41, 1.5, NaN, Infinity, '12', null, undefined]) expect(parseKnock({ n }).ok).toBe(false);
    expect(parseKnock(null).ok).toBe(false);
  });
});

describe('Redis 指令', () => {
  it('所有 key 都有 otld: 前綴', () => {
    const cmds = [...hitCommands('2026-11-21', 'abcdef12', '大吉'), knockCommand(10), statsCommand('2026-11-21'), rateCommand('hit', '1.2.3.4')];
    for (const c of cmds) for (const k of c.slice(1).filter((x) => typeof x === 'string' && String(x).includes(':'))) expect(String(k).startsWith('otld:')).toBe(true);
  });
  it('一次求籤只用 4 個寫入指令加 1 個限流指令（控制 Redis 額度）', () => {
    expect(hitCommands('2026-11-21', 'abcdef12', '大吉')).toHaveLength(4);
    expect(rateCommand('hit', '1.2.3.4')).toEqual(['SET', 'otld:rl:hit:1.2.3.4', '1', 'NX', 'EX', 2]);
  });
  it('計入的是日期與等級', () => {
    const c = hitCommands('2026-11-21', 'abcdef12', '下下籤');
    expect(c).toContainEqual(['INCR', K.day('2026-11-21')]);
    expect(c).toContainEqual(['HINCRBY', K.level('2026-11-21'), '下下籤', 1]);
    expect(c).toContainEqual(['HINCRBY', K.fortunes, 'abcdef12', 1]);
  });
  it('統計一個 MGET 讀完三個數字', () => {
    expect(statsCommand('2026-11-21')).toEqual(['MGET', 'otld:total', 'otld:d:2026-11-21', 'otld:knocks']);
  });
});

describe('統計解析', () => {
  it('字串數字、空值、亂資料都能處理', () => {
    expect(parseStats(['120', '8', '3400'])).toEqual({ total: 120, today: 8, knocks: 3400 });
    expect(parseStats([null, null, null])).toEqual({ total: 0, today: 0, knocks: 0 });
    expect(parseStats('oops')).toEqual({ total: 0, today: 0, knocks: 0 });
    expect(parseStats(['-5', 'x', '7.9'])).toEqual({ total: 0, today: 0, knocks: 7 });
  });
});

describe('日期與 IP', () => {
  it('日期以台北時區為準，由伺服器計算', () => {
    expect(taipeiDate(new Date('2026-11-21T15:59:00Z'))).toBe('2026-11-21');
    expect(taipeiDate(new Date('2026-11-21T16:01:00Z'))).toBe('2026-11-22');
  });
  it('取第一個 IP，亂格式回傳 unknown', () => {
    const h = (v: string | null) => ({ get: (n: string) => (n === 'x-forwarded-for' ? v : null) });
    expect(clientIp(h('1.2.3.4, 5.6.7.8'))).toBe('1.2.3.4');
    expect(clientIp(h('2001:db8::1'))).toBe('2001:db8::1');
    expect(clientIp(h(null))).toBe('unknown');
    expect(clientIp(h('<script>'))).toBe('unknown');
  });
});
