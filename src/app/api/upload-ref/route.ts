import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];

    if (!files.length) {
      return NextResponse.json({ error: '没有文件' }, { status: 400 });
    }

    const limited = files.slice(0, MAX_FILES);
    const timestamp = Date.now();
    const uploadDir = path.join(
      process.cwd(),
      (process.env.UPLOAD_DIR || './data/uploads').replace(/^\.\//, ''),
      String(timestamp)
    );
    fs.mkdirSync(uploadDir, { recursive: true });

    const savedPaths: string[] = [];

    for (const file of limited) {
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_SIZE_BYTES) continue;

      const ext = file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg';
      const filename = `ref_${savedPaths.length + 1}${ext}`;
      const filepath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filepath, buffer);
      savedPaths.push(`/uploads/${timestamp}/${filename}`);
    }

    return NextResponse.json({ paths: savedPaths });
  } catch (err) {
    console.error('/api/upload-ref error:', err);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
