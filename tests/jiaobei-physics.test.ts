import { describe, expect, it } from 'vitest';
import { FACES, FLIGHT_MS, FLOOR, MIN_SEPARATION, REST_HEIGHT, TOTAL_MS, planThrow, poseAt, rng, type BlockPlan } from '../src/lib/jiaobei-physics';
import { JIAOBEI_ASPECT, JIAOBEI_OUTLINE } from '../src/data/jiaobei-shape';
import type { Jiaobei } from '../src/engine/types';

const KINDS: Jiaobei[] = ['sheng', 'xiao', 'yin'];
const dist = (a: BlockPlan, b: BlockPlan) => Math.hypot(a.rest.x - b.rest.x, a.rest.z - b.rest.z);

describe('擲筊軌跡：結果由判定決定，動畫只負責演出', () => {
  it('聖筊＝一平一圓、笑筊＝兩平、陰筊＝兩圓（任何 seed 都一樣）', () => {
    for (let seed = 0; seed < 300; seed++) {
      for (const k of KINDS) {
        const [a, b] = planThrow(k, seed);
        const ups = [a.up, b.up].sort();
        expect(ups).toEqual([...FACES[k]].sort());
      }
    }
  });

  it('聖筊的「哪一邊是平面」兩種都會出現（不是永遠左平右圓）', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) seen.add(planThrow('sheng', seed).map((p) => p.up).join('/'));
    expect(seen).toEqual(new Set(['flat/round', 'round/flat']));
  });

  it('落點每次不同、散落在地面各處，而不是固定在中間', () => {
    const xs: number[] = [];
    const zs: number[] = [];
    for (let seed = 0; seed < 400; seed++) for (const p of planThrow('sheng', seed)) { xs.push(p.rest.x); zs.push(p.rest.z); }
    const span = (v: number[]) => Math.max(...v) - Math.min(...v);
    expect(span(xs)).toBeGreaterThan((FLOOR.xMax - FLOOR.xMin) * 0.9);
    expect(span(zs)).toBeGreaterThan((FLOOR.zMax - FLOOR.zMin) * 0.9);
    expect(new Set(xs.map((x) => x.toFixed(2))).size).toBeGreaterThan(200);
  });

  it('落點一定在可視地面範圍內，兩個筊杯不會疊在一起（掃 5000 個 seed）', () => {
    for (let seed = 0; seed < 5000; seed++) {
      for (const k of KINDS) {
        const [a, b] = planThrow(k, seed);
        for (const p of [a, b]) {
          expect(p.rest.x).toBeGreaterThanOrEqual(FLOOR.xMin - 1e-9);
          expect(p.rest.x).toBeLessThanOrEqual(FLOOR.xMax + 1e-9);
          expect(p.rest.z).toBeGreaterThanOrEqual(FLOOR.zMin - 1e-9);
          expect(p.rest.z).toBeLessThanOrEqual(FLOOR.zMax + 1e-9);
          expect(p.rest.y).toBe(REST_HEIGHT);
        }
        expect(dist(a, b)).toBeGreaterThanOrEqual(MIN_SEPARATION - 1e-9);
      }
    }
  });

  it('同一個 seed 得到同一條軌跡（可重現）；不同 seed 不同', () => {
    expect(planThrow('sheng', 42)).toEqual(planThrow('sheng', 42));
    expect(planThrow('sheng', 42)).not.toEqual(planThrow('sheng', 43));
  });

  it('亂數產生器：落在 [0,1)，分佈大致平均', () => {
    const r = rng(1);
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 20000).toBeGreaterThan(0.48);
    expect(sum / 20000).toBeLessThan(0.52);
  });
});

