import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });

function resolveUploadPath(webPath: string): string | null {
  // webPath looks like "/uploads/1712345678901/ref_1.jpg"
  const stripped = webPath.replace(/^\/uploads\//, '');
  if (!stripped || stripped === webPath) return null;
  const uploadDir = process.env.UPLOAD_DIR || './data/uploads';
  const absPath = path.join(process.cwd(), uploadDir.replace(/^\.\//, ''), stripped);
  return fs.existsSync(absPath) ? absPath : null;
}

function mimeFromPath(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

export async function generateGeminiImage(
  prompt: string,
  projectId: string,
  referenceImagePaths: string[] = []
): Promise<string> {
  // Build multimodal parts: reference images first, then the text prompt.
  // Gemini 3 image models treat earlier inline images as visual conditioning.
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: Part[] = [];

  for (const webPath of referenceImagePaths) {
    const absPath = resolveUploadPath(webPath);
    if (!absPath) continue;
    try {
      const buffer = fs.readFileSync(absPath);
      parts.push({
        inlineData: {
          mimeType: mimeFromPath(absPath),
          data: buffer.toString('base64'),
        },
      });
    } catch (err) {
      console.warn(`Failed to read reference image ${absPath}:`, err);
    }
  }

  const finalPrompt =
    parts.length > 0
      ? `${prompt}\n\nIMPORTANT: The attached reference image(s) show the actual real-world subject (brand product, object, or scene). The generated image MUST faithfully match the visual identity, shape, color, logo, and design details of the subject in the reference image(s). Do not invent or substitute a generic version.`
      : prompt;

  parts.push({ text: finalPrompt });

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp-image-generation',
    contents: parts,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini returned no candidates');
  }

  const responseParts = candidates[0].content?.parts;
  if (!responseParts) {
    throw new Error('Gemini returned no content parts');
  }

  for (const part of responseParts) {
    if (part.inlineData?.data) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, 'base64');
      const filename = `img_${Date.now()}.png`;
      const generatedDir = process.env.GENERATED_DIR || './data/generated';
      const dirPath = path.join(process.cwd(), generatedDir.replace(/^\.\//, ''), projectId);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, filename), buffer);
      return `/api/image/${projectId}/${filename}`;
    }
  }

  throw new Error('Gemini response did not contain image data');
}
