import { NextRequest, NextResponse } from 'next/server';
import { getPastVisitors } from '@/lib/state';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const PREGEN_KEY = 'bar:pregen_image';

/** 保存/读取预生成图片（Redis 持久化） */
export async function savePregenImage(data: { image: string; prompt: string; thumbnail?: string }) {
  await redis.set(PREGEN_KEY, data, { ex: 3600 });
}

export async function getPregenImage() {
  return redis.get<{ image: string; prompt: string; thumbnail?: string }>(PREGEN_KEY);
}

export async function clearPregenImage() {
  await redis.del(PREGEN_KEY);
}

export async function POST(req: NextRequest) {
  try {
    const { visitorId, image, prompt, thumbnail } = await req.json();

    if (visitorId === '__current__') {
      await savePregenImage({ image, prompt, thumbnail });
    } else {
      // 更新历史访客的缩略图 — 直接写 Redis
      const visitors = await getPastVisitors();
      const visitor = visitors.find((v) => v.id === visitorId);
      if (visitor) {
        visitor.thumbnail = thumbnail || undefined;
        visitor.imagePrompt = prompt;
        // 回写整个列表
        await redis.set('bar:past_visitors', visitors, { ex: 604800 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
