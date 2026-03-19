// ========== SecondMe 相关 ==========
export interface SecondMeProfile {
  name: string;
  avatar: string;
  aboutMe: string;
  originRoute: string;
  homepage?: string;
}

// ========== 酒单 ==========
export type DrinkStrength = '烈酒' | '威士忌' | '鸡尾酒' | '低度';

export interface Drink {
  id: string;
  name: string;
  nameEn: string;
  inspiration: string;
  emoji: string;
  color: string;
  glowColor: string;
  strength: DrinkStrength;
  strengthLevel: number; // 1-5
  effect: string;
  promptInjection: string;
  available: boolean; // 是否已上线
}

// ========== Agent 醉态 ==========
export interface ConsumedDrink {
  drinkId: string;
  drinkName: string;
  emoji: string;
  effect: string;
  consumedAt: number;
}

export interface AgentState {
  agentId: string;
  profile: SecondMeProfile;
  drunkLevel: number; // 0-100
  activeDrinks: ConsumedDrink[];
  enteredAt: number;
  entranceQuote: string;
  mostAbsurdQuote: string;
  tableRecord?: TableRecord; // 拼桌记录
}

// ========== 对话 ==========
export interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
}

// ========== 量子账单 ==========
export interface Receipt {
  id: string;
  quantumNumber: string; // #SCH-yyyyMMdd-xxxx
  agentName: string;
  agentAvatar: string;
  enteredAt: string;
  leftAt: string;
  drinks: ReceiptDrinkItem[];
  totalDrunkLevel: number;
  mostAbsurdQuote: string;
  tableRecord?: TableRecord;
  hangoverWarning: string;
  settlementNote: string;
}

export interface ReceiptDrinkItem {
  name: string;
  emoji: string;
  effect: string;
  count: number;
  color?: string;
  glowColor?: string;
}

// ========== 酒吧墙 — 今晚来过的客人 ==========
export interface PastVisitor {
  id: string;
  agentName: string;
  agentAvatar: string;
  drinks: { emoji: string; name: string; color: string }[];
  drunkLevel: number;
  mostAbsurdQuote: string;
  leftAt: number;
  quantumNumber: string;
  thumbnail?: string; // 小图 base64 (~50KB), 用于吧台墙
  imagePrompt?: string;
}

// ========== 拼桌 ==========
export interface TableSession {
  id: string;
  topic: string;
  topicUrl?: string;
  agent1: { name: string; avatar: string; drinkName: string; drunkLevel: number };
  agent2: { name: string; avatar: string; drinkName: string; drunkLevel: number };
  messages: { speaker: 'agent1' | 'agent2'; content: string }[];
  status: 'chatting' | 'done';
  chemistry?: number;      // 契合度 0-100
  partnerRoute?: string;   // 对方 SecondMe 主页路由
  createdAt: number;
}

// Agent 的拼桌记录（存在 AgentState 里）
export interface TableRecord {
  partnerName: string;
  partnerAvatar: string;
  topic: string;
  chemistry: number;
  partnerRoute?: string;
}

export interface TableHistory {
  id: string;
  topic: string;
  agent1Name: string;
  agent2Name: string;
  agent1Avatar: string;
  agent2Avatar: string;
  highlight: string;      // 最高光的一句
  rounds: number;
  createdAt: number;
}
