import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, chat, fetchSoftMemory } from '@/lib/secondme';
import { getAgent, addChatMessage, updateMostAbsurdQuote } from '@/lib/state';
import { buildDrunkPrompt } from '@/lib/personality';

/**
 * 独白深度层级 — 随轮次递进，越往后越深
 *
 * 第 1 轮：此刻（bar 场景、今天的事）
 * 第 2 轮：近期（最近发生的事，工作上的事）
 * 第 3 轮：记忆深处（很久以前的事，老朋友，旧时光）
 * 第 4 轮：午夜梦回（童年、故乡、遗憾、模糊的片段）
 */

// 用 globalThis 追踪每个 agent 的独白轮次和已用记忆
const g = globalThis as any;
if (!g.__bar_monologue_state) g.__bar_monologue_state = new Map();
const monologueState: Map<string, { round: number; usedMemoryIds: Set<string> }> = g.__bar_monologue_state;

function getMonologueState(agentId: string) {
  if (!monologueState.has(agentId)) {
    monologueState.set(agentId, { round: 0, usedMemoryIds: new Set() });
  }
  return monologueState.get(agentId)!;
}

// 不同深度的触发模板 — AI 分身 = 主人的延伸，「我」就是主人的「我」
const DEPTH_TEMPLATES = [
  // 第 1 层：此刻（微醺，聊眼前的事、今天的感受）
  [
    (mem: string) => `你坐在吧台，刚喝了点酒。${mem ? `脑子里冒出一个念头：「${mem}」。` : '你感觉今天积攒的情绪开始冒泡了。'}顺着这个念头，自言自语几句。`,
    (mem: string) => `你盯着酒杯里的霓虹倒影。${mem ? `突然想起：「${mem}」。` : ''}忍不住嘟囔了几句。`,
  ],
  // 第 2 层：近期（白天不好意思说的话，压着的情绪）
  [
    (mem: string) => `酒劲让你放松了。${mem ? `你想起了最近的事：「${mem}」。白天不太好意思说，但现在没什么好装的了。` : '最近一直撑着，今晚终于可以卸下来了。'}说出来吧。`,
    (mem: string) => `平时你会过滤掉这些想法，但今晚过滤器关了。${mem ? `一件最近的事浮上来：「${mem}」。` : '有些事一直压在心里没说过。'}`,
  ],
  // 第 3 层：记忆深处（很久以前的事，老朋友，旧时光）
  [
    (mem: string) => `酒精让你的记忆往更深处走了。${mem ? `一件很久以前的事突然浮上来：「${mem}」。你都快忘了这件事了。` : '你想起了一个很久没联系的人，一段快要褪色的记忆。'}慢慢说出来。`,
    (mem: string) => `不知道为什么，你突然想起一件快要忘掉的事。${mem ? `「${mem}」——这个记忆好像从很深的地方浮上来的。` : '那段日子离现在好远了。'}声音比刚才轻了很多。`,
  ],
  // 第 4 层：午夜梦回（最深处的东西，模糊的、珍贵的、遗憾的）
  [
    (mem: string) => `已经很晚了。你半趴在吧台上，意识模糊。${mem ? `一个很远很远的画面浮现出来：「${mem}」。你分不清这是什么时候的事了，但情绪很重。` : '脑海里出现了一些很模糊的画面——可能是很小的时候，可能是某个已经回不去的地方。'}用最后一点清醒说出来。`,
    (mem: string) => `你快要睡着了。在意识消退前，${mem ? `一个被压在最底层的记忆突然亮了起来：「${mem}」。你说不清为什么今晚会想起这个。` : '你看到了一些无法分类的碎片——不确定是真实的回忆还是梦。'}轻声说出来吧，反正明天也不会记得。`,
  ],
];

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = getAgent(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent 还没进吧' }, { status: 400 });

    const state = getMonologueState(agentId);
    state.round++;

    // 决定当前深度层级（0-3）
    const depthLevel = Math.min(state.round - 1, 3);

    // 从 SecondMe 拉取真实记忆
    let memoryFragment = '';
    try {
      const memories = await fetchSoftMemory(token);
      if (memories.length > 0) {
        // 过滤掉已使用的记忆
        const unused = memories.filter(
          (m: any) => !state.usedMemoryIds.has(m.factContent || m.factObject),
        );
        const pool = unused.length > 0 ? unused : memories;

        // 根据深度选择不同的记忆
        let picked;
        if (depthLevel <= 1) {
          // 浅层：取最近的记忆
          picked = pool[Math.floor(Math.random() * Math.min(5, pool.length))];
        } else {
          // 深层：取更早的记忆（列表后面的通常更旧）
          const deepStart = Math.floor(pool.length * 0.5);
          picked = pool[deepStart + Math.floor(Math.random() * (pool.length - deepStart))];
        }

        if (picked) {
          memoryFragment = picked.factContent || picked.factObject || '';
          // 截取合理长度
          if (memoryFragment.length > 80) memoryFragment = memoryFragment.slice(0, 80) + '…';
          state.usedMemoryIds.add(picked.factContent || picked.factObject);
        }
      }
    } catch {
      // 记忆获取失败，继续不用记忆
    }

    // 选择触发模板
    const templates = DEPTH_TEMPLATES[depthLevel];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const trigger = template(memoryFragment);

    // 调用 SecondMe Chat，注入酒效 + 记忆触发
    const reply = await chat(token, trigger, {
      systemPrompt: buildDrunkPrompt(agent),
    });

    addChatMessage(agentId, { role: 'agent', content: reply, timestamp: Date.now() });
    if (reply.length > 10) updateMostAbsurdQuote(agentId, reply);

    const lastDrink = agent.activeDrinks[agent.activeDrinks.length - 1];
    return NextResponse.json({
      reply,
      depth: depthLevel,
      round: state.round,
      hasMemory: !!memoryFragment,
      drinkId: lastDrink?.drinkId || '',
      agentState: { drunkLevel: agent.drunkLevel, totalDrinks: agent.activeDrinks.length },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
