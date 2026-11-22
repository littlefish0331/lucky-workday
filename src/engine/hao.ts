import { createRng, normalizeName } from './rng';
import type { Level } from './types';

/** 職場法號。吉側有「居士」「信士」，凶側走「苦主」「受難者」，下下籤最離譜。 */
export const HAO: Record<Level, string[]> = {
  上上籤: ['準時下班天尊', '年終滿載真人', '會議全免上師', '帶薪躺平仙尊', '報帳秒過大士', '週五提前走真君', '加薪神速天尊', '老闆已讀祖師'],
  大吉: ['準時下班居士', '午休睡滿居士', '零加班居士', '假日免打擾居士', '簽核秒過居士', '群組靜音居士', '補休入帳居士', '咖啡續杯居士'],
  吉: ['平安上班信士', '順利報帳信士', '沒被點名信士', '順利打卡信士', '一路綠燈信士', '準時開會信士', '便當還熱信士', '無事退朝信士'],
  小吉: ['搶到座位信士', '冷氣剛好信士', '咖啡加糖信士', '網路沒斷信士', '印表機有紙信士', '電梯剛好信士', '蓋章有墨信士', '零食還有信士'],
  小凶: ['忘記存檔信徒', '被點名信徒', '臨時開會信徒', '忘記帶傘信徒', '咖啡灑出信徒', '遲到五分信徒', '電腦更新信徒', '漏附附件信徒'],
  凶: ['假日待命苦主', '改稿循環苦主', '週五五點苦主', '客訴轉接苦主', '需求改口苦主', '代班接班苦主', '雨天遲到苦主', '被已讀苦主'],
  大凶: ['全員待命受難者', '深夜群組受難者', '補班受難者', '會議連環受難者', '推翻重來受難者', '背鍋遊行受難者', '加班輪迴受難者', '帳單逼近受難者'],
  下下籤: ['永久待命尊者', '加班輪迴尊者', '週一再生尊者', '結案重來尊者', '已讀不回尊者', '無限改稿尊者', '年度大輪迴尊者', '假日被召喚尊者'],
};

/** 名字的最後一個中文字；非中文取第一個字母大寫；都沒有就取第一個字。 */
export function nameMark(name: string): string {
  const n = normalizeName(name);
  const han = [...n].filter((c) => /\p{Script=Han}/u.test(c));
  if (han.length) return han[han.length - 1];
  const latin = [...n].find((c) => /\p{L}/u.test(c));
  return latin ? latin.toUpperCase() : ([...n][0] ?? '無');
}

/** 例：明・準時下班居士。同名同日同等級 → 同法號。 */
export function makeHao(name: string, level: Level, dateKey: string): string {
  const rand = createRng(`hao|${normalizeName(name)}|${dateKey}|${level}`);
  const list = HAO[level];
  return `${nameMark(name)}・${list[Math.floor(rand() * list.length)]}`;
}
