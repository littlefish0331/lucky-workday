/**
 * 報名頁的稱呼，選填。選了之後：
 *   - 痛點頁的問句，神明會這樣叫你（「信士，今天有什麼困擾？」）
 *   - 籤卡上名字上方的小字換成它
 * 沒選就是「信眾」。
 */
export interface Honorific {
  id: string;
  /** 按鈕上的字 */
  chip: string;
  /** 神明怎麼叫你（痛點頁問句） */
  ask: string;
  /** 籤卡上名字上方的小字 */
  card: string;
}

export const HONORIFICS: Honorific[] = [
  { id: 'xinshi', chip: '信士', ask: '信士', card: '信士' },
  { id: 'xinnu', chip: '信女', ask: '信女', card: '信女' },
  { id: 'xiaonuzi', chip: '小女子', ask: '姑娘', card: '小女子' },
  { id: 'xiaodi', chip: '小弟', ask: '小老弟', card: '小弟' },
  { id: 'passby', chip: '路過看看', ask: '路過的朋友', card: '路過信眾' },
  { id: 'sincere', chip: '誠心發問', ask: '誠心的信眾', card: '誠心信眾' },
];

export const DEFAULT_HONORIFIC: Honorific = { id: '', chip: '信眾', ask: '信眾', card: '信眾' };

export function honorificById(id: string | undefined | null): Honorific {
  return HONORIFICS.find((h) => h.id === id) ?? DEFAULT_HONORIFIC;
}
