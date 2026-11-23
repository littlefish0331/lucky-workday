import type { Level, Topic } from '../engine/types';
import { LEVELS, TOPICS } from '../engine/types';
import { normalizeName } from '../engine/rng';
import { sealText } from './scan';

/** palm 已不再抽出，但舊紀錄裡還有，籤卡要能繼續顯示 */
export type StampKind = 'finger' | 'seal' | 'palm' | 'cat' | 'dog';
export interface StampSpec {
  kind: StampKind;
  idx: number;
  /** 旋轉角度（度） */
  rot: number;
  scale: number;
  /** 印章（seal）刻的字，取自玩家名字的前幾個漢字 */
  text?: string;
}
export type Outcome = 'direct' | 'rerolled' | 'kept' | 'resolved';

export interface Result {
  name: string;
  /** 報名時選的稱呼 id（信士、信女…）。舊紀錄沒有這欄，顯示時當作「信眾」 */
  honorific?: string;
  /** 台北日期 YYYY-MM-DD */
  date: string;
  pain: string;
  topic: Topic;
  stamp: StampSpec;
  /** 目前顯示的籤（重抽後是新的那一支） */
  fortuneId: string;
  /** 文字快照：籤的內容日後被改寫或下架時，玩家的籤冊仍然完整 */
  snap: { no: number; eye: string; body: string[]; tip: string };
  level: Level;
  special?: 'yin';
  originalId?: string;
  originalLevel?: Level;
  /** 為了這張卡敲過幾下木魚 */
  knocks?: number;
  outcome: Outcome;
  resolveTip?: string;
  hao: string;
  at: number;
}

export interface Store {
  name: string;
  /** 上次選的稱呼，下次進來自動帶入 */
  honorific?: string;
  book: Result[];
}

const KEY = 'otld:v1';
const BOOK_MAX = 120;
let memory: Store | null = null;

const emptyStore = (): Store => ({ name: '', book: [] });

function validResult(r: unknown): r is Result {
  const x = r as Partial<Result> | null;
  return (
    !!x &&
    typeof x.name === 'string' &&
    typeof x.date === 'string' &&
    typeof x.fortuneId === 'string' &&
    typeof x.hao === 'string' &&
    typeof x.snap?.eye === 'string' &&
    Array.isArray(x.snap?.body) &&
    typeof x.snap?.tip === 'string' &&
    LEVELS.includes(x.level as Level) &&
    TOPICS.includes(x.topic as Topic) &&
    typeof x.stamp === 'object' && x.stamp !== null
  );
}

export function loadStore(): Store {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Store>;
      memory = {
        name: typeof p.name === 'string' ? p.name : '',
        honorific: typeof p.honorific === 'string' ? p.honorific : undefined,
        book: Array.isArray(p.book) ? p.book.filter(validResult) : [],
      };
      return memory;
    }
  } catch {
    /* 隱私模式或資料壞掉：用空的繼續玩 */
  }
  memory = emptyStore();
  return memory;
}

function persist(s: Store) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 寫不進去也不要影響遊戲，這次只存在記憶體 */
  }
}

export function setName(name: string, honorific?: string): Store {
  const s = { ...loadStore(), name, honorific };
  persist(s);
  return s;
}

export function findResult(s: Store, name: string, date: string): Result | null {
  const n = normalizeName(name);
  return s.book.find((r) => r.date === date && normalizeName(r.name) === n) ?? null;
}

/** 同名同日只留一筆：新的蓋掉舊的。 */
export function saveResult(r: Result): Store {
  const s = loadStore();
  const n = normalizeName(r.name);
  const rest = s.book.filter((x) => !(x.date === r.date && normalizeName(x.name) === n));
  const book = [r, ...rest].sort((a, b) => b.at - a.at).slice(0, BOOK_MAX);
  const next = { ...s, book };
  persist(next);
  return next;
}

export function clearBook(): Store {
  const next = { ...loadStore(), book: [] };
  persist(next);
  return next;
}

/** 手印種類的機率：指印 35%、印章 35%、貓掌 15%、狗掌 15%（貓狗是「你按指印，牠們代簽」的趣味變化） */
export const STAMP_ODDS = { finger: 0.35, seal: 0.7, cat: 0.85 } as const;

/**
 * 隨機抽一種手印。印章要刻玩家的名字，所以要給名字；名字裡沒有漢字（例如純英文）就不抽印章，
 * 抽到印章的機率改給指印。掌印（palm）不再抽出。
 */
export function randomStamp(rand: () => number = Math.random, name = ''): StampSpec {
  const text = sealText(name);
  const r = rand();
  let kind: StampKind = r < STAMP_ODDS.finger ? 'finger' : r < STAMP_ODDS.seal ? 'seal' : r < STAMP_ODDS.cat ? 'cat' : 'dog';
  if (kind === 'seal' && !text) kind = 'finger';
  const count = kind === 'finger' ? 4 : kind === 'seal' ? 1 : 3;
  return {
    kind,
    idx: Math.floor(rand() * count),
    rot: Math.round(-28 + rand() * 56),
    scale: Math.round((0.9 + rand() * 0.25) * 100) / 100,
    ...(kind === 'seal' ? { text } : {}),
  };
}
