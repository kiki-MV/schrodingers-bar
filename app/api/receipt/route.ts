import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId } from '@/lib/secondme';
import { getAgent, getChatHistory, removeAgent, addPastVisitor } from '@/lib/state';
import { generateQuantumNumber, generateHangoverWarning, generateSettlement, getQuantumPhrase } from '@/lib/quantum';
import { Receipt } from '@/types';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent 还没进吧' }, { status: 400 });
    }

    const now = new Date();

    const receipt: Receipt = {
      id: crypto.randomUUID(),
      quantumNumber: generateQuantumNumber(),
      agentName: agent.profile.name,
      agentAvatar: agent.profile.avatar,
      enteredAt: new Date(agent.enteredAt).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      leftAt: now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      drinks: agent.activeDrinks.map((d) => {
        const drinkDef = require('@/lib/drinks').getDrinkById(d.drinkId);
        return {
          name: d.drinkName,
          emoji: d.emoji,
          effect: d.effect,
          count: 1,
          color: drinkDef?.color || '#a855f7',
          glowColor: drinkDef?.glowColor || '#a855f7',
        };
      }),
      totalDrunkLevel: agent.drunkLevel,
      mostAbsurdQuote: agent.mostAbsurdQuote || '（今晚出奇地安静）',
      tableRecord: agent.tableRecord,
      hangoverWarning: generateHangoverWarning(
        agent.activeDrinks.map((d) => d.drinkName),
      ),
      settlementNote: generateSettlement(
        agent.activeDrinks.length,
        agent.profile.name,
      ),
    };

    // 取预生成的图片
    let pregenImage: { image: string; prompt: string; thumbnail?: string } | undefined;
    try {
      const { getPregenImage, clearPregenImage } = await import('@/app/api/bar/visitors/image/route');
      const cached = await getPregenImage();
      if (cached) {
        pregenImage = cached;
        await clearPregenImage();
      }
    } catch {}

    // 保存到酒吧墙
    await addPastVisitor({
      id: receipt.id,
      agentName: receipt.agentName,
      agentAvatar: receipt.agentAvatar,
      drinks: receipt.drinks.map((d) => ({
        emoji: d.emoji,
        name: d.name,
        color: (d as any).color || '#a855f7',
      })),
      drunkLevel: receipt.totalDrunkLevel,
      mostAbsurdQuote: receipt.mostAbsurdQuote,
      leftAt: Date.now(),
      quantumNumber: receipt.quantumNumber,
      thumbnail: (pregenImage as any)?.thumbnail,
      imagePrompt: pregenImage?.prompt,
    });

    // 清除 agent 状态（离场）
    await removeAgent(agentId);

    return NextResponse.json({
      receipt,
      quantumPhrase: getQuantumPhrase(),
      generatedImage: pregenImage?.image || null,
      tableRecord: agent.tableRecord || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
