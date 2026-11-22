// 四位神明：依籤的主題決定由誰負責。木魚畫面、投票回應、籤卡簽收都用同一份對照。
import type { Topic } from '../engine/types';

const B = import.meta.env.BASE_URL;

export type DeityId = 'boss' | 'granny' | 'wangcai' | 'pangju';
type Stage = 0 | 1 | 2 | 3;

export interface Deity {
  id: DeityId;
  name: string;
  /** 四個表情的圖（由冷淡到大笑） */
  frame: (stage: Stage) => string;
  /** 木魚畫面：進度 0/30/60/90% 時的反應（不含名字） */
  says: [string, string, string, string];
  /** 木魚敲完時 */
  done: string;
  /** 籤卡下方「有感／沒感」投完之後的回應（不含名字） */
  vote: { up: string; down: string };
  /** 主題 → 負責的神明，見 DEITY_OF_TOPIC */
}

export const DEITIES: Record<DeityId, Deity> = {
  boss: {
    id: 'boss',
    name: '績效伯伯',
    frame: (s) => `${B}art/deity-${s}.webp`,
    says: ['（面無表情）', '嗯？', '嗯嗯，有在看。', '哈哈哈哈！夠了夠了！'],
    done: '好啦好啦，給你一次。',
    vote: { up: '這支籤，今年考績甲等', down: '已列入改善計畫，下季再看' },
  },
  granny: {
    id: 'granny',
    name: '發薪婆婆',
    frame: (s) => `${B}art/granny-${s}.webp`,
    says: ['（低頭數紅包）', '嗯？帳好像對不上。', '嗯嗯，有在入帳。', '哎喲！加發加發！'],
    done: '好啦好啦，這個月多給你一點。',
    vote: { up: '加發一個紅包，功德 +1', down: '這支籤本月獎金減半' },
  },
  wangcai: {
    id: 'wangcai',
    name: '旺財',
    frame: (s) => `${B}art/wangcai-${s}.webp`,
    says: ['（歪頭）', '汪？', '汪！有在看！', '汪汪汪汪！尾巴停不下來！'],
    done: '汪！再給你一次！',
    vote: { up: '汪！（尾巴搖到出現殘影）', down: '汪……（低頭回去 debug）' },
  },
  pangju: {
    id: 'pangju',
    name: '胖橘',
    frame: (s) => `${B}art/pangju-${s}.webp`,
    says: ['（半睜一隻眼）', '喵？', '呼嚕……有在聽。', '喵嗚！好啦好啦！'],
    done: '喵。給你一次。',
    vote: { up: '呼嚕嚕', down: '（翻身繼續睡，不負責）' },
  },
};

/** 辦公室、業務接案 → 績效伯伯；錢與年終、服務輪班 → 發薪婆婆；工程師 → 旺財；通勤 → 胖橘 */
export const DEITY_OF_TOPIC: Record<Topic, DeityId> = {
  office: 'boss',
  sales: 'boss',
  money: 'granny',
  service: 'granny',
  engineer: 'wangcai',
  commute: 'pangju',
};

export const deityOf = (topic: Topic | undefined | null): Deity => DEITIES[DEITY_OF_TOPIC[topic ?? 'office']] ?? DEITIES.boss;
