import { describe, expect, it } from 'vitest';
import { JIAOBEI_RATE, KNOCKS, LEVEL_RATE, SEASON_WINDOW } from '../src/engine/config';
import { drawFortune, isLive, knocksNeeded, pickLevel, seasonActive, throwJiaobei } from '../src/engine/draw';
import { HAO, makeHao, plainHao } from '../src/engine/hao';
import { createRng, normalizeName, taipeiDateKey } from '../src/engine/rng';
import { BAD_LEVELS, GOOD_LEVELS, LEVELS, kindOf, type Fortune } from '../src/engine/types';

// 測試專用的假籤池（不是產品內容）：每個等級 10 張，其中第 0 張的 pain 是「目標痛點」
function fakePool(): Fortune[] {
  const out: Fortune[] = [];
  let no = 1;
  for (const level of LEVELS)
    for (let i = 0; i < 10; i++)
      out.push({
        id: `${level}-${i}`.padEnd(8, 'x'),
        no: no++,
        level,
        topic: i === 0 ? 'service' : 'office',
        pain: i === 0 ? '目標痛點' : '其他痛點',
        style: 'quote',
        eye: `eye-${level}-${i}`,
        body: ['b'],
        tip: 't',
        season: null,
        expires: null, meme: null,
      });
  return out;
}

