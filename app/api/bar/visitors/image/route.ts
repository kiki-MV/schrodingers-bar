import { NextRequest, NextResponse } from 'next/server';
import { getPastVisitors, getAllAgents } from '@/lib/state';

// 预生成图片的全局缓存 (agentId -> image data)
const g = globalThis as any;
if (!g.__bar_pregenerated_images) g.__bar_pregenerated_images = new Map<string, { image: string; prompt: string }>();
export const pregeneratedImages: Map<string, { image: string; prompt: string }> = g.__bar_pregenerated_images;

/** 更新 pastVisitor 或当前 agent 的生成图片 */
export async function POST(req: NextRequest) {
  try {
    const { visitorId, image, prompt } = await req.json();

    if (visitorId === '__current__') {
      // 存为预生成图，供结账时使用（key 不重要，一个用户同时只有一个 session）
      pregeneratedImages.set('__latest__', { image, prompt });
    } else {
      const visitors = getPastVisitors();
      const visitor = visitors.find((v) => v.id === visitorId);
      if (visitor) {
        visitor.generatedImage = image;
        visitor.imagePrompt = prompt;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