describe('擲筊軌跡：poseAt', () => {
  const plan = planThrow('sheng', 7)[0];

  it('起點在手上、終點精準落在規劃的位置與朝向，而且終點之後不再動', () => {
    const s = poseAt(plan, 0);
    expect(s.pos.x).toBeCloseTo(plan.from.x, 6);
    expect(s.pos.y).toBeCloseTo(plan.from.y, 6);
    expect(s.landed).toBe(false);
    const e = poseAt(plan, TOTAL_MS);
    expect(e.pos).toEqual(plan.rest);
    expect(e.landed).toBe(true);
    expect(poseAt(plan, TOTAL_MS + 5000)).toEqual(e);
  });

  it('飛行中真的飛到夠高（拋起），然後落到地面，沒有穿過地面', () => {
    let maxY = 0;
    for (let t = 0; t <= TOTAL_MS; t += 4) {
      const p = poseAt(plan, t);
      maxY = Math.max(maxY, p.pos.y);
      expect(p.pos.y).toBeGreaterThanOrEqual(plan.rest.y - 1e-6);
    }
    expect(maxY).toBeGreaterThanOrEqual(plan.apex * 0.97);
    expect(maxY).toBeGreaterThan(1.85); // 比手（1.0）高出將近一倍，才看得出是「拋起」
  });

  it('飛行結束的那一瞬間，姿態與落點都和靜止時一致（沒有瞬間跳格）', () => {
    const justBefore = poseAt(plan, FLIGHT_MS - 0.001);
    const rest = poseAt(plan, TOTAL_MS);
    expect(justBefore.pos.x).toBeCloseTo(rest.pos.x, 2);
    expect(justBefore.pos.z).toBeCloseTo(rest.pos.z, 2);
    expect(justBefore.pos.y).toBeCloseTo(rest.pos.y, 2);
    expect(justBefore.rot.x).toBeCloseTo(rest.rot.x, 2);
    expect(justBefore.rot.y).toBeCloseTo(rest.rot.y, 2);
    expect(justBefore.rot.z).toBeCloseTo(rest.rot.z, 2);
  });

  it('整條軌跡位置與姿態都連續：相鄰 1ms 之間不會有突然的大跳動', () => {
    // 不在迴圈裡呼叫 expect（太慢會逾時）：先收集每個軸的「最大單步跳動」，最後各斷言一次
    const max = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 };
    for (let seed = 0; seed < 100; seed++) {
      for (const p of planThrow('yin', seed)) {
        let prev = poseAt(p, 0);
        for (let t = 1; t <= TOTAL_MS + 20; t++) {
          const cur = poseAt(p, t);
          max.px = Math.max(max.px, Math.abs(cur.pos.x - prev.pos.x));
          max.py = Math.max(max.py, Math.abs(cur.pos.y - prev.pos.y));
          max.pz = Math.max(max.pz, Math.abs(cur.pos.z - prev.pos.z));
          max.rx = Math.max(max.rx, Math.abs(cur.rot.x - prev.rot.x));
          max.ry = Math.max(max.ry, Math.abs(cur.rot.y - prev.rot.y));
          max.rz = Math.max(max.rz, Math.abs(cur.rot.z - prev.rot.z));
          prev = cur;
        }
      }
    }
    // 飛行中旋轉最快約 (最多 4 圈 × 2π) ÷ 0.9 秒 × 2（easeOut 開頭的斜率）≈ 0.056 弧度/ms，所以 1ms 內不會超過 0.1
    expect(max.px).toBeLessThan(0.02);
    expect(max.py).toBeLessThan(0.05);
    expect(max.pz).toBeLessThan(0.02);
    expect(max.rx).toBeLessThan(0.1);
    expect(max.ry).toBeLessThan(0.1);
    expect(max.rz).toBeLessThan(0.1);
  });

  it('落地後有彈跳（高度先升再降），彈跳比拋起矮很多', () => {
    const ys: number[] = [];
    for (let t = FLIGHT_MS; t <= TOTAL_MS; t += 5) ys.push(poseAt(plan, t).pos.y);
    expect(Math.max(...ys)).toBeGreaterThan(plan.rest.y + 0.1);
    expect(Math.max(...ys)).toBeLessThan(plan.rest.y + 0.6);
  });

  it('朝上的面：平面朝上與圓面朝上的靜止姿態，剛好差 180° 翻面', () => {
    let flat: BlockPlan | undefined;
    let round: BlockPlan | undefined;
    for (let seed = 0; seed < 50 && !(flat && round); seed++) for (const p of planThrow('sheng', seed)) (p.up === 'flat' ? (flat ??= p) : (round ??= p));
    expect(flat && round).toBeTruthy();
    const f = poseAt(flat!, TOTAL_MS).rot.x;
    const r = poseAt(round!, TOTAL_MS).rot.x;
    expect(Math.abs(r - f)).toBeCloseTo(Math.PI, 6);
  });
});

describe('筊杯輪廓（從貼圖描出來的）', () => {
  it('是一個合理的月牙形：夠多的點、座標在範圍內、沒有重複點', () => {
    expect(JIAOBEI_OUTLINE.length).toBeGreaterThan(40);
    expect(JIAOBEI_OUTLINE.length).toBeLessThan(400);
    for (const [x, y] of JIAOBEI_OUTLINE) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(JIAOBEI_ASPECT + 0.01);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1.001);
    }
    const keys = new Set(JIAOBEI_OUTLINE.map(([x, y]) => `${x},${y}`));
    expect(keys.size).toBe(JIAOBEI_OUTLINE.length);
  });

  it('封閉、不自我交叉（多邊形面積為正且合理，沒有打結）', () => {
    const pts = JIAOBEI_OUTLINE;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      area += x1 * y2 - x2 * y1;
    }
    area = Math.abs(area) / 2;
    // 月牙佔外框（0.7079 × 1）的約 4～7 成；打結的話面積會異常
    expect(area).toBeGreaterThan(0.7079 * 0.35);
    expect(area).toBeLessThan(0.7079 * 0.75);
    // 檢查任兩條不相鄰的邊不相交
    const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    type P = readonly number[];
    const hit = (p1: P, p2: P, p3: P, p4: P) =>
      cross(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]) * cross(p1[0], p1[1], p2[0], p2[1], p4[0], p4[1]) < 0 &&
      cross(p3[0], p3[1], p4[0], p4[1], p1[0], p1[1]) * cross(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]) < 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      expect(hit(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])).toBe(false);
    }
  });
});
