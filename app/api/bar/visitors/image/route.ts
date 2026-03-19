import { NextRequest, NextResponse } from 'next/server';
import { getPastVisitors } from '@/lib/state';

const g = globalThis as any;
if (!g.__bar_pregenerated_images) g.__bar_pregenerated_images = new Map();
export const pregeneratedImages: Map<string, { image: string; prompt: string; thumbnail?: string }> = g.__bar_pregenerated_images;

export async function POST(req: NextRequest) {
  try {
    const { visitorId, image, prompt, thumbnail } = await req.json();

    if (visitorId === '__current__') {
      pregeneratedImages.set('__latest__', { image, prompt, thumbnail });
    } else {
      const visitors = getPastVisitors();
      const visitor = visitors.find((v) => v.id === visitorId);
      if (visitor) {
        visitor.thumbnail = thumbnail || undefined;
        visitor.imagePrompt = prompt;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
