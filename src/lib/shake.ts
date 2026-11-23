// 搖手機的偵測邏輯。純函式、不碰瀏覽器 API，所以可以用合成資料在 vitest 裡測。
// 輸入是 devicemotion 的加速度（含重力，單位 m/s²）。做法：
//   1. 用時間常數固定的低通濾波估出重力，原始值減掉它 = 去重力後的加速度（高通）
//   2. 去重力後的大小超過門檻，算「一下」；要先降到 release 以下才會再算下一下（遲滯），
//      而且兩下之間至少隔 minGapMs，避免一次抖動被算成好幾下
//   3. 轉圈搖或持續亂搖時，加速度大小幾乎不變、降不到 release 以下，遲滯會卡死只算 1 下；
//      所以超過 rearmMs 還在門檻以上，就強制重新武裝，持續搖就持續算
// 慢慢傾斜手機、走路（約 2Hz、幅度 4 m/s²）都不會超過門檻；用力來回搖（約 4Hz、幅度 20 m/s² 以上）會。

export interface MotionSample {
  x: number | null | undefined;
  y: number | null | undefined;
  z: number | null | undefined;
  /** 毫秒時間（任何單調遞增的時鐘都可以） */
  t: number;
}

export interface ShakeOptions {
  /** 去重力後的加速度超過這個值才算一下（m/s²） */
  threshold?: number;
  /** 降到這個值以下才重新武裝 */
  release?: number;
  /** 兩下之間最短間隔（毫秒） */
  minGapMs?: number;
  /** 一直降不到 release 以下時，隔多久強制重新武裝（毫秒），讓轉圈搖、持續亂搖也能持續計數 */
  rearmMs?: number;
  /** 重力估計的時間常數（秒） */
  gravityTau?: number;
}

// 實機回報「有點難搖」（2026-11-22）：門檻 11 → 8；第二次回報仍難搖（2026-11-23），再降到 6、release 3。
// 注意高通濾波會吃掉一部分幅度：原始幅度 8 m/s²、3Hz 的搖法，去重力後只剩約 6 多，所以門檻 8 要幅度 10 以上才算。
// 合成資料量測：門檻 6 時，幅度 8／3Hz 的普通搖會算（約 17 下／3 秒），走路（幅度 3、6）仍 0 下，
// 幅度 9／2Hz（慢跑等級）會誤觸；因此只在搖籤那一頁才聽。以上都是估計，沒有實機驗證。
export const SHAKE_DEFAULTS = { threshold: 6, release: 3, minGapMs: 130, rearmMs: 260, gravityTau: 0.12 } as const;

export interface ShakeReading {
  /** 這一筆是否算一下搖動 */
  stroke: boolean;
  /** 去重力後的加速度大小（m/s²） */
  power: number;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function createShakeDetector(opts: ShakeOptions = {}) {
  const threshold = opts.threshold ?? SHAKE_DEFAULTS.threshold;
  const release = opts.release ?? SHAKE_DEFAULTS.release;
  const minGapMs = opts.minGapMs ?? SHAKE_DEFAULTS.minGapMs;
  const rearmMs = opts.rearmMs ?? SHAKE_DEFAULTS.rearmMs;
  const tau = opts.gravityTau ?? SHAKE_DEFAULTS.gravityTau;

  let g: [number, number, number] | null = null;
  let lastT = 0;
  let armed = true;
  let lastStroke = -Infinity;

  return {
    /** 餵一筆資料。資料無效（null、NaN）回傳 null，呼叫端當作「這台裝置沒有感測器資料」。 */
    feed(s: MotionSample): ShakeReading | null {
      if (!finite(s.x) || !finite(s.y) || !finite(s.z) || !finite(s.t)) return null;
      if (!g) {
        g = [s.x, s.y, s.z];
        lastT = s.t;
        return { stroke: false, power: 0 };
      }
      const dt = Math.min(0.25, Math.max(0.004, (s.t - lastT) / 1000));
      lastT = s.t;
      const k = Math.exp(-dt / tau);
      g = [k * g[0] + (1 - k) * s.x, k * g[1] + (1 - k) * s.y, k * g[2] + (1 - k) * s.z];
      const power = Math.hypot(s.x - g[0], s.y - g[1], s.z - g[2]);

      let stroke = false;
      const gap = s.t - lastStroke;
      if ((armed || gap >= rearmMs) && power > threshold && gap >= minGapMs) {
        stroke = true;
        armed = false;
        lastStroke = s.t;
      } else if (!armed && power < release) {
        armed = true;
      }
      return { stroke, power };
    },
    reset() {
      g = null;
      armed = true;
      lastStroke = -Infinity;
    },
  };
}
