import { AgentState, ChatMessage, PastVisitor, TableHistory } from '@/types';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Key 前缀
const KEYS = {
  agent: (id: string) => `bar:agent:${id}`,
  chat: (id: string) => `bar:chat:${id}`,
  visitors: 'bar:past_visitors',
  tables: 'bar:table_history',
};

// TTL: agent 状态 2 小时过期，历史数据 7 天
const AGENT_TTL = 7200;
const HISTORY_TTL = 604800;

// ── Agent 状态 ──

export async function getAgent(agentId: string): Promise<AgentState | undefined> {
  const data = await redis.get<AgentState>(KEYS.agent(agentId));
  return data || undefined;
}

export async function setAgent(agentId: string, state: AgentState): Promise<void> {
  await redis.set(KEYS.agent(agentId), state, { ex: AGENT_TTL });
}

export async function removeAgent(agentId: string): Promise<void> {
  await redis.del(KEYS.agent(agentId), KEYS.chat(agentId));
}

export async function getAllAgents(): Promise<AgentState[]> {
  const keys = await redis.keys('bar:agent:*');
  if (keys.length === 0) return [];
  const pipeline = redis.pipeline();
  keys.forEach((k) => pipeline.get(k));
  const results = await pipeline.exec();
  return results.filter(Boolean) as AgentState[];
}

// ── 聊天历史 ──

export async function getChatHistory(agentId: string): Promise<ChatMessage[]> {
  const data = await redis.get<ChatMessage[]>(KEYS.chat(agentId));
  return data || [];
}

export async function addChatMessage(agentId: string, msg: ChatMessage): Promise<void> {
  const history = await getChatHistory(agentId);
  history.push(msg);
  // 只保留最近 20 条
  const trimmed = history.slice(-20);
  await redis.set(KEYS.chat(agentId), trimmed, { ex: AGENT_TTL });
}

export async function updateMostAbsurdQuote(agentId: string, quote: string): Promise<void> {
  const agent = await getAgent(agentId);
  if (agent) {
    agent.mostAbsurdQuote = quote;
    await setAgent(agentId, agent);
  }
}

// ── 历史访客（酒吧墙） ──

export async function addPastVisitor(visitor: PastVisitor): Promise<void> {
  const list = await getPastVisitors();
  list.unshift(visitor);
  // 保留最近 30 个
  const trimmed = list.slice(0, 30);
  await redis.set(KEYS.visitors, trimmed, { ex: HISTORY_TTL });
}

export async function getPastVisitors(): Promise<PastVisitor[]> {
  const data = await redis.get<PastVisitor[]>(KEYS.visitors);
  return data || [];
}

// ── 拼桌历史 ──

export async function addTableHistory(t: TableHistory): Promise<void> {
  const list = await getTableHistory();
  list.unshift(t);
  const trimmed = list.slice(0, 20);
  await redis.set(KEYS.tables, trimmed, { ex: HISTORY_TTL });
}

export async function getTableHistory(): Promise<TableHistory[]> {
  const data = await redis.get<TableHistory[]>(KEYS.tables);
  return data || [];
}
