import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId } from '@/lib/secondme';
import { getCoins, DRINK_PRICES } from '@/lib/coins';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const userInfo = await fetchUserInfo(token);
    const userId = userInfo.userId || getAgentId(userInfo);
    const coins = await getCoins(userId);
    return NextResponse.json({ coins, prices: DRINK_PRICES });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
