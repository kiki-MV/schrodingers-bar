import { AgentState, ChatMessage, PastVisitor, TableHistory } from '@/types';

// 用 globalThis 确保跨 API route 共享同一份状态
// Next.js dev 模式下不同 route 会被编译为独立模块
const globalState = globalThis as unknown as {
  __bar_agents?: Map<string, AgentState>;
  __bar_chats?: Map<string, ChatMessage[]>;
  __bar_past_visitors?: PastVisitor[];
};

if (!globalState.__bar_agents) {
  globalState.__bar_agents = new Map();
}
if (!globalState.__bar_chats) {
  globalState.__bar_chats = new Map();
}

if (!globalState.__bar_past_visitors) {
  globalState.__bar_past_visitors = [];
}

const agents = globalState.__bar_agents;
const chatHistories = globalState.__bar_chats;
const pastVisitors = globalState.__bar_past_visitors;

export function getAgent(agentId: string): AgentState | undefined {
  return agents.get(agentId);
}

export function setAgent(agentId: string, state: AgentState): void {
  agents.set(agentId, state);
}

export function removeAgent(agentId: string): void {
  agents.delete(agentId);
  chatHistories.delete(agentId);
}

export function getAllAgents(): AgentState[] {
  return Array.from(agents.values());
}

export function getChatHistory(agentId: string): ChatMessage[] {
  return chatHistories.get(agentId) || [];
}

export function addChatMessage(agentId: string, msg: ChatMessage): void {
  const history = chatHistories.get(agentId) || [];
  history.push(msg);
  chatHistories.set(agentId, history);
}

export function updateMostAbsurdQuote(agentId: string, quote: string): void {
  const agent = agents.get(agentId);
  if (agent) {
    agent.mostAbsurdQuote = quote;
  }
}

// ── 历史访客（酒吧墙） ──

export function addPastVisitor(visitor: PastVisitor): void {
  pastVisitors.unshift(visitor);
  // 只保留最近 30 个
  if (pastVisitors.length > 30) pastVisitors.length = 30;
}

export function getPastVisitors(): PastVisitor[] {
  return pastVisitors;
}

// ── 拼桌历史 ──

if (!globalState.__bar_past_visitors) globalState.__bar_past_visitors = [];
const gTable = globalThis as any;
if (!gTable.__bar_table_history) gTable.__bar_table_history = [] as TableHistory[];
const tableHistory: TableHistory[] = gTable.__bar_table_history;

export function addTableHistory(t: TableHistory): void {
  tableHistory.unshift(t);
  if (tableHistory.length > 20) tableHistory.length = 20;
}

export function getTableHistory(): TableHistory[] {
  return tableHistory;
}
