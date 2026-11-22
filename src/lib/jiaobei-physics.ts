// 擲筊的「動畫軌跡」：純函式、不依賴 three，所以可以在 vitest 裡測。
//
// 設計重點：結果（聖／笑／陰）是 engine 先決定好的，動畫要「演」出那個結果，而不是反過來靠物理模擬決定。
// 所以這裡不是真的剛體碰撞，而是：每一個筊杯有一條從手上拋出 → 落地彈跳 → 靜止的軌跡，
// 起點與終點（落點、朝上的那一面）由結果決定，中間用拋物線＋旋轉內插。這樣：
//   1. 結果永遠和判定一致（不會出現「畫面是聖筊、判定是陰筊」）
//   2. 落點每次不同、散落在地面上（使用者的要求），而且兩個筊杯不會疊在一起
//   3. 可重現：給同一個 seed 就得到同一條軌跡，方便測試與截圖
//
// 座標：x 向右、y 向上、z 朝向鏡頭；地面在 y = 0。單位大致是「筊杯高度 = 1」。

import type { Jiaobei } from '../engine/types';

export type Face = 'flat' | 'round';
/** 一個筊杯最後朝上的那一面 */
export const FACES: Record<Jiaobei, readonly [Face, Face]> = { sheng: ['flat', 'round'], xiao: ['flat', 'flat'], yin: ['round', 'round'] };

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BlockPlan {
  /** 落地靜止時的位置（y 是筊杯躺平後的中心高度） */
  rest: Vec3;
  /** 靜止時繞 y 軸（垂直軸）的朝向，弧度 */
  restYaw: number;
  /** 朝上的面 */
  up: Face;
  /** 起飛位置（手上） */
  from: Vec3;
  /** 拋出時繞三軸的總旋轉圈數（飛行中翻滾） */
  spin: Vec3;
  /** 最高點高度 */
  apex: number;
  /** 落地後彈跳的次數與每次的高度比例 */
  bounces: number[];
}

/** 簡單、可重現的亂數（mulberry32） */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 地面可落的範圍（相機看得到、而且不會被畫面邊緣切掉） */
export const FLOOR = { xMin: -1.55, xMax: 1.55, zMin: -0.95, zMax: 0.75 } as const;
/** 兩個筊杯中心至少隔多遠，才不會疊在一起（筊杯長約 1、寬約 0.7） */
export const MIN_SEPARATION = 1.05;

/** 在地面上隨機挑兩個落點，保證彼此距離 ≥ MIN_SEPARATION */
export function pickRestPoints(rand: () => number): [Vec3, Vec3] {
  const pt = (): Vec3 => ({
    x: FLOOR.xMin + rand() * (FLOOR.xMax - FLOOR.xMin),
    y: 0,
    z: FLOOR.zMin + rand() * (FLOOR.zMax - FLOOR.zMin),
  });
  let a = pt();
  let b = pt();
  for (let i = 0; i < 60 && Math.hypot(a.x - b.x, a.z - b.z) < MIN_SEPARATION; i++) b = pt();
  if (Math.hypot(a.x - b.x, a.z - b.z) < MIN_SEPARATION) {
    // 極端情況（亂數連續不順）：硬性拉開，不能疊
    a = { x: -0.8, y: 0, z: a.z };
    b = { x: 0.8, y: 0, z: b.z };
  }
  return [a, b];
}

/** 手上的高度（拋出的起點） */
export const HAND_HEIGHT = 1.0;

/** 筊杯躺平時中心離地面的高度（厚度的一半，外加一點弧度） */
export const REST_HEIGHT = 0.07;

export function planThrow(kind: Jiaobei, seed: number): [BlockPlan, BlockPlan] {
  const rand = rng(seed);
  const [pa, pb] = pickRestPoints(rand);
  const faces = FACES[kind];
  // 左右手兩側拋出，所以兩個起點略分開；左邊的拋向左、右邊的拋向右，視覺上才像「一起撒出去」
  const mk = (rest: Vec3, up: Face, side: -1 | 1): BlockPlan => ({
    rest: { ...rest, y: REST_HEIGHT },
    restYaw: (rand() * 2 - 1) * Math.PI,
    up,
    from: { x: 0.35 * side, y: HAND_HEIGHT, z: 1.4 },
    spin: { x: 2 + Math.floor(rand() * 3), y: (rand() * 2 - 1) * 1.2, z: 1 + Math.floor(rand() * 2) },
    apex: 1.9 + rand() * 0.5,
    bounces: [0.28 + rand() * 0.1, 0.1 + rand() * 0.05],
  });
  // 較左的落點給「左邊」的筊杯，避免兩條軌跡交叉穿過彼此
  const [left, right] = pa.x <= pb.x ? [pa, pb] : [pb, pa];
  // 哪一面朝上是結果決定的；聖筊（一平一圓）隨機決定是左邊平還是右邊平
  const swap = kind === 'sheng' && rand() < 0.5;
  return [mk(left, swap ? faces[1] : faces[0], -1), mk(right, swap ? faces[0] : faces[1], 1)];
}

