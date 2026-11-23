import { describe, expect, it } from 'vitest';
import { BATCH_SIZE, PAINS, TOPICS, TOPIC_LABEL, pickPainBatch, topicHint } from '../src/data/pains';

describe('步驟②：先選行業、再選困擾', () => {
  it('六個行業都有名稱，而且每個行業都至少有一批（6 個）痛點可選', () => {
    expect(TOPICS.length).toBe(6);
    for (const t of TOPICS) {
      expect(TOPIC_LABEL[t]).toBeTruthy();
      expect(PAINS.filter((p) => p.topic === t).length).toBeGreaterThanOrEqual(BATCH_SIZE);
    }
  });

  it('每一批：剛好 6 個、不重複、全部屬於選的那個行業', () => {
    for (const t of TOPICS) {
      const b = pickPainBatch(t, new Set());
      expect(b.length).toBe(BATCH_SIZE);
      expect(new Set(b.map((p) => p.id)).size).toBe(BATCH_SIZE);
      expect(b.every((p) => p.topic === t)).toBe(true);
    }
  });

  it('連按「換一批」：前兩批完全不重複；第三批沒看過的不夠，仍湊滿 6 個；三批合起來看完 15 個', () => {
    const t = TOPICS[0];
    const total = PAINS.filter((p) => p.topic === t).length;
    const seen = new Set<string>();
    const a = pickPainBatch(t, seen);
    const b = pickPainBatch(t, seen);
    const c = pickPainBatch(t, seen);
    const ids = (x: typeof a) => x.map((p) => p.id);
    expect(ids(a).filter((i) => ids(b).includes(i))).toEqual([]);
    expect(c.length).toBe(BATCH_SIZE);
    expect(new Set(ids(c)).size).toBe(BATCH_SIZE);
    expect(new Set([...ids(a), ...ids(b), ...ids(c)]).size).toBe(total);
  });

  it('換一批很多次也不會壞：每一批都是 6 個、都屬於該行業', () => {
    const t = TOPICS[3];
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const b = pickPainBatch(t, seen);
      expect(b.length).toBe(BATCH_SIZE);
      expect(b.every((p) => p.topic === t)).toBe(true);
    }
  });

  it('不同行業的「已看過」互不影響', () => {
    const seen = new Set<string>();
    pickPainBatch('office', seen);
    const seenOffice = seen.size;
    pickPainBatch('money', seen);
    expect(seen.size).toBe(seenOffice + BATCH_SIZE);
  });

  it('行業鈕的小字：三個痛點名稱，都真的屬於該行業', () => {
    for (const t of TOPICS) {
      const parts = topicHint(t).split('、');
      expect(parts.length).toBe(3);
      const labels = new Set(PAINS.filter((p) => p.topic === t).map((p) => p.label));
      expect(parts.every((x) => labels.has(x))).toBe(true);
    }
  });
});
