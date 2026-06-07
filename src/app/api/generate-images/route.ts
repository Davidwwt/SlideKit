import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiImage } from '@/lib/geminiImage';
import type { Card } from '@/lib/types';

interface GenerateImagesRequest {
  project_id: string;
  cards: Card[];
  reference_image_paths?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateImagesRequest = await req.json();

    if (!body.project_id || !Array.isArray(body.cards)) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    const cardsNeedingImages = body.cards.filter((c) => c.needs_image && c.image_prompt);

    // Generate images concurrently
    const results = await Promise.all(
      cardsNeedingImages.map(async (card) => {
        try {
          const imageUrl = await generateGeminiImage(card.image_prompt!, body.project_id, body.reference_image_paths ?? []);
          return { ...card, image_url: imageUrl };
        } catch (err) {
          console.error(`Image generation failed for card ${card.id}:`, err);
          return { ...card, image_url: null };
        }
      })
    );

    return NextResponse.json({ cards: results });
  } catch (err) {
    console.error('/api/generate-images error:', err);
    const message = err instanceof Error ? err.message : '内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
