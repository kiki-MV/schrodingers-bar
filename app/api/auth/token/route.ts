import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/secondme';

/** 手动授权码交换（备用，主流程走 /api/auth/callback） */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '请提供授权码' }, { status: 400 });
    }

    const clientId = process.env.SECONDME_CLIENT_ID!;
    const clientSecret = process.env.SECONDME_CLIENT_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    const data = await exchangeCode(code, clientId, clientSecret, redirectUri);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
