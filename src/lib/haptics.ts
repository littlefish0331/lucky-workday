/**
 * 震動。Android 的 Chrome 支援；iPhone 的 Safari 我印象中不支援（未實機驗證）。
 * 所以不論有沒有震動，都同時給一個畫面震動，確保每台手機都有回饋。
 */
export function buzz(pattern: number | number[] = 30): boolean {
  let vibrated = false;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) vibrated = navigator.vibrate(pattern);
  } catch {
    /* 某些瀏覽器會丟例外，直接忽略 */
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const b = document.getElementById('root');
    if (b) {
      b.classList.remove('jolt');
      void b.offsetWidth; // 重新觸發動畫
      b.classList.add('jolt');
    }
  }
  return vibrated;
}
