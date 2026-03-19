import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId } from '@/lib/secondme';
import { getAgent } from '@/lib/state';

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── 差异化要素池 ──

const ART_STYLES = [
  'pixel art with CRT scanlines',
  'watercolor with ink outlines, loose brushstrokes',
  'oil painting, thick impasto texture, moody',
  'anime cel-shaded, clean lines',
  'vaporwave aesthetic, glitch art, VHS grain',
  'comic book panel, halftone dots, bold outlines',
  'isometric 3D pixel art, tiny detailed scene',
  'ukiyo-e woodblock print meets neon cyberpunk',
  'noir photography style, high contrast black and white with one neon color accent',
  'stained glass window style with neon light shining through',
];

const COMPOSITIONS = [
  'wide establishing shot of the full bar scene',
  'close-up portrait, face filling the frame, bokeh background',
  'bird\'s eye view looking down at the bar counter',
  'shot from behind the bar counter, looking at the character',
  'low angle looking up, neon signs towering above',
  'split frame: sober self on left, drunk self on right',
  'reflection in a whiskey glass, distorted face',
  'silhouette against a neon window, rain outside',
  'extreme close-up of hands holding a glowing drink',
  'dutch angle, tilted frame suggesting dizziness',
];

const ENVIRONMENTS = [
  'rooftop bar overlooking a cyberpunk city skyline',
  'underground speakeasy with exposed pipes and dim red lights',
  'floating bar in space, stars visible through glass walls',
  'rainy alley bar, puddles reflecting neon, steam rising',
  'traditional Japanese izakaya with holographic menu boards',
  'underwater bar with bioluminescent sea creatures outside',
  'train car converted into a moving bar, city blurring past',
  'library bar, bookshelves with glowing spines, quiet atmosphere',
  'arcade bar, retro game screens casting colorful light',
  'garden bar with overgrown plants and fireflies mixed with data particles',
];

const MOODS: Record<string, string[]> = {
  low: ['calm contemplation', 'gentle melancholy', 'quiet warmth', 'peaceful solitude'],
  mid: ['chaotic energy', 'loud laughter frozen in time', 'emotional overflow', 'reckless joy'],
  high: ['surreal dreamscape', 'reality breaking apart', 'abstract emotional explosion', 'transcendent chaos'],
};

// 酒效 → 视觉变形
const DRINK_VISUALS: Record<string, string> = {
  'entropy-bourbon': 'everything in the scene gradually dissolving into particles from left to right, entropy increasing',
  'overfitting-rye': 'the same object (a bowl of red braised pork) appears everywhere in the background, on walls, shelves, screens',
  'hallucination-tequila': 'impossible architecture, Escher-like stairs, objects that shouldn\'t exist mixed naturally into the scene',
  'null-pointer-vodka': 'parts of the image are missing/void, rectangular gaps showing emptiness, like corrupted memory',
  'comment-whiskey': 'handwritten annotation notes floating around the character like thought bubbles, messy marginalia',
  'async-blended-whiskey': 'multiple ghost images of the character at different positions, timeline fragmentation',
  'vanishing-gradient-special': 'the image fades from vivid at top to almost invisible at bottom',
  'infinite-loop-margarita': 'recursive image-within-image effect, the scene contains a screen showing the same scene',
  'zero-shot-mojito': 'character confidently lecturing to invisible audience, diagrams and charts floating around',
  'context-overflow-long-island': 'multiple different scenes bleeding into each other, time periods mixing',
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildImagePrompt(
  bio: string,
  drinks: { id: string; name: string }[],
  quote: string,
  drunkLevel: number,
): string {
  // 角色特征
  const traits: string[] = [];
  if (/猫|cat/i.test(bio)) traits.push('a cat nearby');
  if (/狗|dog|cockapoo/i.test(bio)) traits.push('a small fluffy dog');
  if (/粉色|pink/i.test(bio)) traits.push('pink/magenta hair');
  if (/ENFP/i.test(bio)) traits.push('bright expressive eyes, animated gestures');
  if (/创始|founder/i.test(bio)) traits.push('wearing a sharp jacket');
  if (/kpop|音乐/i.test(bio)) traits.push('wearing headphones around neck');
  if (/AI|人工智能/i.test(bio)) traits.push('holographic data floating around');
  const characterDesc = traits.length > 0 ? traits.slice(0, 3).join(', ') : 'a mysterious figure';

  // 随机要素
  const style = pick(ART_STYLES);
  const comp = pick(COMPOSITIONS);
  const env = pick(ENVIRONMENTS);

  // 醉度 → 情绪
  const moodKey = drunkLevel < 40 ? 'low' : drunkLevel < 75 ? 'mid' : 'high';
  const mood = pick(MOODS[moodKey]);

  // 酒效视觉（用最后一杯的效果）
  const lastDrink = drinks[drinks.length - 1];
  const drinkVisual = lastDrink ? (DRINK_VISUALS[lastDrink.id] || `a glowing ${lastDrink.name} drink`) : 'a mysterious glowing cocktail';

  // 语录融入场景（如果有的话）
  let quoteElement = '';
  if (quote && quote.length > 5) {
    const shortQuote = quote.slice(0, 30);
    quoteElement = `A neon sign or floating text in the scene hints: "${shortQuote}"`;
  }

  const drinkNames = drinks.map((d) => d.name).join(', ');

  return `${style}. ${comp}. Setting: ${env}. A character (${characterDesc}) at a bar, drinking ${drinkNames}. Visual effect: ${drinkVisual}. Mood: ${mood}. Drunkenness level ${drunkLevel}% — ${
    drunkLevel > 80 ? 'the whole scene warps and distorts' : drunkLevel > 50 ? 'slight visual distortion, warm haze' : 'clear and crisp'
  }. ${quoteElement}. Cyberpunk color palette with neon purple, pink, and cyan. Atmospheric.`.slice(0, 600);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

  try {
    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = getAgent(agentId);

    const bio = userInfo.bio || '';
    const drinks = agent?.activeDrinks?.map((d: any) => ({ id: d.drinkId, name: d.drinkName })) || [{ id: '', name: 'mystery cocktail' }];
    const quote = agent?.mostAbsurdQuote || '';
    const drunkLevel = agent?.drunkLevel || 50;

    const imagePrompt = buildImagePrompt(bio, drinks, quote, drunkLevel);

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
    let imageBase64 = '', imageMime = 'image/png';
    for (const part of parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        imageMime = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!imageBase64) return NextResponse.json({ error: '图片生成失败' }, { status: 502 });

    return NextResponse.json({
      image: `data:${imageMime};base64,${imageBase64}`,
      prompt: imagePrompt,
    });
  } catch (e: any) {
    console.error('[GenerateImage]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
