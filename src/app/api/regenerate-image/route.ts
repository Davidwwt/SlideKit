import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiImage } from '@/lib/geminiImage';

interface RegenerateImageRequest {
  project_id: string;
  card_id: number;
  image_prompt: string;
  feedback?: string;
  reference_image_paths?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: RegenerateImageRequest = await req.json();

    if (!body.project_id || !body.card_id || !body.image_prompt?.trim()) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    const finalPrompt = body.feedback?.trim()
      ? `${body.image_prompt}\n\nAdditional user feedback (must follow these revisions): ${body.feedback.trim()}`
      : body.image_prompt;

    const imageUrl = await generateGeminiImage(finalPrompt, body.project_id, body.reference_image_paths ?? []);

    return NextResponse.json({ card_id: body.card_id, image_url: imageUrl });
  } catch (err) {
    console.error('/api/regenerate-image error:', err);
    const message = err instanceof Error ? err.message : '内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
