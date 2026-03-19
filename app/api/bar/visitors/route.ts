import { NextResponse } from 'next/server';
import { getAllAgents, getPastVisitors } from '@/lib/state';

export async function GET() {
  const current = (await getAllAgents()).map((a) => ({
    agentName: a.profile.name,
    agentAvatar: a.profile.avatar,
    drunkLevel: a.drunkLevel,
    drinks: a.activeDrinks.map((d) => ({ emoji: d.emoji, name: d.drinkName, color: '' })),
    isHere: true,
  }));

  return NextResponse.json({
    current,
    past: await getPastVisitors(),
  });
}
