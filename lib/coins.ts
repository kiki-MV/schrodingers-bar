import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const DAILY_COINS = 100;

// 酒价表
export const DRINK_PRICES: Record<string, number> = {
  '烈酒': 50,
  '威士忌': 40,
  '鸡尾酒': 35,
  '低度': 30,
};

function todayKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  return `bar:coins:${userId}:${today}`;
}

/** 获取今日余额（首次访问自动发 100 金币） */
export async function getCoins(userId: string): Promise<number> {
  const key = todayKey(userId);
  const val = await redis.get<number>(key);
  if (val === null) {
    // 今天第一次来，发 100 金币
    await redis.set(key, DAILY_COINS, { ex: 86400 }); // 24h 过期
    return DAILY_COINS;
  }
  return val;
}

/** 扣金币，返回剩余。余额不足返回 -1 */
export async function spendCoins(userId: string, amount: number): Promise<number> {
  const key = todayKey(userId);
  const current = await getCoins(userId);
  if (current < amount) return -1;
  const remaining = current - amount;
  await redis.set(key, remaining, { ex: 86400 });
  return remaining;
}
