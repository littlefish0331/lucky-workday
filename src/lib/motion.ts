// 搖手機：瀏覽器端的接線（DeviceMotion）。偵測邏輯在 shake.ts。
//
// 平台差異（我只在桌機用合成事件驗證過，沒有實機）：
//   - Android Chrome：不需要授權，要 HTTPS（Vercel 是）。直接聽 devicemotion 就有資料。
//   - iOS Safari 13+：必須在「使用者點擊」裡呼叫 DeviceMotionEvent.requestPermission()，授權後才有資料。
//   - 桌機：有 DeviceMotionEvent 這個物件，但只會觸發一次、數值全是 null。這種情況視為「沒有感測器」。
// 任何一種情況沒有資料，遊戲都照常運作（手指拖曳永遠可用）。
import { createShakeDetector, type MotionSample, type ShakeOptions } from './shake';

type PermissionFn = () => Promise<'granted' | 'denied'>;
const permissionFn = (): PermissionFn | null => {
  const D = (typeof DeviceMotionEvent !== 'undefined' ? DeviceMotionEvent : null) as unknown as { requestPermission?: PermissionFn } | null;
  return D && typeof D.requestPermission === 'function' ? D.requestPermission.bind(D) : null;
};

/** none：這個瀏覽器根本沒有 DeviceMotion；ready：直接聽就行；ask：要使用者點一下授權（iOS） */
export type MotionSupport = 'none' | 'ready' | 'ask';
export function motionSupport(): MotionSupport {
  if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') return 'none';
  return permissionFn() ? 'ask' : 'ready';
}

/** 必須在點擊事件裡呼叫（iOS 的規定）。出錯一律當作沒有授權，不丟例外。 */
export async function requestMotionPermission(): Promise<'granted' | 'denied'> {
  const fn = permissionFn();
  if (!fn) return 'granted';
  try {
    return (await fn()) === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/** 從事件取出加速度：優先含重力的版本，沒有就用不含重力的 */
export function sampleOf(e: Pick<DeviceMotionEvent, 'accelerationIncludingGravity' | 'acceleration'>, t: number): MotionSample {
  const a = e.accelerationIncludingGravity;
  const b = e.acceleration;
  const use = a && typeof a.x === 'number' && Number.isFinite(a.x) ? a : b;
  return { x: use?.x, y: use?.y, z: use?.z, t };
}

export interface ShakeListener {
  /** 搖到一下（power：去重力後的加速度，m/s²） */
  onStroke: (power: number) => void;
  /** 第一次收到有效的感測資料（證明這台裝置真的有在回報） */
  onLive?: () => void;
  /** 開始聽之後 timeoutMs 內都沒有有效資料（桌機、或使用者沒授權、或感測器被停用） */
  onNoData?: () => void;
}

/** 開始聽搖動。回傳停止函式。 */
export function listenShake(l: ShakeListener, opts: ShakeOptions & { noDataMs?: number } = {}): () => void {
  if (typeof window === 'undefined') return () => {};
  const det = createShakeDetector(opts);
  let live = false;
  const timer = window.setTimeout(() => {
    if (!live) l.onNoData?.();
  }, opts.noDataMs ?? 1500);
  const handler = (e: DeviceMotionEvent) => {
    const r = det.feed(sampleOf(e, performance.now()));
    if (!r) return;
    if (!live) {
      live = true;
      window.clearTimeout(timer);
      l.onLive?.();
    }
    if (r.stroke) l.onStroke(r.power);
  };
  window.addEventListener('devicemotion', handler);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('devicemotion', handler);
  };
}