describe('設定', () => {
  it('等級出現率總和為 1，好運 55%、壞運 45%', () => {
    const sum = Object.values(LEVEL_RATE).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(GOOD_LEVELS.reduce((a, l) => a + LEVEL_RATE[l], 0)).toBeCloseTo(0.55, 10);
    expect(BAD_LEVELS.reduce((a, l) => a + LEVEL_RATE[l], 0)).toBeCloseTo(0.45, 10);
  });
  it('擲筊機率總和為 1', () => {
    expect(Object.values(JIAOBEI_RATE).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it('吉側不用敲木魚，凶側越凶敲越多，化解最多', () => {
    for (const l of GOOD_LEVELS) expect(KNOCKS[l]).toEqual([0, 0]);
    expect(KNOCKS['小凶'][1]).toBeLessThan(KNOCKS['凶'][1]);
    expect(KNOCKS['凶'][1]).toBeLessThan(KNOCKS['大凶'][1]);
    expect(KNOCKS['大凶'][1]).toBeLessThan(KNOCKS['下下籤'][1]);
    expect(KNOCKS.resolve[0]).toBeGreaterThanOrEqual(KNOCKS['下下籤'][0]);
  });
  it('每個等級都有法號，且法號字數夠短能放進卡片', () => {
    for (const l of LEVELS) {
      expect(HAO[l].length).toBeGreaterThanOrEqual(8);
      expect(new Set(HAO[l]).size).toBe(HAO[l].length);
      for (const h of HAO[l]) expect([...h].length).toBeLessThanOrEqual(8);
    }
  });
});

describe('亂數與名字', () => {
  it('同一個 seed 產生同一串數字，不同 seed 不同', () => {
    const a = createRng('x'), b = createRng('x'), c = createRng('y');
    const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    sa.forEach((v) => expect(v >= 0 && v < 1).toBe(true));
  });
  it('名字正規化：全形半形與空白視為同一人', () => {
    expect(normalizeName(' Ａmy  Lee ')).toBe('AmyLee');
    expect(normalizeName('王　小 明')).toBe('王小明');
    expect([...normalizeName('一二三四五六七八九十甲乙丙丁')].length).toBe(12);
  });
  it('台北日期格式 YYYY-MM-DD，並以台北時區為準', () => {
    expect(taipeiDateKey(new Date('2026-11-20T10:00:00Z'))).toBe('2026-11-20');
    // UTC 16:30 已經是台北隔天 00:30
    expect(taipeiDateKey(new Date('2026-11-20T16:30:00Z'))).toBe('2026-11-21');
  });
});

describe('抽籤', () => {
  const pool = fakePool();
  const base = { name: '小明', dateKey: '2026-11-20', attempt: 0 };

  it('同名同日同次數 → 同一支（重新整理不會變）', () => {
    const a = drawFortune(pool, base)!;
    for (let i = 0; i < 20; i++) expect(drawFortune(pool, base)!.id).toBe(a.id);
  });
  it('全形空白的同一個名字 → 同一支', () => {
    expect(drawFortune(pool, { ...base, name: ' 小　明 ' })!.id).toBe(drawFortune(pool, base)!.id);
  });
  it('換日期或換次數會變（大多數情況）', () => {
    const ids = new Set<string>();
    for (let d = 1; d <= 28; d++) ids.add(drawFortune(pool, { ...base, dateKey: `2026-11-${String(d).padStart(2, '0')}` })!.id);
    expect(ids.size).toBeGreaterThan(15);
  });
  it('重抽排除上一支', () => {
    for (let i = 0; i < 300; i++) {
      const first = drawFortune(pool, { ...base, name: `人${i}` })!;
      const again = drawFortune(pool, { ...base, name: `人${i}`, attempt: 1, excludeIds: [first.id] })!;
      expect(again.id).not.toBe(first.id);
    }
  });
  it('等級出現率符合設定（20000 次，誤差 1.5 個百分點內）', () => {
    const N = 20000;
    const count: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const lv = pickLevel(createRng(`n${i}|2026-11-20|0`));
      count[lv] = (count[lv] ?? 0) + 1;
    }
    for (const l of LEVELS) expect(Math.abs(count[l] / N - LEVEL_RATE[l])).toBeLessThan(0.015);
  });
  it('好運約 55%，壞運約 45%', () => {
    let good = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (kindOf(drawFortune(pool, { ...base, name: `x${i}` })!.level) === 'good') good++;
    expect(good / N).toBeGreaterThan(0.52);
    expect(good / N).toBeLessThan(0.58);
  });
  it('選了痛點與主題：同痛點的籤被抽中約 12/13（假池每個等級 1 張同痛點、9 張別主題，別主題權重 0 不會抽到）', () => {
    // 假池：第 0 張是 service／目標痛點，其餘 9 張是 office。選 service＋目標痛點 → 只剩那一張可抽，必中
    let hit = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) if (drawFortune(pool, { ...base, name: `p${i}`, pain: '目標痛點', topic: 'service' })!.pain === '目標痛點') hit++;
    expect(hit).toBe(N);
  });
  it('選了主題就不會抽到別的主題（別主題權重 0）', () => {
    for (let i = 0; i < 3000; i++) expect(drawFortune(pool, { ...base, name: `t${i}`, pain: '其他痛點', topic: 'office' })!.topic).toBe('office');
  });
  it('同主題內：選了痛點，同痛點的籤被抽中機率約 12/21（權重 12 對 9 張 1）', () => {
    // 做一個全是 office 的池：每個等級 1 張目標痛點 + 9 張其他痛點
    const officeOnly = pool.map((f) => ({ ...f, topic: 'office' as const }));
    let hit = 0;
    const N = 8000;
    for (let i = 0; i < N; i++) if (drawFortune(officeOnly, { ...base, name: `m${i}`, pain: '目標痛點', topic: 'office' })!.pain === '目標痛點') hit++;
    expect(hit / N).toBeGreaterThan(0.53); // 12/21 ≈ 0.571
    expect(hit / N).toBeLessThan(0.61);
  });
  it('所選主題在這個等級一張都沒有時，退回全池同權重，不會失敗', () => {
    const onlyOffice = pool.filter((f) => f.topic === 'office');
    for (let i = 0; i < 300; i++) expect(drawFortune(onlyOffice, { ...base, name: `n${i}`, pain: '目標痛點', topic: 'service' })).not.toBeNull();
  });
  it('沒選主題時（舊紀錄、隱藏款），全部同權重，不會因為權重 0 而抽不到', () => {
    for (let i = 0; i < 300; i++) expect(drawFortune(pool, { ...base, name: `o${i}`, pain: null, topic: null })).not.toBeNull();
  });
  it('沒選痛點時，該籤只有 1/10', () => {
    let hit = 0;
    const N = 8000;
    for (let i = 0; i < N; i++) if (drawFortune(pool, { ...base, name: `q${i}` })!.pain === '目標痛點') hit++;
    expect(hit / N).toBeGreaterThan(0.08);
    expect(hit / N).toBeLessThan(0.12);
  });
  it('某等級沒有籤時，改抽相鄰等級而不是壞掉', () => {
    const small = pool.filter((f) => f.level === '吉');
    for (let i = 0; i < 200; i++) expect(drawFortune(small, { ...base, name: `s${i}` })).not.toBeNull();
  });
  it('空池回傳 null', () => {
    expect(drawFortune([], base)).toBeNull();
  });
});

describe('時令籤只在窗口期出現', () => {
  it('年終 11/15 起，尾牙 11/25 起，春節 1/10–2/24', () => {
    expect(SEASON_WINDOW.yearend(11, 14)).toBe(false);
    expect(SEASON_WINDOW.yearend(11, 15)).toBe(true);
    expect(SEASON_WINDOW.tailparty(11, 24)).toBe(false);
    expect(SEASON_WINDOW.tailparty(11, 25)).toBe(true);
    expect(SEASON_WINDOW.cny(1, 9)).toBe(false);
    expect(SEASON_WINDOW.cny(2, 24)).toBe(true);
    expect(SEASON_WINDOW.cny(2, 25)).toBe(false);
    expect(SEASON_WINDOW.payday(15, 20 - 5)).toBe(false);
  });
  it('常駐籤（season=null）任何日期都可抽', () => {
    expect(seasonActive(null, '2026-07-01')).toBe(true);
  });
  it('窗口外的時令籤不會被抽到', () => {
    const pool = fakePool().map((f, i) => (i % 2 === 0 ? { ...f, season: 'cny' as const } : f));
    for (let i = 0; i < 2000; i++) {
      const f = drawFortune(pool, { name: `z${i}`, dateKey: '2026-11-20', attempt: 0 })!;
      expect(f.season).toBeNull();
    }
  });
  it('窗口內的時令籤可以被抽到', () => {
    const pool = fakePool().map((f) => ({ ...f, season: 'yearend' as const }));
    expect(drawFortune(pool, { name: 'a', dateKey: '2026-11-20', attempt: 0 })).not.toBeNull();
  });
});

describe('擲筊', () => {
  it('第一擲約 75/22/3', () => {
    const N = 40000;
    const c = { sheng: 0, xiao: 0, yin: 0 };
    for (let i = 0; i < N; i++) c[throwJiaobei(1, createRng(`j${i}`))]++;
    expect(c.sheng / N).toBeGreaterThan(0.73);
    expect(c.sheng / N).toBeLessThan(0.77);
    expect(c.xiao / N).toBeGreaterThan(0.2);
    expect(c.xiao / N).toBeLessThan(0.24);
    expect(c.yin / N).toBeGreaterThan(0.02);
    expect(c.yin / N).toBeLessThan(0.04);
  });
  it('第二擲保證聖筊（不論亂數）', () => {
    for (const v of [0, 0.5, 0.76, 0.99, 0.9999]) expect(throwJiaobei(2, () => v)).toBe('sheng');
  });
  it('玩家最多擲兩次：第一擲不是笑筊就不用第二擲', () => {
    // 邏輯保證：只有 xiao 會進第二擲，而第二擲必為 sheng
    expect(throwJiaobei(1, () => 0.8)).toBe('xiao');
    expect(throwJiaobei(2, () => 0.8)).toBe('sheng');
  });
});

describe('木魚', () => {
  it('每個等級的敲擊數都落在範圍內', () => {
    for (const k of [...LEVELS, 'resolve'] as const) {
      const [min, max] = KNOCKS[k];
      for (let i = 0; i < 500; i++) {
        const n = knocksNeeded(k, createRng(`k${k}${i}`));
        expect(n).toBeGreaterThanOrEqual(min);
        expect(n).toBeLessThanOrEqual(max);
      }
    }
  });
  it('邊界值都出得來', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 3000; i++) seen.add(knocksNeeded('小凶', createRng(`e${i}`)));
    expect(seen.has(8)).toBe(true);
    expect(seen.has(14)).toBe(true);
  });
});

