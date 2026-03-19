import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/secondme';

/**
 * OAuth2 回调 — SecondMe 授权后重定向到这里
 * GET /api/auth/callback?code=lba_ac_xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  // 用户拒绝授权
  if (error) {
    const desc = req.nextUrl.searchParams.get('error_description') || '授权被拒绝';
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(desc)}`, req.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth?error=未收到授权码', req.url),
    );
  }

  const clientId = process.env.SECONDME_CLIENT_ID!;
  const clientSecret = process.env.SECONDME_CLIENT_SECRET!;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

  try {
    const tokenData = await exchangeCode(code, clientId, clientSecret, redirectUri);

    // 将 token 通过 URL hash 传给前端（不暴露在 query string 中）
    const params = new URLSearchParams({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken || '',
      expiresIn: String(tokenData.expiresIn || 7200),
    });

    return NextResponse.redirect(
      new URL(`/auth/success?${params.toString()}`, req.url),
    );
  } catch (e: any) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(e.message)}`, req.url),
    );
  }
}
