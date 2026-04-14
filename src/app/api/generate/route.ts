import { NextRequest, NextResponse } from 'next/server';
import { generateCardSet } from '@/lib/agent';
import { generateGeminiImage } from '@/lib/geminiImage';
import { getNextVolNumber } from '@/lib/volNumber';
import type { GenerateRequest } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    if (!body.topic?.trim()) {
      return NextResponse.json({ error: '主题不能为空' }, { status: 400 });
    }

    const volNumber = getNextVolNumber(body.vol_number);
    const projectId = `proj_${Date.now()}`;

    // Generate card content via Claude
    const result = await generateCardSet(
      body.topic,
      body.angle,
      volNumber,
      body.reference_image_paths ?? []
    );

    // Generate images for cards that need them
    for (const card of result.cards) {
      if (card.needs_image && card.image_prompt) {
        try {
          card.image_url = await generateGeminiImage(card.image_prompt, projectId, body.reference_image_paths ?? []);
        } catch (imgErr) {
          console.error(`Image generation failed for card ${card.id}:`, imgErr);
          // Non-fatal: continue without image
        }
      }
    }

    const project = {
      project_id: projectId,
      created_at: new Date().toISOString(),
      ...result,
    };

    return NextResponse.json(project);
  } catch (err) {
    console.error('/api/generate error:', err);
    const message = err instanceof Error ? err.message : '内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
