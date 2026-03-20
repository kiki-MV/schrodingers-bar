import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId } from '@/lib/secondme';
import { getAgent, getChatHistory, addPastVisitor, getPastVisitors } from '@/lib/state';
import { generateQuantumNumber } from '@/lib/quantum';

/**
 * 自动肖像 — 聊天 3 轮后后台调用
 * 1. 创建 PastVisitor 记录（上墙）
 * 2. 触发 AI 生图（异步，不阻塞）
 * 3. 不删除 Agent 状态（用户可以继续聊）
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent 不在场' }, { status: 400 });

    // 检查是否已经上过墙（避免重复）
    const existing = await getPastVisitors();
    const alreadyOnWall = existing.some(
      (v) => v.agentName === agent.profile.name && Date.now() - v.leftAt < 3600000,
    );
    if (alreadyOnWall) return NextResponse.json({ ok: true, alreadyDone: true });

    // 从聊天历史找金句
    const chatHistory = await getChatHistory(agentId);
    const agentMessages = chatHistory.filter((m) => m.role === 'agent' && m.content.length > 5);
    const bestQuote = agentMessages.length > 0
      ? agentMessages.reduce((best, m) => m.content.length > best.content.length ? m : best).content
      : agent.mostAbsurdQuote || '（今晚出奇地安静）';

    const visitorId = crypto.randomUUID();

    // 先上墙（无图版本，图片后续异步补上）
    await addPastVisitor({
      id: visitorId,
      agentName: agent.profile.name,
      agentAvatar: agent.profile.avatar,
      drinks: agent.activeDrinks.map((d) => ({
        emoji: d.emoji, name: d.drinkName, color: '#a855f7',
      })),
      drunkLevel: agent.drunkLevel,
      mostAbsurdQuote: bestQuote,
      leftAt: Date.now(),
      quantumNumber: generateQuantumNumber(),
    });

    // 异步生图（不阻塞响应）
    generateImageAsync(token, visitorId, agent, bestQuote).catch((e) =>
      console.error('[AutoPortrait] image gen failed:', e.message),
    );

    return NextResponse.json({ ok: true, visitorId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** 后台生图 + 更新访客墙缩略图 */
async function generateImageAsync(
  token: string, visitorId: string,
  agent: any, quote: string,
) {
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // 调用已有的 generate-image API
  const res = await fetch(`${origin}/api/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      quote,
      drunkLevel: agent.drunkLevel,
      drinks: agent.activeDrinks.map((d: any) => ({
        name: d.drinkName, emoji: d.emoji,
      })),
    }),
  });

  if (!res.ok) return;
  const data = await res.json();
  if (!data.image) return;

  // 把图片同步到访客墙
  await fetch(`${origin}/api/bar/visitors/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      image: data.image,
      thumbnail: data.thumbnail,
      prompt: data.prompt,
    }),
  });
}
