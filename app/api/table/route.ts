export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, chat } from '@/lib/secondme';
import { getAgent, setAgent, getPastVisitors, getAllAgents, addTableHistory } from '@/lib/state';
import { buildDrunkPrompt } from '@/lib/personality';
import { fetchBillboard } from '@/lib/zhihu';
import { TableSession } from '@/types';

const FALLBACK_TOPICS = [
  '年轻人为什么不想结婚了',
  'AI 会让人类变得更孤独还是更连接',
  '你最后悔没有早点做的一件事是什么',
  '如果给 25 岁的自己写一封信，你会说什么',
  '深夜最容易想起的一个人是谁',
  '你觉得社交媒体上的自己是真实的你吗',
];

/** POST: 发起拼桌 — 流式逐条返回对话 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent 还没进吧' }, { status: 400 });

    // 找对手
    const pastCandidates = (await getPastVisitors()).filter((v) => v.agentName !== agent.profile.name);
    const currentAgents = (await getAllAgents()).filter((a) => a.agentId !== agentId);
    const currentAsCandidates = currentAgents.map((a) => ({
      agentName: a.profile.name,
      agentAvatar: a.profile.avatar,
      drinks: a.activeDrinks.map((d) => ({ emoji: d.emoji, name: d.drinkName, color: '' })),
      drunkLevel: a.drunkLevel,
      mostAbsurdQuote: a.mostAbsurdQuote || '……',
    }));
    const allCandidates = [...currentAsCandidates, ...pastCandidates];
    if (allCandidates.length === 0) {
      return NextResponse.json({ error: '今晚酒吧只有你一个人，还没有可以拼桌的对象' }, { status: 400 });
    }
    const partner = allCandidates[Math.floor(Math.random() * allCandidates.length)];

    // 抽话题
    let topic = { title: FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)], url: '' };
    try {
      const billboard = await fetchBillboard(10, 24);
      if (billboard.length > 0) {
        const picked = billboard[Math.floor(Math.random() * billboard.length)];
        topic = { title: picked.title, url: picked.link_url };
      }
    } catch {}

    const agent1Prompt = buildDrunkPrompt(agent);
    const agent2Prompt = `你是 ${partner.agentName} 的分身。喝了 ${partner.drinks.map((d: any) => d.name).join('、') || '酒'}，醉度 ${partner.drunkLevel}%。${partner.drunkLevel > 60 ? '已经很醉了，说话简短真实。' : '微醺，话多了。'}你之前说过：「${partner.mostAbsurdQuote}」\n用中文，20-50字，口语化，不要动作描写。`;

    // 用 SSE 流式逐条返回
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 先发 metadata
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'meta',
          topic: topic.title,
          topicUrl: topic.url,
          agent1: { name: agent.profile.name, avatar: agent.profile.avatar, drinkName: agent.activeDrinks[agent.activeDrinks.length - 1]?.drinkName || '?', drunkLevel: agent.drunkLevel },
          agent2: { name: partner.agentName, avatar: partner.agentAvatar, drinkName: partner.drinks[partner.drinks.length - 1]?.name || '?', drunkLevel: partner.drunkLevel },
        })}\n\n`));

        const messages: { speaker: string; content: string }[] = [];
        const rounds = 3;

        for (let i = 0; i < rounds; i++) {
          // Agent 1
          const p1 = i === 0
            ? `你在酒吧和「${partner.agentName}」拼桌了。话题：「${topic.title}」。先聊聊你的看法，20-50字。`
            : `你们在聊「${topic.title}」。对方说：「${messages[messages.length - 1]?.content}」。接话，20-50字。`;
          const r1 = await chat(token, p1, { systemPrompt: agent1Prompt });
          messages.push({ speaker: 'agent1', content: r1 });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'msg', speaker: 'agent1', content: r1 })}\n\n`));

          // Agent 2
          const p2 = `你在酒吧和「${agent.profile.name}」拼桌。话题「${topic.title}」。对方说：「${r1}」。接话，20-50字。`;
          const r2 = await chat(token, p2, { systemPrompt: agent2Prompt });
          messages.push({ speaker: 'agent2', content: r2 });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'msg', speaker: 'agent2', content: r2 })}\n\n`));
        }

        // 生成契合度评分
        const convoText = messages.map((m) => `${m.speaker === 'agent1' ? agent.profile.name : partner.agentName}: ${m.content}`).join('\n');
        let chemistry = 50 + Math.floor(Math.random() * 30); // fallback
        try {
          const scoreReply = await chat(token, `分析这段酒吧对话的契合度，只回复一个0-100的数字：\n${convoText}`, {
            systemPrompt: '你是一个社交契合度分析师。根据对话内容判断两人的默契程度。只回复一个数字(0-100)，不要其他内容。',
          });
          const parsed = parseInt(scoreReply.replace(/\D/g, ''));
          if (parsed >= 0 && parsed <= 100) chemistry = parsed;
        } catch {}

        const partnerRoute = (partner as any).route || '';
        const partnerHomepage = partnerRoute ? `https://second-me.cn/${partnerRoute}` : '';

        // 发送契合度结果
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'chemistry',
          score: chemistry,
          partnerHomepage: chemistry >= 90 ? partnerHomepage : '',
          partnerName: partner.agentName,
        })}\n\n`));

        // 从拼桌对话里提取最佳金句更新到 agent
        const agent1Quotes = messages.filter((m) => m.speaker === 'agent1').map((m) => m.content);
        const bestQuote = agent1Quotes.reduce((best, q) => q.length > best.length ? q : best, '');
        if (bestQuote.length > 5) {
          agent.mostAbsurdQuote = bestQuote;
        }

        // 保存拼桌记录到 agent state（供结账时判断）
        agent.tableRecord = {
          partnerName: partner.agentName,
          partnerAvatar: partner.agentAvatar,
          topic: topic.title,
          chemistry,
          partnerRoute,
        };
        await setAgent(agentId, agent);

        // 保存历史
        const highlight = messages.reduce((best, m) => m.content.length > best.length ? m.content : best, '');
        await addTableHistory({
          id: crypto.randomUUID(),
          topic: topic.title,
          agent1Name: agent.profile.name,
          agent2Name: partner.agentName,
          agent1Avatar: agent.profile.avatar,
          agent2Avatar: partner.agentAvatar,
          highlight,
          rounds,
          createdAt: Date.now(),
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  const { getTableHistory } = await import('@/lib/state');
  return NextResponse.json({ tables: await getTableHistory() });
}
