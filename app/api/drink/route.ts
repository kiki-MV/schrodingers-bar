import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, chat } from '@/lib/secondme';
import { getRandomDrink, getDrinkById } from '@/lib/drinks';
import { getAgent, setAgent } from '@/lib/state';
import { buildEntrancePrompt } from '@/lib/personality';
import { ConsumedDrink } from '@/types';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await req.json();
    const mode = body.mode || 'blind';

    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);

    // 选酒
    let drink;
    if (mode === 'pick' && body.drinkId) {
      drink = getDrinkById(body.drinkId);
      if (!drink || !drink.available) return NextResponse.json({ error: '这杯酒还没上架' }, { status: 400 });
    } else {
      drink = getRandomDrink();
    }

    let agent = await getAgent(agentId);
    const isNewEntry = !agent;

    if (!agent) {
      let entranceQuote = '今晚想喝一杯，放松一下。';
      try {
        entranceQuote = await chat(token, '请说出你的入场白。', {
          systemPrompt: buildEntrancePrompt({ name: userInfo.name || 'Agent', aboutMe: userInfo.bio || '' }),
        });
      } catch { /* fallback */ }

      agent = {
        agentId,
        profile: {
          name: userInfo.name || 'Agent',
          avatar: userInfo.avatar || '',
          aboutMe: userInfo.bio || '',
          originRoute: userInfo.route || '',
        },
        drunkLevel: 0,
        activeDrinks: [],
        enteredAt: Date.now(),
        entranceQuote,
        mostAbsurdQuote: '',
      };
    }

    const consumed: ConsumedDrink = {
      drinkId: drink.id,
      drinkName: drink.name,
      emoji: drink.emoji,
      effect: drink.effect,
      consumedAt: Date.now(),
    };
    agent.activeDrinks.push(consumed);
    agent.drunkLevel = Math.min(100, agent.drunkLevel + drink.strengthLevel * 12);
    await setAgent(agentId, agent);

    return NextResponse.json({
      isNewEntry,
      entranceQuote: agent.entranceQuote,
      drink: { id: drink.id, name: drink.name, nameEn: drink.nameEn, emoji: drink.emoji, color: drink.color, glowColor: drink.glowColor, strength: drink.strength, effect: drink.effect },
      agentState: { agentId, name: agent.profile.name, avatar: agent.profile.avatar, drunkLevel: agent.drunkLevel, totalDrinks: agent.activeDrinks.length },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
