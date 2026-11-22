import { describe, expect, it } from 'vitest';
import { createShakeDetector, type MotionSample } from '../src/lib/shake';

const G = 9.81;
const HZ = 60; // 一般手機 devicemotion 約 60Hz

/** 產生一段加速度資料。fn(秒) → [x, y, z]（含重力）。 */
function series(seconds: number, fn: (t: number) => [number, number, number], hz = HZ): MotionSample[] {
  const out: MotionSample[] = [];
  for (let i = 0; i < seconds * hz; i++) {
    const t = i / hz;
    const [x, y, z] = fn(t);
    out.push({ x, y, z, t: t * 1000 });
  }
  return out;
}
const count = (samples: MotionSample[], opts = {}) => {
  const d = createShakeDetector(opts);
  let n = 0;
  for (const s of samples) if (d.feed(s)?.stroke) n++;
  return n;
};

describe('搖手機偵測（合成資料）', () => {
  it('手機放在桌上不動：0 下', () => {
    expect(count(series(5, () => [0, 0, G]))).toBe(0);
  });

  it('輕微雜訊（±0.3 m/s²）：0 下', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.6;
    expect(count(series(5, () => [rnd(), rnd(), G + rnd()]))).toBe(0);
  });

  it('慢慢把手機傾斜 90 度（重力從 z 轉到 y，約 3 秒）：0 下', () => {
    const f = (t: number): [number, number, number] => {
      const a = Math.min(1, t / 3) * (Math.PI / 2);
      return [0, G * Math.sin(a), G * Math.cos(a)];
    };
    expect(count(series(4, f))).toBe(0);
  });

  it('拿著手機走路（約 2Hz、垂直幅度 3 m/s²）：0 下', () => {
    expect(count(series(6, (t) => [0.8 * Math.sin(2 * Math.PI * 2 * t), 0, G + 3 * Math.sin(2 * Math.PI * 2 * t + 1)]))).toBe(0);
  });

  it('用力左右搖 3 秒（約 4Hz、幅度 25 m/s²）：每次來回至少算 1 下，合計約 12～24 下', () => {
    const n = count(series(3, (t) => [25 * Math.sin(2 * Math.PI * 4 * t), 0, G]));
    expect(n).toBeGreaterThanOrEqual(12);
    expect(n).toBeLessThanOrEqual(24);
  });

  it('輕輕搖（約 3Hz、幅度 8 m/s²）：低於門檻，不算', () => {
    expect(count(series(3, (t) => [8 * Math.sin(2 * Math.PI * 3 * t), 0, G]))).toBe(0);
  });

  it('單次急促甩動：算 1 下，不會因為餘震連算', () => {
    const f = (t: number): [number, number, number] => [t > 1 && t < 1.1 ? 40 * Math.sin(((t - 1) / 0.1) * Math.PI) : 0, 0, G];
    expect(count(series(3, f))).toBe(1);
  });

  it('轉圈圈搖（加速度大小幾乎不變、不會降到 release 以下）：仍然持續計數，約每 0.26 秒一下', () => {
    // 手機畫圓：向量一直在轉，大小約 18 m/s² 不變。若只靠「降到 release 以下才重新武裝」，這種搖法只會算 1 下。
    const n = count(series(3, (t) => [20 * Math.cos(2 * Math.PI * 3 * t), 20 * Math.sin(2 * Math.PI * 3 * t), G]));
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(13);
  });

  it('持續劇烈亂搖（25Hz 方波，power 一直卡在門檻以上）：不會卡死，也不會狂算', () => {
    const n = count(series(2, () => [0, 0, G]).map((s, i) => ({ ...s, x: i % 2 === 0 ? 30 : 0 })));
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThanOrEqual(9);
  });

  it('間隔限制：就算每一下都有降下來重新武裝，兩下之間也不會少於 minGapMs', () => {
    // 重力時間常數設很大 = 重力估計幾乎不動，power ≈ |x|，大樣本之間會乾淨地降到 0，只剩 minGapMs 在擋
    const d = createShakeDetector({ minGapMs: 130, gravityTau: 1000 });
    d.feed({ x: 0, y: 0, z: G, t: 0 });
    const times: number[] = [];
    for (let i = 1; i <= 100; i++) {
      const big = i % 2 === 0; // 每 40ms 一次大的、中間 0
      if (d.feed({ x: big ? 30 : 0, y: 0, z: G, t: i * 20 })?.stroke) times.push(i * 20);
    }
    expect(times.length).toBeGreaterThan(5);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(130);
    // 沒有 minGapMs 的話，每 40ms 就會算一下（100 筆 ≈ 50 下）；有的話應該只剩約 1/4
    expect(times.length).toBeLessThan(20);
  });

  it('裝置沒有感測器資料（null／NaN／缺值）：回傳 null，不丟例外、不計數', () => {
    const d = createShakeDetector();
    for (const bad of [
      { x: null, y: null, z: null, t: 1 },
      { x: undefined, y: 0, z: 0, t: 1 },
      { x: NaN, y: 0, z: 0, t: 1 },
      { x: 0, y: Infinity, z: 0, t: 1 },
      { x: 0, y: 0, z: 0, t: NaN },
    ])
      expect(d.feed(bad as MotionSample)).toBeNull();
  });

  it('時間戳不連續（切換分頁回來、dt 很大）時不會爆掉或誤判', () => {
    const d = createShakeDetector();
    d.feed({ x: 0, y: 0, z: G, t: 0 });
    const r = d.feed({ x: 0, y: 0, z: G, t: 60_000 });
    expect(r).not.toBeNull();
    expect(r!.stroke).toBe(false);
    expect(Number.isFinite(r!.power)).toBe(true);
  });

  it('reset 之後重新開始，不帶著舊的重力估計', () => {
    const d = createShakeDetector();
    for (let i = 0; i < 30; i++) d.feed({ x: 0, y: 0, z: G, t: i * 16 });
    d.reset();
    // 換成側躺的重力方向，第一筆只建立基準，不該算一下
    expect(d.feed({ x: G, y: 0, z: 0, t: 1000 })?.stroke).toBe(false);
  });
});
