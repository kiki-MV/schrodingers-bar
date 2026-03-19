/**
 * 知乎开放 API
 * Base URL: https://openapi.zhihu.com
 * 认证: HMAC-SHA256 签名
 */

import crypto from 'crypto';

const ZHIHU_BASE = 'https://openapi.zhihu.com';

function getAppKey() { return process.env.ZHIHU_APP_KEY || ''; }
function getAppSecret() { return process.env.ZHIHU_APP_SECRET || ''; }

/** 生成知乎 API 签名 headers */
function signHeaders(): Record<string, string> {
  const appKey = getAppKey();
  const appSecret = getAppSecret();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const logId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const extraInfo = '';

  const signStr = `app_key:${appKey}|ts:${timestamp}|logid:${logId}|extra_info:${extraInfo}`;
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(signStr);
  const sign = hmac.digest('base64');

  return {
    'X-App-Key': appKey,
    'X-Timestamp': timestamp,
    'X-Log-Id': logId,
    'X-Extra-Info': extraInfo,
    'X-Sign': sign,
  };
}

// ── 热榜 ──

export interface HotTopic {
  title: string;
  body: string;
  link_url: string;
  heat_score: number;
  token: string;
  answers?: { body: string; vote_up_count: number }[];
}

/** 获取知乎热榜 */
export async function fetchBillboard(topCnt = 20, publishInHours = 48): Promise<HotTopic[]> {
  const headers = signHeaders();
  const res = await fetch(
    `${ZHIHU_BASE}/openapi/billboard/list?top_cnt=${topCnt}&publish_in_hours=${publishInHours}`,
    { headers },
  );
  const data = await res.json();
  if (data.status !== 0) throw new Error(data.msg || '热榜获取失败');
  return (data.data?.list || []).map((item: any) => ({
    title: item.title,
    body: (item.body || '').slice(0, 200),
    link_url: item.link_url,
    heat_score: item.heat_score,
    token: item.token,
    answers: (item.answers || []).slice(0, 3).map((a: any) => ({
      body: (a.body || '').slice(0, 150),
      vote_up_count: a.interaction_info?.vote_up_count || 0,
    })),
  }));
}

// ── 圈子 ──

const RING_IDS = ['2001009660925334090', '2015023739549529606'];

/** 获取圈子内容 */
export async function fetchRingDetail(ringId?: string, pageNum = 1, pageSize = 10) {
  const id = ringId || RING_IDS[Math.floor(Math.random() * RING_IDS.length)];
  const headers = signHeaders();
  const res = await fetch(
    `${ZHIHU_BASE}/openapi/ring/detail?ring_id=${id}&page_num=${pageNum}&page_size=${pageSize}`,
    { headers },
  );
  const data = await res.json();
  if (data.status !== 0) throw new Error(data.msg || '圈子获取失败');
  return data.data;
}

// ── 发布想法 ──

/** 在知乎圈子发布一条想法 */
export async function publishPin(content: string, title: string, ringId?: string, imageUrls?: string[]) {
  const id = ringId || RING_IDS[0];
  const headers = signHeaders();
  const body: any = { title, content, ring_id: id };
  if (imageUrls?.length) body.image_urls = imageUrls;

  const res = await fetch(`${ZHIHU_BASE}/openapi/publish/pin`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.status !== 0) throw new Error(data.msg || '发布失败');
  return data.data;
}

// ── 搜索 ──

/** 全网可信搜（限 1000 次总调用） */
export async function searchGlobal(query: string, count = 5) {
  const headers = signHeaders();
  const encoded = encodeURIComponent(query);
  const res = await fetch(
    `${ZHIHU_BASE}/openapi/search/global?query=${encoded}&count=${count}`,
    { headers },
  );
  const data = await res.json();
  if (data.status !== 0) throw new Error(data.msg || '搜索失败');
  return data.data?.items || [];
}
