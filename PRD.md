# SlideKit — Product Requirements Document

> Version: 1.1 MVP
> Date: 2026-03-29
> Author: 中泰观察局
> Status: Ready for Development
> Changelog: v1.1 — Updated image generation from placeholder API to Google Gemini (`@google/genai` SDK)

---

## 1. Product Overview

### 1.1 What is SlideKit

SlideKit is a self-hosted web tool that automates the production of Xiaohongshu (小红书) image card sets. Users input a topic (brand, trend, or phenomenon), and the system generates a complete set of 6-8 styled cards ready for publishing — including AI-written copy, AI-generated images, and a consistent visual template.

### 1.2 Core Value Proposition

Reduce the time from "I have a topic idea" to "publishable Xiaohongshu card set" from hours to minutes.

### 1.3 Target User (MVP)

Single user — the operator of the Xiaohongshu account "中泰观察局" (a Chinese e-commerce professional based in Thailand, covering Thai consumer insights).

### 1.4 Deployment Target

AWS EC2 instance, self-hosted.

---

## 2. System Architecture

### 2.1 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js (React) | Card rendering, inline editing, image export |
| Backend | Next.js API Routes | Endpoint layer, file handling |
| AI Agent | Claude Code (server-side) | Content generation, image orchestration, web research |
| Image Gen | Google Gemini (`gemini-2.0-flash-exp-image-generation` via `@google/genai` SDK) | AI image generation for covers and select inner pages |
| Image Export | html2canvas | Convert rendered HTML cards to PNG |
| File Storage | Local filesystem (EC2) | Uploaded reference images, generated images, exported PNGs |

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  EC2 Instance                                           │
│                                                         │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │  Next.js Frontend │◄──►│  Next.js API Routes      │  │
│  │  - Card Renderer  │JSON│  - POST /api/generate     │  │
│  │  - Image Export   │    │  - POST /api/regenerate   │  │
│  │  - Inline Editor  │    │  - POST /api/upload-ref   │  │
│  └──────────────────┘     └──────────┬───────────────┘  │
│                                      │                  │
│                           ┌──────────▼───────────────┐  │
│                           │  Claude Code Agent       │  │
│                           │  - Content generation    │  │
│                           │  - Web research          │  │
│                           │  - Ref image analysis    │  │
│                           │  - Image orchestration   │  │
│                           └─────┬──────────┬─────────┘  │
│                                 │          │            │
│                    ┌────────────▼┐   ┌─────▼──────────┐ │
│                    │ Local Files  │   │ Gemini Image   │ │
│                    │ /uploads     │   │ (External API) │ │
│                    │ /generated   │   └────────────────┘ │
│                    └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow

1. User submits topic + optional reference images via frontend
2. API Route receives request, invokes Claude Code Agent
3. Claude Code Agent:
   a. Performs web research on the topic (public info only)
   b. Analyzes uploaded reference images (if any)
   c. Generates structured JSON for 6-8 cards (copy + layout metadata)
   d. Determines which cards need AI-generated images
   e. Calls Gemini image generation for those images
   f. Returns complete JSON with text content + image URLs
4. Frontend renders cards using built-in template
5. User reviews, edits text inline, or regenerates individual cards
6. User exports each card as PNG

---

## 3. Feature Specification

### 3.1 F1 — Topic Input

**Description**: User enters a topic to generate content about.

**Input Fields**:
- `topic` (required, text): The brand name, phenomenon, or trend to cover. Example: "Rally — 泰国本土包袋品牌崛起"
- `angle` (optional, text): Specific angle or hook. Example: "为什么泰国年轻人不再追LV而买Rally"
- `vol_number` (optional, number): Series volume number for the tag "泰国消费洞察 vol.XX"
- `reference_images` (optional, file upload): Up to 5 images for design reference

**Behavior**:
- If `angle` is empty, Claude Code Agent determines the best angle based on research
- If `vol_number` is empty, auto-increment from last used number (stored in a local JSON config file)
- Reference images are saved to `/uploads/{timestamp}/` and their paths passed to the Agent

### 3.2 F2 — AI Content Generation (Claude Code Agent)

**Description**: The core intelligence layer. Claude Code Agent receives the topic and produces a complete card set.

**Implementation Note**: The agent is invoked via `claude -p` subprocess, reusing the local Claude Code CLI session auth — no `ANTHROPIC_API_KEY` is needed. Web research tools are currently disabled; the agent generates content from its training knowledge of public information.

