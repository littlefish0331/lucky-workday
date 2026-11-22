import { describe, expect, it } from 'vitest';
import { applyKeep, applyReroll, applyResolve, buildResult, canReroll, isBad, needsDecision, resolveTipFor } from '../src/lib/play';
import { RESOLVE_TIPS } from '../src/data/texts';
import { HAO } from '../src/engine/hao';
import type { Fortune, Level } from '../src/engine/types';
import { randomStamp } from '../src/lib/storage';

const mk = (id: string, level: Level, no = 1): Fortune => ({
  id, no, level, topic: 'office', pain: '下班訊息', style: 'quote', eye: `eye-${id}`, body: ['a', 'b'], tip: 't', season: null, expires: null, meme: null,
});
const base = (f: Fortune) =>
  buildResult({ name: '王小明', date: '2026-11-21', pain: '下班訊息', topic: 'office', stamp: { kind: 'cat', idx: 1, rot: 5, scale: 1 }, fortune: f, now: 1 });

describe('一局的狀態轉換', () => {
  it('抽到吉：不能重抽，也不需要決定', () => {
    const r = base(mk('good0001', '大吉'));
    expect(isBad(r)).toBe(false);
    expect(canReroll(r)).toBe(false);
    expect(needsDecision(r)).toBe(false);
    expect(r.outcome).toBe('direct');
    expect(HAO['大吉']).toContain(r.hao);
  });

  it('抽到凶：可以重抽；重抽成吉 → 改判，不用再決定', () => {
    const r = base(mk('bad00001', '大凶'));
    expect(canReroll(r)).toBe(true);
    const r2 = applyReroll(r, mk('good0002', '吉', 2), 19, 2);
    expect(r2.outcome).toBe('rerolled');
    expect(r2.originalId).toBe('bad00001');
    expect(r2.originalLevel).toBe('大凶');
    expect(r2.level).toBe('吉');
    expect(r2.knocks).toBe(19);
    expect(canReroll(r2)).toBe(false);
    expect(needsDecision(r2)).toBe(false);
    expect(HAO['吉'].some((h) => r2.hao.endsWith(h))).toBe(true); // 法號跟著新等級走
  });

  it('重抽仍是凶：要決定。認命保留手上這支；化解累計木魚下數並附建議', () => {
    const r = base(mk('bad00001', '凶'));
    const r2 = applyReroll(r, mk('bad00002', '下下籤', 2), 15, 2);
    expect(needsDecision(r2)).toBe(true);
    const kept = applyKeep(r2, 3);
    expect(kept.outcome).toBe('kept');
    expect(kept.fortuneId).toBe('bad00002');
    expect(kept.originalLevel).toBe('凶');
    expect(needsDecision(kept)).toBe(false);
    const res = applyResolve(r2, 30, 4);
    expect(res.outcome).toBe('resolved');
    expect(res.knocks).toBe(45);
    expect(RESOLVE_TIPS).toContain(res.resolveTip);
    expect(res.fortuneId).toBe('bad00002');
  });

  it('第一次就認命：沒有重抽也可以收下', () => {
    const k = applyKeep(base(mk('bad00003', '小凶')));
    expect(k.outcome).toBe('kept');
    expect(k.originalId).toBeUndefined();
  });

  it('陰筊隱藏款不能重抽', () => {
    const r = { ...base(mk('yin-00000', '小凶')), special: 'yin' as const };
    expect(canReroll(r)).toBe(false);
  });

  it('籤內容是快照：之後籤池改了，玩家手上的卡不變', () => {
    const f = mk('snap0001', '吉');
    const r = base(f);
    f.eye = '被改寫了';
    f.body.push('新增一行');
    expect(r.snap.eye).toBe('eye-snap0001');
    expect(r.snap.body).toEqual(['a', 'b']);
  });

  it('化解建議對同一支籤固定', () => {
    expect(resolveTipFor('abc12345')).toBe(resolveTipFor('abc12345'));
    const tips = new Set(Array.from({ length: 200 }, (_, i) => resolveTipFor(`id${i}`)));
    expect(tips.size).toBeGreaterThan(8);
  });
});

describe('手印', () => {
  it('四種都會出現，貓與狗合計約 40%', () => {
    const c = { finger: 0, palm: 0, cat: 0, dog: 0 };
    let seed = 12345;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const N = 20000;
    for (let i = 0; i < N; i++) c[randomStamp(rand).kind]++;
    expect(c.finger / N).toBeGreaterThan(0.32);
    expect(c.finger / N).toBeLessThan(0.38);
    expect(c.palm / N).toBeGreaterThan(0.22);
    expect(c.palm / N).toBeLessThan(0.28);
    expect((c.cat + c.dog) / N).toBeGreaterThan(0.37);
    expect((c.cat + c.dog) / N).toBeLessThan(0.43);
  });
  it('張數不會超出素材範圍（指印 4、掌印 2、貓狗各 3）', () => {
    let seed = 99;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const max = { finger: 4, palm: 2, cat: 3, dog: 3 };
    for (let i = 0; i < 5000; i++) {
      const s = randomStamp(rand);
      expect(s.idx).toBeGreaterThanOrEqual(0);
      expect(s.idx).toBeLessThan(max[s.kind]);
      expect(Math.abs(s.rot)).toBeLessThanOrEqual(28);
    }
  });
});
