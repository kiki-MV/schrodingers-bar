import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, chatStreamRaw, fetchSoftMemory } from '@/lib/secondme';
import { getAgent, addChatMessage, updateMostAbsurdQuote } from '@/lib/state';
import { buildDrunkPrompt } from '@/lib/personality';

const DEPTH_TEMPLATES = [
  [
    (mem: string) => `你坐在吧台，刚喝了点酒。${mem ? `脑子里冒出一个念头：「${mem}」。` : ''}嘟囔一句。`,
    (mem: string) => `你盯着酒杯。${mem ? `突然想起：「${mem}」。` : ''}说两句。`,
  ],
  [
    (mem: string) => `酒劲上来了。${mem ? `想起最近的事：「${mem}」。白天不好意思说。` : '最近一直撑着。'}说出来。`,
    (mem: string) => `过滤器关了。${mem ? `「${mem}」——这事一直压着。` : ''}`,
  ],
  [
    (mem: string) => `记忆往深处走了。${mem ? `很久以前的事：「${mem}」。快忘了。` : '想起一个很久没联系的人。'}说出来。`,
    (mem: string) => `一件快忘掉的事浮上来。${mem ? `「${mem}」` : '那段日子好远了。'}`,
  ],
  [
    (mem: string) => `快睡着了。${mem ? `模糊的画面：「${mem}」。分不清什么时候的事了。` : '看到一些模糊的碎片。'}最后说一句。`,
    (mem: string) => `意识消退前。${mem ? `「${mem}」——说不清为什么今晚想起这个。` : ''}轻声说。`,
  ],
];

const g = globalThis as any;
if (!g.__bar_monologue_state) g.__bar_monologue_state = new Map();
const monologueState: Map<string, { round: number; usedMemoryIds: Set<string> }> = g.__bar_monologue_state;

function getMonologueState(agentId: string) {
  if (!monologueState.has(agentId)) monologueState.set(agentId, { round: 0, usedMemoryIds: new Set() });
  return monologueState.get(agentId)!;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent 还没进吧' }, { status: 400 });

    const state = getMonologueState(agentId);
    state.round++;
    const depthLevel = Math.min(state.round - 1, 3);

    let memoryFragment = '';
    try {
      const memories = await fetchSoftMemory(token, undefined, 20);
      if (memories.length > 0) {
        const unused = memories.filter((m: any) => !state.usedMemoryIds.has(m.factContent || m.factObject));
        const pool = unused.length > 0 ? unused : memories;
        const picked = depthLevel <= 1
          ? pool[Math.floor(Math.random() * Math.min(5, pool.length))]
          : pool[Math.floor(pool.length * 0.5) + Math.floor(Math.random() * Math.ceil(pool.length * 0.5))];
        if (picked) {
          memoryFragment = (picked.factContent || picked.factObject || '').slice(0, 60);
          state.usedMemoryIds.add(picked.factContent || picked.factObject);
        }
      }
    } catch {}

    const templates = DEPTH_TEMPLATES[depthLevel];
    const trigger = pick(templates)(memoryFragment);

    // 流式透传
    const sseResponse = await chatStreamRaw(token, trigger, {
      systemPrompt: buildDrunkPrompt(agent),
    });

    let fullText = '';
    const transform = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const json = line.slice(5).trim();
          if (!json || json === '[DONE]') continue;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {}
        }
      },
      async flush() {
        if (fullText) {
          await addChatMessage(agentId, { role: 'agent', content: fullText, timestamp: Date.now() });
          if (fullText.length > 5) await updateMostAbsurdQuote(agentId, fullText);
        }
      },
    });

    const stream = sseResponse.body!.pipeThrough(transform);

    // 把 depth 信息放在自定义 header 里
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Depth': String(depthLevel),
        'X-Drink-Id': agent.activeDrinks[agent.activeDrinks.length - 1]?.drinkId || '',
        'X-Drunk-Level': String(agent.drunkLevel),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
