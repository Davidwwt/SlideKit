# SlideKit

自动生成小红书图文卡片集的自托管工具。输入话题，AI 生成 6-8 张排版完整的卡片（文案 + 配图），直接导出 PNG 发布。

## 技术栈

- **Frontend/Backend**: Next.js (App Router, TypeScript)
- **AI Agent**: Claude Code CLI（`claude -p` 子进程，复用本地 session auth，无需 API Key）
- **图片生成**: Google Gemini (`gemini-2.0-flash-exp-image-generation` via `@google/genai`)
- **图片导出**: html2canvas

## 环境要求

- Node.js 18+
- Claude Code CLI 已安装并登录（`claude` 命令可用）
- Google Gemini API Key

## 配置

编辑 `.env.local`：

```bash
GOOGLE_API_KEY=<your Google AI API key>
GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp-image-generation

NODE_ENV=development
UPLOAD_DIR=./data/uploads
GENERATED_DIR=./data/generated
MAX_UPLOAD_SIZE_MB=10
MAX_REFERENCE_IMAGES=5
```

> Claude Code agent 使用本地 CLI session 认证，**不需要** `ANTHROPIC_API_KEY`。

## 启动

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`

## 目录结构

```
src/
├── app/
│   ├── page.tsx              # 主页面
│   └── api/
│       ├── generate/         # POST /api/generate
│       ├── regenerate/       # POST /api/regenerate
│       ├── upload-ref/       # POST /api/upload-ref
│       └── image/            # GET /api/image/:project_id/:filename
├── components/               # UI 组件
└── lib/
    ├── agent.ts              # Claude Code CLI 调用
    ├── geminiImage.ts        # Gemini 图片生成
    ├── exportPng.ts          # html2canvas 导出
    └── types.ts              # TypeScript 类型定义
data/
├── config.json               # vol 编号等配置
├── uploads/                  # 用户上传的参考图
└── generated/                # AI 生成图片
```

## 卡片规格

- 尺寸：1080 × 1440 px（3:4，小红书标准）
- 风格：深棕色背景 (#1a1a1a → #2d2520) + 金铜色点缀 (#c8956c)
- 字体：Playfair Display（标题）+ Noto Sans SC（正文）
