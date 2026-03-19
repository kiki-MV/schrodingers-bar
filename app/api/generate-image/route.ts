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

  // 三种场景随机
  const sceneType = pick(['bar', 'midnight_dream', 'drunk_truth'] as const);

  if (sceneType === 'midnight_dream' && memories.length > 0) {
    // 午夜梦回：基于记忆的超现实梦境
    const mem = pick(memories);
    return `${style}. Surreal dreamlike scene. ${characterDesc} floating in a dreamscape, half-asleep at a bar that melts into a memory. The memory: "${mem.slice(0, 50)}". ${comp}. Ethereal, melancholic, beautiful. Soft neon glow fading into mist. Elements of the memory appear as ghostly images in the background. Cyberpunk meets dreamcore. No text.`.slice(0, 600);
  }

  if (sceneType === 'drunk_truth' && quote.length > 5) {
    // 酒后真言：基于最荒诞语录的画面
    return `${style}. ${comp}. ${characterDesc} at a bar, mouth open, speaking passionately. The words they said materialize as visual elements around them: "${quote.slice(0, 40)}". ${env}. Emotional, raw, vulnerable. Neon tears or neon speech bubbles or floating abstract shapes representing their drunk confession. Cyberpunk atmosphere. No text.`.slice(0, 600);
  }

  // 默认：酒吧喝酒
  return `${style}. ${comp}. Setting: ${env}. ${characterDesc}, at a bar, drinking ${drinkNames}. Visual effect: ${drinkVisual}. Mood: ${mood}. Drunkenness ${drunkLevel}% — ${
    drunkLevel > 80 ? 'scene warps and distorts' : drunkLevel > 50 ? 'warm haze' : 'crisp'
  }. ${memoryScene}. Cyberpunk neon purple pink cyan. No text in image.`.slice(0, 600);
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

    // 从请求 body 读取所有信息（agent 可能已被 receipt 删除）
    let bodyData: any = {};
    try { bodyData = await req.json() || {}; } catch {}

    const bio = userInfo.bio || '';
    const drinks = agent?.activeDrinks?.map((d: any) => ({ id: d.drinkId, name: d.drinkName }))
      || bodyData.drinks?.map((d: any) => ({ id: '', name: d.name }))
      || [{ id: '', name: 'mystery cocktail' }];
    const quote = agent?.mostAbsurdQuote || bodyData.quote || '';
    const drunkLevel = agent?.drunkLevel || bodyData.drunkLevel || 50;
    const tableRecord = bodyData.tableRecord || agent?.tableRecord;

    // 拉取用户真实记忆来影响画面
    let memories: string[] = [];
    try {
      const mems = await fetchSoftMemory(token, undefined, 20);
      memories = mems
        .map((m: any) => m.factContent || m.factObject || '')
        .filter((s: string) => s.length > 5)
        .slice(0, 10);
    } catch {}
    let imagePrompt: string;

    if (tableRecord) {
      const style = pick(ART_STYLES);
      const env = pick(ENVIRONMENTS);
      const isFemale = /女|female|她/i.test(bio);
      const charDesc = isFemale ? 'a young woman' : 'a person';
      const topicShort = (tableRecord.topic || '').slice(0, 40);

      // 拼桌两种随机场景
      const tableScene = pick(['duo_portrait', 'topic_scene'] as const);

      if (tableScene === 'duo_portrait') {
        // 两人合照
        imagePrompt = `${style}. ${env}. TWO friends sitting together at a cyberpunk neon bar, clinking glasses. Character 1: ${charDesc}. Character 2: their drinking buddy. Both slightly drunk, ${tableRecord.chemistry >= 80 ? 'laughing warmly, genuine connection' : 'animated conversation'}. Neon purple pink cyan lighting. Bar atmosphere. No text.`.slice(0, 600);
      } else {
        // 基于话题的场景
        imagePrompt = `${style}. Cyberpunk bar scene. Two silhouettes at a bar counter, deep in conversation about "${topicShort}". The topic visualized as surreal neon imagery floating between them. ${env}. Atmospheric, purple pink cyan neon. No text.`.slice(0, 600);
      }
    } else {
      imagePrompt = buildImagePrompt(bio, drinks, quote, drunkLevel, memories);
    }

    // 构建 Gemini 请求 parts — 如果有头像，把头像作为参考图一起发
    const parts: any[] = [];

    const avatarUrl = userInfo.avatar;
    if (avatarUrl) {
      try {
        const avatarRes = await fetch(avatarUrl);
        if (avatarRes.ok) {
          const avatarBuf = await avatarRes.arrayBuffer();
          const avatarBase64 = Buffer.from(avatarBuf).toString('base64');
          const mime = avatarRes.headers.get('content-type') || 'image/jpeg';
          parts.push({ inlineData: { mimeType: mime, data: avatarBase64 } });
          parts.push({ text: `This is a reference photo of the person. Generate a NEW cyberpunk 2D illustration inspired by this person's appearance (gender, hairstyle, vibe). Do NOT copy the photo directly — create an illustrated character that captures their essence. ${imagePrompt}` });
        } else {
          parts.push({ text: `Generate image: ${imagePrompt}` });
        }
      } catch {
        parts.push({ text: `Generate image: ${imagePrompt}` });
      }
    } else {
      parts.push({ text: `Generate image: ${imagePrompt}` });
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[Gemini]', geminiRes.status, err.slice(0, 300));
      return NextResponse.json({ error: `Gemini ${geminiRes.status}` }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const respParts = geminiData.candidates?.[0]?.content?.parts || [];
    let imageBase64 = '';
    for (const p of respParts) {
      if (p.inlineData) {
        imageBase64 = p.inlineData.data;
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
