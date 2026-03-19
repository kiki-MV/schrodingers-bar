import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId } from '@/lib/secondme';
import { getAgent, getChatHistory, removeAgent, addPastVisitor, getTableHistory } from '@/lib/state';
import { generateQuantumNumber, generateHangoverWarning, generateSettlement, getQuantumPhrase } from '@/lib/quantum';
import { Receipt } from '@/types';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent 还没进吧' }, { status: 400 });

    // 从聊天历史里找最佳金句（不依赖 mostAbsurdQuote 可能没存上）
    const chatHistory = await getChatHistory(agentId);
    const agentMessages = chatHistory.filter((m) => m.role === 'agent' && m.content.length > 5);
    const bestQuote = agentMessages.length > 0
      ? agentMessages.reduce((best, m) => m.content.length > best.content.length ? m : best).content
      : agent.mostAbsurdQuote;

    // 从拼桌历史里找这个 agent 的拼桌记录
    const tableHistories = await getTableHistory();
    const myTable = tableHistories.find(
      (t) => t.agent1Name === agent.profile.name || t.agent2Name === agent.profile.name,
    );
    const tableRecord = agent.tableRecord || (myTable ? {
      partnerName: myTable.agent1Name === agent.profile.name ? myTable.agent2Name : myTable.agent1Name,
      partnerAvatar: myTable.agent1Name === agent.profile.name ? myTable.agent2Avatar : myTable.agent1Avatar,
      topic: myTable.topic,
      chemistry: 75,
    } : undefined);

    const finalQuote = bestQuote || '（今晚出奇地安静）';
    const now = new Date();

    const receipt: Receipt = {
      id: crypto.randomUUID(),
      quantumNumber: generateQuantumNumber(),
      agentName: agent.profile.name,
      agentAvatar: agent.profile.avatar,
      enteredAt: new Date(agent.enteredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      leftAt: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      drinks: agent.activeDrinks.map((d) => {
        const drinkDef = require('@/lib/drinks').getDrinkById(d.drinkId);
        return {
          name: d.drinkName, emoji: d.emoji, effect: d.effect, count: 1,
          color: drinkDef?.color || '#a855f7', glowColor: drinkDef?.glowColor || '#a855f7',
        };
      }),
      totalDrunkLevel: agent.drunkLevel,
      mostAbsurdQuote: finalQuote,
      tableRecord,
      hangoverWarning: generateHangoverWarning(agent.activeDrinks.map((d) => d.drinkName)),
      settlementNote: generateSettlement(agent.activeDrinks.length, agent.profile.name),
    };

    // 保存到酒吧墙
    await addPastVisitor({
      id: receipt.id,
      agentName: receipt.agentName,
      agentAvatar: receipt.agentAvatar,
      drinks: receipt.drinks.map((d) => ({ emoji: d.emoji, name: d.name, color: (d as any).color || '#a855f7' })),
      drunkLevel: receipt.totalDrunkLevel,
      mostAbsurdQuote: finalQuote,
      leftAt: Date.now(),
      quantumNumber: receipt.quantumNumber,
    });

    await removeAgent(agentId);

    return NextResponse.json({
      receipt,
      quantumPhrase: getQuantumPhrase(),
      generatedImage: null,
      tableRecord: tableRecord || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