describe('法號', () => {
  it('同名同日同等級 → 同法號；只有稱號，不帶名字的字', () => {
    const a = makeHao('王小明', '大吉', '2026-11-20');
    expect(a).toBe(makeHao('王小明', '大吉', '2026-11-20'));
    expect(HAO['大吉']).toContain(a);
    expect(a).not.toContain('・');
  });
  it('舊紀錄的「明・準時下班居士」顯示時拿掉前面的字；新格式不動', () => {
    expect(plainHao('明・準時下班居士')).toBe('準時下班居士');
    expect(plainHao('T・準時下班居士')).toBe('準時下班居士');
    expect(plainHao('準時下班居士')).toBe('準時下班居士');
  });
  it('下下籤的法號來自下下籤清單', () => {
    expect(HAO['下下籤'].some((h) => makeHao('阿華', '下下籤', '2026-11-20').endsWith(h))).toBe(true);
  });
});

describe('限時籤 expires', () => {
  it('到期日當天還在，隔天就不再出現', () => {
    expect(isLive({ season: null, expires: '2026-12-05' }, '2026-12-05')).toBe(true);
    expect(isLive({ season: null, expires: '2026-12-05' }, '2026-12-06')).toBe(false);
    expect(isLive({ season: null, expires: null }, '2030-01-01')).toBe(true);
  });
  it('同時受時令窗口限制', () => {
    expect(isLive({ season: 'cny', expires: '2027-03-01' }, '2026-11-20')).toBe(false);
  });
  it('過期的籤不會被抽到，未過期的可以', () => {
    const pool = fakePool().map((f, i) => (i % 2 === 0 ? { ...f, expires: '2026-11-19' } : f));
    for (let i = 0; i < 1500; i++) expect(drawFortune(pool, { name: `e${i}`, dateKey: '2026-11-20', attempt: 0 })!.expires).toBeNull();
    const live = fakePool().map((f) => ({ ...f, expires: '2026-11-20' }));
    expect(drawFortune(live, { name: 'x', dateKey: '2026-11-20', attempt: 0 })).not.toBeNull();
  });
});
