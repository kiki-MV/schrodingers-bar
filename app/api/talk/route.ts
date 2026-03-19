import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, chat } from '@/lib/secondme';
import { getAgent, addChatMessage, updateMostAbsurdQuote } from '@/lib/state';
import { buildDrunkPrompt } from '@/lib/personality';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: '请输入消息' }, { status: 400 });

    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = getAgent(agentId);

    if (!agent) return NextResponse.json({ error: 'Agent 还没进吧，先喝一杯吧' }, { status: 400 });

    addChatMessage(agentId, { role: 'user', content: message, timestamp: Date.now() });

    const reply = await chat(token, message, { systemPrompt: buildDrunkPrompt(agent) });

    addChatMessage(agentId, { role: 'agent', content: reply, timestamp: Date.now() });

    if (reply.length > 10) updateMostAbsurdQuote(agentId, reply);

    return NextResponse.json({
      reply,
      agentState: { drunkLevel: agent.drunkLevel, totalDrinks: agent.activeDrinks.length },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
