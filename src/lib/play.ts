// 一局遊戲的狀態轉換。全部是純函式，方便測試。
import { RESOLVE_TIPS } from '../data/texts';
import { createRng } from '../engine/rng';
import { makeHao } from '../engine/hao';
import { kindOf, type Fortune, type Topic } from '../engine/types';
import type { Result, StampSpec } from './storage';

export const snapOf = (f: Fortune): Result['snap'] => ({ no: f.no, eye: f.eye, body: [...f.body], tip: f.tip });

export function buildResult(p: {
  name: string;
  honorific?: string;
  date: string;
  pain: string;
  topic: Topic;
  stamp: StampSpec;
  fortune: Fortune;
  special?: 'yin';
  now?: number;
}): Result {
  return {
    name: p.name,
    honorific: p.honorific || undefined,
    date: p.date,
    pain: p.pain,
    topic: p.topic,
    stamp: p.stamp,
    fortuneId: p.fortune.id,
    snap: snapOf(p.fortune),
    level: p.fortune.level,
    special: p.special,
    outcome: 'direct',
    hao: makeHao(p.name, p.fortune.level, p.date),
    at: p.now ?? Date.now(),
  };
}

export const isBad = (r: Result) => kindOf(r.level) === 'bad';

/** 第一次就抽到凶：可以敲木魚重抽，或認命收下。隱藏款（陰筊）不能重抽。 */
export const canReroll = (r: Result) => isBad(r) && r.outcome === 'direct' && r.special !== 'yin';

/** 重抽後仍是凶：要選「認命」或「再敲木魚化解」。 */
export const needsDecision = (r: Result) => isBad(r) && r.outcome === 'rerolled';

export function applyReroll(r: Result, next: Fortune, knocks: number, now = Date.now()): Result {
  return {
    ...r,
    originalId: r.originalId ?? r.fortuneId,
    originalLevel: r.originalLevel ?? r.level,
    fortuneId: next.id,
    snap: snapOf(next),
    level: next.level,
    knocks: (r.knocks ?? 0) + knocks,
    outcome: 'rerolled',
    hao: makeHao(r.name, next.level, r.date),
    at: now,
  };
}

/** 認命：手上這支就是這支。 */
export const applyKeep = (r: Result, now = Date.now()): Result => ({ ...r, outcome: 'kept', at: now });

export function resolveTipFor(fortuneId: string): string {
  return RESOLVE_TIPS[Math.floor(createRng(`tip|${fortuneId}`)() * RESOLVE_TIPS.length)];
}

export function applyResolve(r: Result, knocks: number, now = Date.now()): Result {
  return { ...r, outcome: 'resolved', knocks: (r.knocks ?? 0) + knocks, resolveTip: resolveTipFor(r.fortuneId), at: now };
}
