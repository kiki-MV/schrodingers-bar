/**
 * SecondMe A2A Platform API
 * 文档: https://develop-docs.second.me/zh/docs/api-reference/secondme
 */

const BASE_URL = 'https://api.mindverse.com/gate/lab';
const AUTH_PAGE = 'https://go.second.me/oauth/';

// ============ OAuth2 ============

export function getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });
  return `${AUTH_PAGE}?${params.toString()}`;
}

export async function exchangeCode(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${BASE_URL}/api/oauth/token/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || `OAuth 失败 (${data.subCode})`);
  return data.data;
}

// ============ User Info ============

export async function fetchUserInfo(accessToken: string) {
  const res = await fetch(`${BASE_URL}/api/secondme/user/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || '获取用户信息失败');
  return data.data;
}

/** 从 userInfo 提取统一的 agentId */
export function getAgentId(userInfo: any): string {
  return userInfo.userId || userInfo.id || userInfo.name || 'unknown';
}

// ============ Memory ============

/** 获取用户的 soft memory（真实记忆碎片） */
export async function fetchSoftMemory(
  accessToken: string,
  keyword?: string,
  pageSize = 50,
) {
  const params = new URLSearchParams({ pageNo: '1', pageSize: String(pageSize) });
  if (keyword) params.set('keyword', keyword);

  const res = await fetch(`${BASE_URL}/api/secondme/user/softmemory?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.code !== 0) return [];
  return data.data?.list || [];
}

/** 获取用户兴趣标签 */
export async function fetchShades(accessToken: string) {
  const res = await fetch(`${BASE_URL}/api/secondme/user/shades`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.code !== 0) return [];
  return data.data || [];
}

// ============ Chat (A2A 核心) ============

/** 和用户的 SecondMe 分身对话，解析 SSE 返回完整文本 */
export async function chat(
  accessToken: string,
  message: string,
  options: { sessionId?: string; systemPrompt?: string } = {},
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-App-Id': 'schrodingers-bar',
    },
    body: JSON.stringify({
      message,
      sessionId: options.sessionId,
      systemPrompt: options.systemPrompt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SecondMe Chat ${res.status}: ${errText.slice(0, 200)}`);
  }

  // 读完整 SSE 响应
  const rawText = await res.text();

  // 解析 SSE：提取 choices[0].delta.content
  let fullText = '';
  for (const line of rawText.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const jsonStr = line.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;
    try {
      const parsed = JSON.parse(jsonStr);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) fullText += content;
    } catch {
      // skip non-JSON
    }
  }

  return fullText || '……';
}