**Agent System Prompt Context** (embed in the Claude Code agent configuration):

```
You are SlideKit's content engine for the Xiaohongshu account "中泰观察局".

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

OUTPUT FORMAT: Respond with valid JSON only, no markdown fences, no preamble.
```

**Agent Output Schema** (JSON):

```json
{
  "meta": {
    "topic": "string — the topic as understood",
    "series_tag": "泰国消费洞察 vol.XX",
    "read_time": "string — e.g. '3 min read'",
    "total_cards": 6-8
  },
  "cards": [
    {
      "id": 1,
      "type": "cover | intro | analysis | trend | summary | cta",
      "headline": "string — main title on the card",
      "subheadline": "string | null — secondary title",
      "body": "string | null — body text content",
      "bullet_points": ["string"] | null,
      "data_callout": "string | null — highlighted stat or quote",
      "footer_note": "string | null — source attribution or small note",
      "needs_image": true | false,
      "image_prompt": "string | null — Gemini image generation prompt",
      "image_placement": "background | top_half | side | null",
      "image_url": "string | null — filled after image generation"
    }
  ]
}
```

**Content Research**: The Agent generates content from its training knowledge of public information. Research sources include: brand social media accounts, news articles, public financial data, industry reports. (Note: live web search tools are currently disabled in the agent subprocess invocation.)

### 3.3 F3 — AI Image Generation (Gemini Image Generation)

**Description**: Claude Code Agent calls Google Gemini's native image generation (`gemini-2.0-flash-exp-image-generation`) to generate images for cards that need them.

**Integration**:
- Uses `@google/genai` Node.js SDK
- Agent constructs the prompt based on card context and reference image analysis
- Gemini returns images as base64 inline data in the response
- Generated images are decoded and saved to `/generated/{project_id}/`
- Image URLs in the card JSON are updated to point to local file paths

**Environment Variables**:
```
GOOGLE_API_KEY=<Google AI API key>
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation
```

**SDK Installation**:
```bash
npm install @google/genai
```

**Implementation Reference**:
```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

async function generateImage(prompt: string, projectId: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview",
    contents: prompt,
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      const filename = `img_${Date.now()}.png`;
      const filepath = path.join(process.env.GENERATED_DIR, projectId, filename);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, buffer);

      return `/api/image/${projectId}/${filename}`;
    }
  }

  throw new Error("Gemini did not return an image");
}
```

**Prompt Engineering for Image Generation**:
- Prompts should specify the visual style matching the card template: dark, moody, warm copper tones
- Include composition guidance: "3:4 portrait aspect ratio", "suitable for text overlay on lower third"
- For cover cards: "editorial style product/brand photography with dark brown background tones"
- When reference images are analyzed, incorporate style descriptors into the prompt

**Reference Image Analysis**:
- When user uploads reference images, Agent analyzes them for: color palette, composition style, subject matter, mood
- Agent uses this analysis to craft more contextually appropriate image prompts
- Agent decides which cards benefit from reference-image-inspired visuals

### 3.4 F4 — Card Rendering Engine

**Description**: Frontend renders card JSON into styled visual cards.

**Template Specification**:

