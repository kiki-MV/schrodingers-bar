import { NextResponse } from 'next/server';
import { AVAILABLE_DRINKS, COMING_SOON_DRINKS } from '@/lib/drinks';

export async function GET() {
  return NextResponse.json({
    available: AVAILABLE_DRINKS,
    comingSoon: COMING_SOON_DRINKS.map((d) => ({
      id: d.id,
      name: d.name,
      nameEn: d.nameEn,
      emoji: d.emoji,
      strength: d.strength,
      effect: d.effect,
    })),
  });
}
