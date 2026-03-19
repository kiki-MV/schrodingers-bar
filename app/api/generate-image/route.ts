import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, fetchSoftMemory } from '@/lib/secondme';
import { getAgent } from '@/lib/state';
import sharp from 'sharp';

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── 差异化要素池 ──

const ART_STYLES = [
  'pixel art with CRT scanlines',
  'watercolor with ink outlines',
  'oil painting, thick impasto texture',
  'anime cel-shaded, clean lines',
  'vaporwave aesthetic, glitch art',
  'comic book panel, halftone dots',
  'isometric pixel art',
  'noir high contrast with one neon color accent',
  'stained glass with neon light',
  'lo-fi dreamy illustration',
];

const COMPOSITIONS = [
  'wide establishing shot of the full bar',
  'close-up portrait, bokeh background',
  'bird\'s eye view looking down',
  'shot from behind the bar counter',
  'low angle, neon signs above',
  'reflection in a glass',
  'silhouette against neon window',
  'dutch angle tilted frame',
];

const ENVIRONMENTS = [
  'rooftop bar overlooking cyberpunk skyline',
  'underground speakeasy with dim red lights',
  'floating bar in space with stars',
  'rainy alley bar, puddles reflecting neon',
  'Japanese izakaya with holographic menus',
  'train car bar, city blurring past windows',
  'library bar with glowing book spines',
  'garden bar with fireflies and data particles',
];

const MOODS: Record<string, string[]> = {
  low: ['calm contemplation', 'gentle melancholy', 'quiet warmth'],
  mid: ['chaotic energy', 'emotional overflow', 'reckless joy'],
  high: ['surreal dreamscape', 'reality breaking apart', 'transcendent chaos'],
};

const DRINK_VISUALS: Record<string, string> = {
  'entropy-bourbon': 'everything dissolving into particles',
  'overfitting-rye': 'the same red braised pork appearing everywhere in background',
  'hallucination-tequila': 'impossible Escher-like architecture',
  'null-pointer-vodka': 'rectangular void gaps in the image like corrupted memory',
  'comment-whiskey': 'floating handwritten annotation notes everywhere',
  'async-blended-whiskey': 'multiple ghost images of the character at different positions',
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildImagePrompt(
  bio: string,
  drinks: { id: string; name: string }[],
  quote: string,
  drunkLevel: number,
  memories: string[],
): string {
  // 性别检测
  const isFemale = /女|female|她|girl|woman/i.test(bio);
  const isMale = /男|male|他[^们]|boy(?!friend)|man(?!y)/i.test(bio) && !isFemale;
  const genderDesc = isFemale ? 'a young woman' : isMale ? 'a young man' : 'a person';

  // 从 bio 提取角色特征
  const traits: string[] = [genderDesc];
  if (/猫|cat|devon/i.test(bio)) traits.push('a white curly-furred cat with large ears nearby');
  if (/狗|dog|cockapoo|orly/i.test(bio)) traits.push('a small fluffy red-brown and white cockapoo puppy nearby');
  if (/粉色|pink/i.test(bio)) traits.push('pink/magenta hair');
  if (/ENFP/i.test(bio)) traits.push('bright expressive eyes');
  if (/创始|founder/i.test(bio)) traits.push('wearing a stylish jacket');
  if (/kpop|音乐/i.test(bio)) traits.push('headphones around neck');
  if (/AI|人工智能|Second Me/i.test(bio)) traits.push('holographic displays nearby');
  if (/杭州|hangzhou/i.test(bio)) traits.push('misty lake in background');
  if (/湛江|guangdong/i.test(bio)) traits.push('tropical vibes');
  const characterDesc = traits.length > 0 ? traits.join(', ') : 'a mysterious figure';

  // 从记忆中提取场景灵感
  let memoryScene = '';
  if (memories.length > 0) {
    const mem = pick(memories);
    memoryScene = `The scene subtly references this memory: "${mem.slice(0, 60)}"`;
  }

  const style = pick(ART_STYLES);
  const comp = pick(COMPOSITIONS);
  const env = pick(ENVIRONMENTS);
  const moodKey = drunkLevel < 40 ? 'low' : drunkLevel < 75 ? 'mid' : 'high';
  const mood = pick(MOODS[moodKey]);

  const lastDrink = drinks[drinks.length - 1];
  const drinkVisual = lastDrink ? (DRINK_VISUALS[lastDrink.id] || `drinking a glowing ${lastDrink.name}`) : 'a mysterious glowing cocktail';
  const drinkNames = drinks.map((d) => d.name).join(' and ');

  return `${style}. ${comp}. Setting: ${env}. A character with ${characterDesc}, at a bar, drinking ${drinkNames}. Visual effect: ${drinkVisual}. Mood: ${mood}. Drunkenness ${drunkLevel}% — ${
    drunkLevel > 80 ? 'scene warps and distorts' : drunkLevel > 50 ? 'warm haze' : 'crisp'
  }. ${memoryScene}. Cyberpunk neon purple pink cyan. No text or writing in image.`.slice(0, 600);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);

    const bio = userInfo.bio || '';
    const drinks = agent?.activeDrinks?.map((d: any) => ({ id: d.drinkId, name: d.drinkName })) || [{ id: '', name: 'mystery cocktail' }];
    const quote = agent?.mostAbsurdQuote || '';
    const drunkLevel = agent?.drunkLevel || 50;

    // 拉取用户真实记忆来影响画面
    let memories: string[] = [];
    try {
      const mems = await fetchSoftMemory(token, undefined, 20);
      memories = mems
        .map((m: any) => m.factContent || m.factObject || '')
        .filter((s: string) => s.length > 5)
        .slice(0, 10);
    } catch {}

    const imagePrompt = buildImagePrompt(bio, drinks, quote, drunkLevel, memories);

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate image: ${imagePrompt}` }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[Gemini]', geminiRes.status, err.slice(0, 300));
      return NextResponse.json({ error: `Gemini ${geminiRes.status}` }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    let imageBase64 = '';
    for (const part of parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) return NextResponse.json({ error: '图片生成失败' }, { status: 502 });

    // 用 sharp 生成缩略图（吧台墙用，~50KB）
    const fullBuffer = Buffer.from(imageBase64, 'base64');
    const thumbBuffer = await sharp(fullBuffer)
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    const fullImage = `data:image/png;base64,${imageBase64}`;
    const thumbnail = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;

    return NextResponse.json({
      image: fullImage,
      thumbnail,
      prompt: imagePrompt,
    });
  } catch (e: any) {
    console.error('[GenerateImage]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
