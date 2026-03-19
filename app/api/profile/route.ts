import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo } from '@/lib/secondme';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  try {
    const userInfo = await fetchUserInfo(token);
    return NextResponse.json(userInfo);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