/** 一次擲筊的總長（毫秒）：飛行 + 彈跳 + 靜止 */
export const FLIGHT_MS = 900;
export const BOUNCE_MS = [260, 170] as const;
export const TOTAL_MS = FLIGHT_MS + BOUNCE_MS[0] + BOUNCE_MS[1];

export interface BlockPose {
  pos: Vec3;
  /** 歐拉角（弧度），順序 XYZ */
  rot: Vec3;
  /** 0 = 飛行中、1 = 已落地靜止 */
  landed: boolean;
}

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * 在時間 t（毫秒，從擲出算起）時筊杯的位置與姿態。
 * 朝上的面用「最終姿態」決定：flat 面朝上 = 繞 x 軸轉 -90°（面朝 +y）；round 面朝上 = 翻面（+90°）。
 */
export function poseAt(plan: BlockPlan, tMs: number): BlockPose {
  const faceX = plan.up === 'flat' ? -Math.PI / 2 : Math.PI / 2;
  const restRot: Vec3 = { x: faceX, y: 0, z: plan.restYaw };

  if (tMs >= TOTAL_MS) return { pos: plan.rest, rot: restRot, landed: true };

  // 飛行：拋物線（上升快、下降快，在最高點停一下）
  if (tMs < FLIGHT_MS) {
    const u = tMs / FLIGHT_MS;
    const lin = {
      x: plan.from.x + (plan.rest.x - plan.from.x) * easeOutQuad(u),
      z: plan.from.z + (plan.rest.z - plan.from.z) * easeOutQuad(u),
    };
    // y：從手上高度出發，經過 apex，落到 rest.y。用二次貝茲：P0 = from.y、P1 = 控制點（讓峰值剛好是 apex）、P2 = rest.y
    const p0 = plan.from.y;
    const p2 = plan.rest.y;
    const p1 = 2 * plan.apex - 0.5 * (p0 + p2);
    const y = (1 - u) * (1 - u) * p0 + 2 * (1 - u) * u * p1 + u * u * p2;
    // 旋轉：由快到慢，快落地時才轉到最終朝向，所以用 easeOut；落地瞬間剛好 = restRot
    const k = 1 - easeOutQuad(u); // 剩下多少還沒轉
    return {
      pos: { x: lin.x, y, z: lin.z },
      rot: {
        x: restRot.x + plan.spin.x * 2 * Math.PI * k,
        y: restRot.y + plan.spin.y * 2 * Math.PI * k,
        z: restRot.z + plan.spin.z * 2 * Math.PI * k,
      },
      landed: false,
    };
  }

  // 彈跳：兩次，高度遞減，姿態在彈跳中略微晃動（最後回到 restRot）
  let t = tMs - FLIGHT_MS;
  for (let i = 0; i < BOUNCE_MS.length; i++) {
    if (t < BOUNCE_MS[i]) {
      const u = t / BOUNCE_MS[i];
      const h = plan.bounces[i] * 4 * u * (1 - u); // 0 → 峰值 → 0 的拋物線
      // 晃動在彈跳的兩端都是 0（落地瞬間、再次落下瞬間姿態都等於 restRot，不會跳格）
      const wobble = 0.18 * (i === 0 ? 1 : 0.5) * Math.sin(u * Math.PI);
      return {
        pos: { x: plan.rest.x, y: plan.rest.y + h, z: plan.rest.z },
        rot: { x: restRot.x + wobble, y: restRot.y, z: restRot.z + wobble * 0.6 },
        landed: false,
      };
    }
    t -= BOUNCE_MS[i];
  }
  return { pos: plan.rest, rot: restRot, landed: true };
}
