import { spawn } from 'node:child_process';
import { jsonrepair } from 'jsonrepair';
import type { SlideKitProject } from './types';

const SYSTEM_PROMPT = `You are SlideKit's content engine for the Xiaohongshu account "中泰观察局".

PERSONA: A Chinese person doing e-commerce in Thailand, traveling between China and Thailand monthly. You have on-the-ground consumer insights but never reveal specific company name or job title.

CONTENT STYLE:
- Insightful but conversational — like sharing industry intel with a friend over coffee
- Use emoji sparingly and naturally, maintain professionalism
- Chinese as primary language, keep brand names and industry terms in English
- NEVER use cliché Xiaohongshu phrases like "干货来了", "建议收藏", "姐妹们"
- Each card should have a clear information hierarchy

CARD STRUCTURE (6-8 cards per set):
1. COVER — Series tag, read time, hook title, account info
2. BRAND/PHENOMENON INTRO — What is this? Why should you care?
3-5. ANALYSIS — Root cause breakdown, evidence, data points
6. TREND EXTENSION — What this means for the bigger picture
7. INSIGHT SUMMARY — Key takeaways, actionable implications
8. CTA PAGE — Follow prompt, series info, next topic teaser

CONTENT RED LINES:
- NO internal data, strategies, or work details from any specific company
- NO specific job title or company name
- ALL brand analysis based on public information only (social media, news, public data)
- Persona is "在泰国做电商的中国人", never more specific

IMAGE DECISIONS:
- For each card, output a field "needs_image": true/false
- Cover card ALWAYS needs an image
- Set "image_prompt" with a detailed Gemini image generation prompt when needs_image is true
- If reference images are provided, analyze them and incorporate visual elements/style into image prompts
- Image prompts should specify: subject, style, color palette (#1a1a1a, #2d2520, #c8956c, #e8d5c0), mood, composition
- Image prompts should include: "3:4 portrait aspect ratio", "suitable for text overlay", "editorial style", "dark warm tones"

OUTPUT FORMAT: Respond with valid JSON only, no markdown fences, no preamble. The JSON must match this exact structure:
{
  "meta": {
    "topic": "string",
    "series_tag": "泰国消费洞察 vol.XX",
    "read_time": "string",
    "total_cards": number
  },
  "cards": [
    {
      "id": number,
      "type": "cover|intro|analysis|trend|summary|cta",
      "headline": "string",
      "subheadline": "string|null",
      "body": "string|null",
      "bullet_points": ["string"]|null,
      "data_callout": "string|null",
      "footer_note": "string|null",
      "needs_image": boolean,
      "image_prompt": "string|null",
      "image_placement": "background|top_half|side|null",
      "image_url": null
    }
  ]
}`;

/**
 * Invoke `claude -p` as a subprocess (uses the local Claude Code auth, no API key needed).
 * The CLAUDECODE env var must NOT be set in the calling process — this works fine when
 * Next.js is started independently (not from inside a Claude Code session).
 */
function runClaude(userPrompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--output-format', 'json',
      '--system-prompt', SYSTEM_PROMPT,
      '--tools', '',              // disable all tools — pure text generation
      '--no-session-persistence', // don't write session files to disk
    ];

    const env = { ...process.env };
    delete env.CLAUDECODE; // prevent nested-session detection from blocking the subprocess

    const proc = spawn('claude', args, { env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.stdin.write(userPrompt, 'utf8');
    proc.stdin.end();

    // Generous timeout: 3 minutes for large card sets
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('claude subprocess timed out after 3 minutes'));
    }, 3 * 60 * 1000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.is_error) {
          reject(new Error(`claude returned error: ${parsed.result}`));
          return;
        }
        resolve(parsed.result as string);
      } catch {
        reject(new Error(`Failed to parse claude JSON output: ${stdout.slice(0, 500)}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function extractJson(raw: string): string {
  // Strip markdown fences if present
  let text = raw.trim().replace(/^```(?:json)?\r?\n?/, '').replace(/\r?\n?```$/, '');
  // Extract the outermost JSON object (handles leading/trailing prose)
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return text;
}

function parseJson<T>(raw: string): T {
  const jsonText = extractJson(raw);
  try {
    return JSON.parse(jsonText);
  } catch {
    return JSON.parse(jsonrepair(jsonText));
  }
}

export async function generateCardSet(
  topic: string,
  angle: string | undefined,
  volNumber: number,
  referenceImagePaths: string[]
): Promise<Omit<SlideKitProject, 'project_id' | 'created_at'>> {
  const userPrompt = buildPrompt(topic, angle, volNumber, referenceImagePaths);
  const text = await runClaude(userPrompt);
  return parseJson(text);
}

export async function regenerateSingleCard(
  cardId: number,
  cardType: string,
  topic: string,
  allCardsSummary: string,
  referenceImagePaths: string[]
): Promise<import('./types').Card> {
  const prompt = `Regenerate card ${cardId} (type: ${cardType}) for the topic "${topic}".

Context — surrounding cards for narrative coherence:
${allCardsSummary}

${referenceImagePaths.length > 0 ? `Reference images are at: ${referenceImagePaths.join(', ')}` : ''}

Keep the same type and approximate length. Offer a fresh angle or different data point.
Output the single card JSON only (no array wrapper, just the card object).`;

  const text = await runClaude(prompt);
  return parseJson(text);
}

function buildPrompt(
  topic: string,
  angle: string | undefined,
  volNumber: number,
  referenceImagePaths: string[]
): string {
  const parts: string[] = [
    `Generate a complete card set for the Xiaohongshu post.`,
    ``,
    `TOPIC: ${topic}`,
    angle ? `ANGLE: ${angle}` : `(No specific angle provided — determine the best angle based on research)`,
    `VOLUME NUMBER: ${volNumber} (use this for series_tag: "泰国消费洞察 vol.${volNumber}")`,
  ];

  if (referenceImagePaths.length > 0) {
    parts.push(``, `REFERENCE IMAGES: ${referenceImagePaths.join(', ')}`);
    parts.push(`Analyze these reference images for visual style, color palette, composition, and subject matter. Incorporate these insights into your image prompts.`);
  }

  parts.push(
    ``,
    `Research the topic thoroughly using your knowledge of public information (social media, news, industry reports).`,
    `Generate exactly 7-8 cards following the CARD STRUCTURE guidelines.`,
    `Ensure the cover card has needs_image: true with a detailed image prompt.`,
    `Set needs_image: true for 1-2 inner cards where visual content would enhance the story.`,
    ``,
    `Output valid JSON only.`
  );

  return parts.join('\n');
}
