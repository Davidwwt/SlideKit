import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    // Prevent path traversal
    const sanitized = segments.map((s) => s.replace(/\.\./g, ''));
    const generatedDir = (process.env.GENERATED_DIR || './data/generated').replace(/^\.\//, '');
    const filePath = path.join(process.cwd(), generatedDir, ...sanitized);

    // Ensure file is within generated dir
    const resolvedBase = path.resolve(path.join(process.cwd(), generatedDir));
    const resolvedFile = path.resolve(filePath);
    if (!resolvedFile.startsWith(resolvedBase)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (err) {
    console.error('/api/image error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
