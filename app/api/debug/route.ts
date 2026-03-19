import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.mindverse.com/gate/lab';

/** 调试端点 — 直接测试 SecondMe Chat API，返回原始响应 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '需要 token' }, { status: 401 });
  }

  // 1. 先测试 user info
  let userInfo;
  try {
    const res = await fetch(`${BASE_URL}/api/secondme/user/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = await res.text();
    userInfo = { status: res.status, body: raw };
  } catch (e: any) {
    userInfo = { error: e.message };
  }

  // 2. 测试 chat/stream
  let chatResult;
  try {
    const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-App-Id': 'schrodingers-bar',
      },
      body: JSON.stringify({
        message: '你好，今晚想喝点什么？',
        systemPrompt: '你在一家酒吧里，用中文简短回复。',
      }),
    });
    const raw = await res.text();
    chatResult = { status: res.status, headers: Object.fromEntries(res.headers), body: raw.slice(0, 2000) };
  } catch (e: any) {
    chatResult = { error: e.message };
  }

  return NextResponse.json({ userInfo, chatResult }, { status: 200 });
}
