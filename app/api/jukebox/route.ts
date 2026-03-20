import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId } from '@/lib/secondme';
import { getCoins, spendCoins } from '@/lib/coins';
import { TRACKS } from '@/lib/jukebox';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { trackId } = await req.json();
    const track = TRACKS.find(t => t.id === trackId);
    if (!track) return NextResponse.json({ error: '曲目不存在' }, { status: 404 });

    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const userId = userInfo.userId || agentId;

    const remaining = await spendCoins(userId, track.price);
    if (remaining < 0) {
      const coins = await getCoins(userId);
      return NextResponse.json({
        error: `金币不足！这首要 ${track.price} 金币，你还剩 ${coins} 金币`,
        coins,
      }, { status: 400 });
    }

    return NextResponse.json({ ok: true, coins: remaining });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
