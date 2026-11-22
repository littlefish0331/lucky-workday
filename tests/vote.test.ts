import { describe, expect, it } from 'vitest';
import { DEITIES, DEITY_OF_TOPIC } from '../src/data/deities';
import { TOPICS } from '../src/engine/types';
import { VOTES_MAX, createVoteStore } from '../src/lib/vote';

const fakeStorage = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

describe('投票的本機記錄', () => {
  it('投一次就記住，不能改票，重新載入後還在', () => {
    const st = fakeStorage();
    const a = createVoteStore(() => st);
    expect(a.get('aaaaaaaa')).toBeNull();
    expect(a.set('aaaaaaaa', 'up')).toBe(true);
    expect(a.set('aaaaaaaa', 'down')).toBe(false);
    expect(a.get('aaaaaaaa')).toBe('up');
    const b = createVoteStore(() => st); // 模擬重新整理
    expect(b.get('aaaaaaaa')).toBe('up');
    expect(b.set('aaaaaaaa', 'down')).toBe(false);
  });

  it('不同的籤各投各的', () => {
    const s = createVoteStore(() => fakeStorage());
    s.set('aaaaaaaa', 'up');
    s.set('bbbbbbbb', 'down');
    expect([s.get('aaaaaaaa'), s.get('bbbbbbbb'), s.get('cccccccc')]).toEqual(['up', 'down', null]);
  });

  it('資料壞掉或亂值時當作沒投過，不會丟例外', () => {
    for (const raw of ['{oops', 'null', '[]', '"x"', '{"aaaaaaaa":"maybe","bbbbbbbb":1}']) {
      const s = createVoteStore(() => fakeStorage({ 'otld:votes:v1': raw }));
      expect(s.get('aaaaaaaa')).toBeNull();
      expect(s.get('bbbbbbbb')).toBeNull();
    }
  });

  it('localStorage 不能用（隱私模式）時，這次只記在記憶體，仍可正常投票', () => {
    const s = createVoteStore(() => null);
    expect(s.set('aaaaaaaa', 'down')).toBe(true);
    expect(s.get('aaaaaaaa')).toBe('down');
    const broken = createVoteStore(() => ({
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
    }));
    expect(broken.get('aaaaaaaa')).toBeNull();
    expect(broken.set('aaaaaaaa', 'up')).toBe(true);
    expect(broken.get('aaaaaaaa')).toBe('up');
  });

  it(`最多留 ${VOTES_MAX} 筆，超過丟最舊的`, () => {
    const st = fakeStorage();
    const s = createVoteStore(() => st);
    for (let i = 0; i < VOTES_MAX + 5; i++) s.set(`id${String(i).padStart(6, '0')}`, 'up');
    expect(Object.keys(JSON.parse(st.data['otld:votes:v1'])).length).toBe(VOTES_MAX);
    expect(s.get('id000000')).toBeNull();
    expect(s.get(`id${String(VOTES_MAX + 4).padStart(6, '0')}`)).toBe('up');
  });
});

describe('神明的投票回應', () => {
  it('四位神明各有「有感／沒感」兩句，且每個主題都有人負責', () => {
    for (const d of Object.values(DEITIES)) {
      expect(d.vote.up.length).toBeGreaterThan(0);
      expect(d.vote.down.length).toBeGreaterThan(0);
      expect(d.vote.up).not.toBe(d.vote.down);
    }
    for (const t of TOPICS) expect(DEITIES[DEITY_OF_TOPIC[t]]).toBeDefined();
  });
  it('回應句照使用者確認的版本', () => {
    expect(DEITIES.boss.vote).toEqual({ up: '這支籤，今年考績甲等', down: '已列入改善計畫，下季再看' });
    expect(DEITIES.granny.vote).toEqual({ up: '加發一個紅包，功德 +1', down: '這支籤本月獎金減半' });
    expect(DEITIES.wangcai.vote).toEqual({ up: '汪！（尾巴搖到出現殘影）', down: '汪……（低頭回去 debug）' });
    expect(DEITIES.pangju.vote).toEqual({ up: '呼嚕嚕', down: '（翻身繼續睡，不負責）' });
  });
});