| Property | Value |
|----------|-------|
| Aspect Ratio | 3:4 (portrait, Xiaohongshu standard) |
| Resolution | 1080 × 1440 px |
| Background | Dark brown gradient (#1a1a1a → #2d2520) |
| Accent Color | Gold copper (#c8956c) |
| Light Text | Warm cream (#e8d5c0) |
| Title Font | Playfair Display (from Google Fonts) |
| Body Font | Noto Sans SC (from Google Fonts) |
| Padding | 60px horizontal, 80px vertical |

**Card Type Layouts**:

**Cover Card**:
```
┌─────────────────────────┐
│  泰国消费洞察 vol.XX     │ ← series tag, gold copper, small
│                         │
│  [AI Generated Image]   │ ← background or top half
│                         │
│  HEADLINE               │ ← Playfair Display, 36-42px, cream
│  subheadline            │ ← Noto Sans SC, 18px, gold copper
│                         │
│  3 min read             │ ← bottom left, small
│  中泰观察局              │ ← bottom right, account name
└─────────────────────────┘
```

**Content Card (intro / analysis / trend)**:
```
┌─────────────────────────┐
│  HEADLINE               │ ← Playfair Display, 28-32px
│  ─────── (divider)      │ ← gold copper thin line
│                         │
│  Body text paragraph    │ ← Noto Sans SC, 16-18px
│  continues here with    │
│  the main content...    │
│                         │
│  ┌─────────────────┐    │
│  │  DATA CALLOUT   │    │ ← highlighted box, gold copper border
│  │  "85% of Gen Z" │    │
│  └─────────────────┘    │
│                         │
│  • Bullet point one     │ ← if bullet_points exist
│  • Bullet point two     │
│                         │
│  source: public data    │ ← footer note, small, muted
│                    X/8  │ ← page number, bottom right
└─────────────────────────┘
```

**Content Card with Image**:
```
┌─────────────────────────┐
│  HEADLINE               │
│  ─────── (divider)      │
│                         │
│  ┌─────────────────┐    │ ← image_placement: "top_half"
│  │  [AI Generated  │    │
│  │   Image]        │    │
│  └─────────────────┘    │
│                         │
│  Body text continues    │
│  below the image...     │
│                         │
│                    X/8  │
└─────────────────────────┘
```

**CTA Card**:
```
┌─────────────────────────┐
│                         │
│  Thanks for reading     │ ← Playfair Display
│                         │
│  关注 中泰观察局         │ ← follow prompt
│  获取更多泰国消费洞察    │
│                         │
│  ─────── (divider)      │
│                         │
│  Next: [teaser topic]   │ ← next topic teaser
│                         │
│  泰国消费洞察 vol.XX     │ ← series branding
└─────────────────────────┘
```

**Implementation Notes**:
- Each card is rendered as a React component
- Cards are wrapped in a container div with exact 1080×1440 dimensions
- Use CSS `@font-face` for Playfair Display and Noto Sans SC
- Images from Gemini are displayed via `<img>` tags with local src paths
- Cards are displayed in a horizontal carousel with prev/next navigation

### 3.5 F5 — Inline Text Editing

**Description**: Users can click on any text element in a rendered card to edit it directly.

**Behavior**:
- Click on any text field → field becomes editable (`contentEditable`)
- Editable fields have a subtle border highlight (gold copper, 1px)
- Press Enter or click outside → save changes to the card JSON state
- Changes are immediate — card re-renders with updated text
- No backend call needed — pure frontend state update

**Editable Fields by Card Type**:
- Cover: headline, subheadline
- Content cards: headline, body, bullet_points, data_callout, footer_note
- CTA: All text fields

### 3.6 F6 — Single Card Regeneration

**Description**: User can regenerate any individual card they're not satisfied with.

**Behavior**:
- Each card has a "Regenerate" button (visible on hover)
- Clicking triggers an API call to `POST /api/regenerate`
- Request body includes: `card_id`, `card_type`, full project context (topic, other cards' content for coherence)
- Claude Code Agent regenerates only that card, maintaining narrative flow with surrounding cards
- Frontend replaces the card data and re-renders
- Previous version is not saved (MVP — no version history)

### 3.7 F7 — PNG Export

**Description**: Export individual cards as PNG images.

**Behavior**:
- Each card has a "Download PNG" button
- Uses `html2canvas` to capture the card container at 1080×1440 resolution
- Downloads as `{series_tag}_{card_number}.png` — e.g. `泰国消费洞察_vol12_1.png`
- Export hides UI elements (edit highlights, buttons) during capture

**Technical Notes**:
- `html2canvas` configuration: `scale: 2` for retina quality, `useCORS: true` for images
- Temporarily remove hover states and edit UI before capture
- Ensure Google Fonts are fully loaded before capture (`document.fonts.ready`)

---

## 4. API Specification

### 4.1 POST /api/generate

**Purpose**: Generate a complete card set from a topic.

**Request**:
```json
{
  "topic": "Rally — 泰国本土包袋品牌",
  "angle": "为什么泰国年轻人不再追LV",
  "vol_number": 12,
  "reference_image_paths": ["/uploads/1711700000/ref1.jpg"]
}
```

**Response** (streaming recommended for UX):
```json
{
  "project_id": "proj_1711700000",
  "meta": { ... },
  "cards": [ ... ]
}
```

**Processing Steps**:
1. Validate input
2. Save reference images if any
3. Invoke Claude Code Agent with topic + angle + ref image paths
4. Agent performs web research
5. Agent generates card JSON
6. For cards with `needs_image: true`, call Gemini image generation sequentially
7. Save generated images to `/generated/{project_id}/`
8. Return complete JSON with all image URLs populated

**Timeout**: 120 seconds (image generation can be slow)

### 4.2 POST /api/regenerate

**Purpose**: Regenerate a single card.

**Request**:
```json
{
  "project_id": "proj_1711700000",
  "card_id": 3,
  "context": {
    "topic": "Rally — 泰国本土包袋品牌",
    "all_cards_summary": "Card 1: cover about Rally..., Card 2: intro...",
    "reference_image_paths": ["/uploads/1711700000/ref1.jpg"]
  }
}
```

**Response**:
```json
{
  "card": { ... }
}
```

### 4.3 POST /api/upload-ref

**Purpose**: Upload reference images before generation.

**Request**: `multipart/form-data` with image files

**Response**:
```json
{
  "paths": ["/uploads/1711700000/ref1.jpg", "/uploads/1711700000/ref2.jpg"]
}
```

**Constraints**: Max 5 images, max 10MB each, formats: JPG, PNG, WebP

### 4.4 GET /api/image/:project_id/:filename

**Purpose**: Serve generated images to the frontend.

**Response**: Image file with appropriate Content-Type header.

---

## 5. Frontend Specification

### 5.1 Page Structure

Single-page application with three states:

**State 1 — Input**:
- Clean, centered form
- Topic input (text field, prominent)
- Angle input (text field, optional, collapsible)
- Volume number (number input, auto-filled)
- Reference image upload zone (drag & drop or click)
- "Generate" button (gold copper accent)

**State 2 — Loading**:
- Progress indicator with status messages:
  - "Researching topic..."
  - "Writing card content..."
  - "Generating images..."
  - "Assembling cards..."
- Skeleton card placeholders

**State 3 — Editor**:
- Horizontal card carousel (swipe or arrow navigation)
- Current card displayed at center, large
- Card counter: "3 / 8"
- Thumbnail strip below for quick navigation
- Per-card actions (visible on hover):
  - "Edit" toggle (enables inline editing)
  - "Regenerate this card"
  - "Download PNG"
- Global actions:
  - "Back to input" (top left)
  - "Download all" (future — not in MVP)

### 5.2 Responsive Behavior

- Primary target: Desktop browser (1280px+)
- Card preview scales to fit viewport while maintaining 3:4 ratio
- Export always at full 1080×1440 regardless of preview size

### 5.3 Styling

- Page background: #0f0f0f (near black)
- UI chrome: Minimal, dark theme matching the card aesthetic
- Accent interactions: Gold copper (#c8956c) for buttons, focus states, active elements
- Font for UI (not cards): system sans-serif stack

---

## 6. Claude Code Agent Configuration

### 6.1 Agent Setup

The Claude Code Agent runs server-side on the EC2 instance. It is invoked programmatically by the Next.js API routes.

**Required Tools/Capabilities**:
- Knowledge of public information (training data; live web search not enabled in current implementation)
- `@google/genai` SDK (for calling Gemini image generation)
- JSON output (structured card data)

**Auth**: The agent runs via `claude -p` subprocess using local Claude Code CLI session credentials. No `ANTHROPIC_API_KEY` environment variable is needed.

### 6.2 Agent Invocation Pattern

```javascript
// Pseudocode for API route handler
async function handleGenerate(req, res) {
  const { topic, angle, vol_number, reference_image_paths } = req.body;

  // Build the agent prompt
  const prompt = buildPrompt(topic, angle, vol_number, reference_image_paths);

  // Invoke Claude Code Agent
  // The agent will:
  // 1. Search the web for "{topic}" related public info
  // 2. If reference images exist, analyze them
  // 3. Generate the card JSON
  // 4. For each card with needs_image=true, construct image prompt
  const agentResult = await invokeClaudeCodeAgent(prompt);

  // Post-process: generate images via Gemini
  for (const card of agentResult.cards) {
    if (card.needs_image && card.image_prompt) {
      const imageUrl = await generateGeminiImage(card.image_prompt, projectId);
      card.image_url = imageUrl;
    }
  }

  return res.json(agentResult);
}
```

### 6.3 Gemini Image Generation Integration

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

async function generateGeminiImage(prompt: string, projectId: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview",
    contents: prompt,
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      // Decode base64 image data from Gemini response
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");

      // Save to local filesystem
      const filename = `img_${Date.now()}.png`;
      const dirPath = path.join(process.env.GENERATED_DIR || "./data/generated", projectId);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, filename), buffer);

      console.log(`Image saved: ${filename}`);
      return `/api/image/${projectId}/${filename}`;
    }
  }

  throw new Error("Gemini response did not contain image data");
}
```

**Key Notes**:
- Gemini returns images as `inlineData` (base64) within `response.candidates[0].content.parts`
- Each part can be either `text` or `inlineData` — iterate and extract the image part
- The SDK authenticates via `GOOGLE_API_KEY` environment variable
- No separate API URL needed — the SDK handles endpoint routing

---

## 7. File & Directory Structure

```
slidekit/
├── public/
│   └── fonts/                    # Playfair Display, Noto Sans SC (self-hosted)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main SPA page
│   │   ├── layout.tsx            # Root layout
│   │   └── api/
│   │       ├── generate/
│   │       │   └── route.ts      # POST /api/generate
│   │       ├── regenerate/
│   │       │   └── route.ts      # POST /api/regenerate
│   │       ├── upload-ref/
│   │       │   └── route.ts      # POST /api/upload-ref
│   │       └── image/
│   │           └── [...path]/
│   │               └── route.ts  # GET /api/image/:project_id/:filename
│   ├── components/
│   │   ├── TopicInput.tsx        # Input form component
│   │   ├── CardCarousel.tsx      # Card carousel viewer
│   │   ├── CardRenderer.tsx      # Single card render component
│   │   ├── CardCover.tsx         # Cover card layout
│   │   ├── CardContent.tsx       # Content card layout
│   │   ├── CardCTA.tsx           # CTA card layout
│   │   ├── InlineEditor.tsx      # contentEditable wrapper
│   │   ├── ImageUploader.tsx     # Reference image upload
│   │   └── ExportButton.tsx      # PNG export trigger
│   ├── lib/
│   │   ├── agent.ts              # Claude Code Agent invocation
│   │   ├── geminiImage.ts         # Gemini image generation client
│   │   ├── exportPng.ts          # html2canvas export logic
│   │   └── types.ts              # TypeScript types for card schema
│   └── styles/
│       ├── globals.css           # Global styles, CSS variables
│       └── card.css              # Card template styles
├── data/
│   ├── config.json               # App config (last vol number, etc.)
│   ├── uploads/                  # User-uploaded reference images
│   └── generated/                # AI-generated images by project
├── .env.local                    # Environment variables
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## 8. Environment Variables

```bash
# Google Gemini (Image Generation)
# Claude Code agent uses local CLI session auth — no ANTHROPIC_API_KEY needed
GOOGLE_API_KEY=<Google AI API key>
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation

# App Config
NODE_ENV=production
PORT=3000
UPLOAD_DIR=./data/uploads
GENERATED_DIR=./data/generated
MAX_UPLOAD_SIZE_MB=10
MAX_REFERENCE_IMAGES=5
```

---

## 9. Card JSON Type Definition

```typescript
interface SlideKitProject {
  project_id: string;
  created_at: string;
  meta: {
    topic: string;
    series_tag: string;
    read_time: string;
    total_cards: number;
  };
  cards: Card[];
}

interface Card {
  id: number;
  type: 'cover' | 'intro' | 'analysis' | 'trend' | 'summary' | 'cta';
  headline: string;
  subheadline: string | null;
  body: string | null;
  bullet_points: string[] | null;
  data_callout: string | null;
  footer_note: string | null;
  needs_image: boolean;
  image_prompt: string | null;
  image_placement: 'background' | 'top_half' | 'side' | null;
  image_url: string | null;
}

interface GenerateRequest {
  topic: string;
  angle?: string;
  vol_number?: number;
  reference_image_paths?: string[];
}

interface RegenerateRequest {
  project_id: string;
  card_id: number;
  context: {
    topic: string;
    all_cards_summary: string;
    reference_image_paths?: string[];
  };
}
```

---

## 10. Development Phases

### Phase 1 — MVP (Current Scope)

- [ ] Project scaffolding (Next.js + TypeScript)
- [ ] Card template CSS (single template: dark brown + gold copper)
- [ ] Card renderer components (Cover, Content, CTA)
- [ ] Topic input form with reference image upload
- [ ] Claude Code Agent integration (content generation)
- [ ] Nano Banana 2 / Gemini integration (image generation via `@google/genai`)
- [ ] Inline text editing on cards
- [ ] Single card regeneration
- [ ] PNG export per card (html2canvas)
- [ ] Loading states and error handling
- [ ] EC2 deployment setup

### Phase 2 — Enhancement (Future)

- [ ] Image asset manager (upload, crop, organize)
- [ ] Multiple template themes
- [ ] Visual drag-and-drop editor
- [ ] Batch download all cards as ZIP
- [ ] Project history (save/load past projects)

### Phase 3 — Platform (Future)

- [ ] User account system
- [ ] Template marketplace
- [ ] Batch generation from CSV
- [ ] API access for third-party integrations

---

## 11. Acceptance Criteria (MVP)

1. **Generate**: User inputs "Rally 泰国包袋品牌" → system returns 6-8 styled cards within 120 seconds
2. **Visual Quality**: Exported PNG cards at 1080×1440 look native to Xiaohongshu — fonts render correctly, colors match spec, images are properly placed
3. **Edit**: User clicks on card headline → text becomes editable → changes persist immediately
4. **Regenerate**: User clicks "Regenerate" on card 3 → new card 3 appears within 30 seconds → narrative still flows with cards 2 and 4
5. **Export**: Downloaded PNG is exactly 1080×1440px, no UI artifacts (buttons, borders), fonts embedded correctly
6. **Image Generation**: Cover card always has an AI-generated image; at least 1-2 inner cards have images when relevant
7. **Reference Images**: When user uploads a brand photo, the generated images reflect similar visual style/elements
8. **Content Quality**: Generated text follows the persona voice, uses no banned phrases, contains no internal company information
9. **Error Handling**: Network failures, API timeouts, and image generation failures show user-friendly error messages with retry options

---

## 12. Technical Notes for Development

### 12.1 Font Loading

Self-host both fonts to avoid CORS issues with html2canvas:
```bash
# Download and place in public/fonts/
# Playfair Display: Regular, Bold
# Noto Sans SC: Regular, Medium, Bold
```

Reference in CSS:
```css
@font-face {
  font-family: 'Playfair Display';
  src: url('/fonts/PlayfairDisplay-Regular.woff2') format('woff2');
  font-weight: 400;
}
/* ... additional weights */
```

### 12.2 html2canvas Configuration

```javascript
import html2canvas from 'html2canvas';

async function exportCardToPng(cardElement: HTMLElement, filename: string) {
  // Wait for fonts
  await document.fonts.ready;

  // Hide UI elements
  cardElement.classList.add('export-mode');

  const canvas = await html2canvas(cardElement, {
    scale: 2,                    // 2x for retina
    width: 1080,
    height: 1440,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#1a1a1a',
    logging: false,
  });

  // Restore UI elements
  cardElement.classList.remove('export-mode');

  // Download
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

### 12.3 Card Rendering for Export

Cards must render identically at preview size and export size. Use CSS transform for preview scaling:
```css
.card-container {
  width: 1080px;
  height: 1440px;
  transform-origin: top left;
  /* Scale dynamically based on viewport */
}
```

### 12.4 Claude Code Agent — Regeneration Prompt

When regenerating a single card, provide context:
```
Regenerate card {card_id} (type: {card_type}) for the topic "{topic}".

Context — surrounding cards for narrative coherence:
- Card before: {previous_card_headline} — {previous_card_body_snippet}
- Card after: {next_card_headline} — {next_card_body_snippet}

Keep the same type and approximate length. Offer a fresh angle or different data point.
Output the single card JSON only.
```

---

## 13. Content Template Reference

This is the editorial framework the Agent should follow. These are not rigid rules but guidelines for content structure.

### Card Flow Pattern

| Card # | Type | Purpose | Key Element |
|--------|------|---------|-------------|
| 1 | Cover | Hook attention | Provocative question or surprising stat |
| 2 | Intro | Set context | "Here's what's happening" |
| 3 | Analysis | First insight | The "what" |
| 4 | Analysis | Deeper dive | The "why" |
| 5 | Analysis | Evidence | Data, examples, social proof |
| 6 | Trend | Bigger picture | "This is part of a larger shift" |
| 7 | Summary | Takeaways | "Here's what this means for you" |
| 8 | CTA | Engagement | Follow, save, comment prompt |

### Writing Style Examples

**Good headline**: "一个泰国包卖到2000块，年轻人居然排队买？"
**Bad headline**: "泰国本土品牌Rally深度解析｜干货满满建议收藏"

**Good body**: "Rally 的 City Tote 在 Lazada 上长期断货。不是因为产能不够，而是品牌刻意控制供应量——每次补货都在 Instagram 提前 48 小时预告，制造紧迫感。"
**Bad body**: "今天给大家分享一个超级有意思的泰国品牌！相信很多小伙伴都还不知道..."

---

*End of PRD*
