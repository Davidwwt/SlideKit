import { NextRequest, NextResponse } from 'next/server';
import { regenerateSingleCard } from '@/lib/agent';
import { generateGeminiImage } from '@/lib/geminiImage';
import type { RegenerateRequest } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: RegenerateRequest = await req.json();

    if (!body.project_id || !body.card_id || !body.context?.topic) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // Infer card type from summary if possible (we pass it as context)
    const card = await regenerateSingleCard(
      body.card_id,
      'content',
      body.context.topic,
      body.context.all_cards_summary,
      body.context.reference_image_paths ?? []
    );

    // Generate image if needed
    if (card.needs_image && card.image_prompt) {
      try {
        card.image_url = await generateGeminiImage(card.image_prompt, body.project_id, body.context.reference_image_paths ?? []);
      } catch (imgErr) {
        console.error('Image generation failed during regeneration:', imgErr);
      }
    }

    return NextResponse.json({ card });
  } catch (err) {
    console.error('/api/regenerate error:', err);
    const message = err instanceof Error ? err.message : '内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
