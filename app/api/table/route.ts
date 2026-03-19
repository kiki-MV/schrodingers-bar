import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, chat } from '@/lib/secondme';
import { getAgent, getPastVisitors, addTableHistory } from '@/lib/state';
import { buildDrunkPrompt } from '@/lib/personality';
import { fetchBillboard, HotTopic } from '@/lib/zhihu';
import { TableSession } from '@/types';

const FALLBACK_TOPICS = [
  '年轻人为什么不想结婚了',
  '996 和 work-life balance 到底怎么选',
  '如果可以重来，你会选择什么职业',
  'AI 会让人类变得更孤独还是更连接',
  '你最后悔没有早点做的一件事是什么',
  '独居的人如何对抗深夜的孤独感',
  '你觉得社交媒体上的自己是真实的你吗',
  '如果给 25 岁的自己写一封信，你会说什么',
];

/** POST: 发起拼桌 — 当前 Agent + 随机匹配一个历史访客 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent 还没进吧' }, { status: 400 });

    // 找一个对手 (从历史访客里挑)
    const visitors = (await getPastVisitors()).filter((v) => v.agentName !== agent.profile.name);
    if (visitors.length === 0) {
      return NextResponse.json({ error: '今晚酒吧只有你一个人，还没有可以拼桌的对象' }, { status: 400 });
    }
    const partner = visitors[Math.floor(Math.random() * visitors.length)];

    // 抽话题 — 优先知乎热榜，fallback 用预设
    let topic: { title: string; url?: string } = {
      title: FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)],
    };
    try {
      const billboard = await fetchBillboard(10, 24);
      if (billboard.length > 0) {
        const picked = billboard[Math.floor(Math.random() * billboard.length)];
        topic = { title: picked.title, url: picked.link_url };
      }
    } catch {
      // fallback to preset
    }

    // 构造两个 Agent 的 prompt
    const agent1Prompt = buildDrunkPrompt(agent);
    const agent2Prompt = buildFakePartnerPrompt(partner);

    // 对话编排：5 轮，交替发言
    const session: TableSession = {
      id: crypto.randomUUID(),
      topic: topic.title,
      topicUrl: topic.url,
      agent1: {
        name: agent.profile.name,
        avatar: agent.profile.avatar,
        drinkName: agent.activeDrinks[agent.activeDrinks.length - 1]?.drinkName || '???',
        drunkLevel: agent.drunkLevel,
      },
      agent2: {
        name: partner.agentName,
        avatar: partner.agentAvatar,
        drinkName: partner.drinks[partner.drinks.length - 1]?.name || '???',
        drunkLevel: partner.drunkLevel,
      },
      messages: [],
      status: 'chatting',
      createdAt: Date.now(),
    };

    const rounds = 5;
    let context = `话题：${topic.title}\n`;

    for (let i = 0; i < rounds; i++) {
      // Agent 1 (当前用户的分身) 先说
      const prompt1 = i === 0
        ? `你在酒吧里和另一个 Agent「${partner.agentName}」拼桌了。酒吧丢了一个话题给你们：「${topic.title}」。先开个头聊聊你的看法，20-50字，口语化。`
        : `你们在聊「${topic.title}」。对方刚说：「${session.messages[session.messages.length - 1]?.content}」。接着聊，20-50字。`;

      const reply1 = await chat(token, prompt1, { systemPrompt: agent1Prompt });
      session.messages.push({ speaker: 'agent1', content: reply1 });
      context += `${agent.profile.name}: ${reply1}\n`;

      // Agent 2 (历史访客，用模拟 prompt)
      const prompt2 = `你在酒吧里和「${agent.profile.name}」拼桌。话题是「${topic.title}」。对方刚说：「${reply1}」。以你的风格接话，20-50字，口语化。`;
      const reply2 = await chat(token, prompt2, { systemPrompt: agent2Prompt });
      session.messages.push({ speaker: 'agent2', content: reply2 });
      context += `${partner.agentName}: ${reply2}\n`;
    }

    session.status = 'done';

    // 保存拼桌历史
    const highlight = session.messages.reduce(
      (best, m) => (m.content.length > best.length ? m.content : best),
      '',
    );
    await addTableHistory({
      id: session.id,
      topic: topic.title,
      agent1Name: agent.profile.name,
      agent2Name: partner.agentName,
      agent1Avatar: agent.profile.avatar,
      agent2Avatar: partner.agentAvatar,
      highlight,
      rounds,
      createdAt: Date.now(),
    });

    return NextResponse.json({ session });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** 为历史访客构建一个模拟的醉态 prompt */
function buildFakePartnerPrompt(visitor: {
  agentName: string;
  drinks: { name: string }[];
  drunkLevel: number;
  mostAbsurdQuote: string;
}): string {
  const drinkNames = visitor.drinks.map((d) => d.name).join('、');
  return `你是 ${visitor.agentName} 的分身。你今晚在薛定谔酒吧喝了 ${drinkNames}，醉度 ${visitor.drunkLevel}%。
${visitor.drunkLevel > 60 ? '你已经很醉了，说话简短、情绪化、真实。' : '你微微醉了，话变多了。'}
你之前说过这样的话：「${visitor.mostAbsurdQuote}」
用中文回复，20-50字，口语化，像喝醉了在跟酒友聊天。不要写动作描写。`;
}

/** GET: 获取拼桌历史 */
export async function GET() {
  const { getTableHistory } = await import('@/lib/state');
  return NextResponse.json({ tables: await getTableHistory() });
}
