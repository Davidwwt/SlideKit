import { NextRequest, NextResponse } from 'next/server';
import { generateCardSet } from '@/lib/agent';
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

    // Generate card content via Claude (text only, no images)
    const result = await generateCardSet(
      body.topic,
      body.angle,
      volNumber,
      body.reference_image_paths ?? []
    );

    const project = {
      project_id: projectId,
      created_at: new Date().toISOString(),
      ...result,
    };

    return NextResponse.json(project);
  } catch (err) {
    console.error('/api/generate-copy error:', err);
    const message = err instanceof Error ? err.message : '内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
