# Clarvo AI — Learning Copilot

> AI-powered note-taking and concept extraction for lectures and online courses.

Clarvo AI automatically transcribes audio, extracts key concepts via Gemini 1.5 Pro, generates flashcards, and exports structured notes to Notion — all from a lightweight browser extension.

---

## Monorepo Structure

```
AI-Note-Taker/
├── apps/
│   ├── web/          Next.js 15 + Cloudflare Workers
│   └── extension/    Plasmo MV3 Chrome/Firefox extension
├── packages/
│   ├── ui/           Shared React component library
│   ├── types/        Shared TypeScript contracts
│   ├── utils/        Shared logic (AI, Notion, billing)
│   ├── tsconfig/     Shared TypeScript configs
│   └── eslint-config/ Shared ESLint rules
└── supabase/
    └── migrations/   Database schema SQL migrations
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web App | Next.js 15, React 19, Tailwind CSS |
| Deploy | Cloudflare Workers via @opennextjs/cloudflare |
| Extension | Plasmo 0.90.5, Chrome MV3 / Firefox MV2 |
| AI | Gemini 1.5 Pro (concepts/flashcards/vision) |
| Audio | Deepgram Nova-2 (real-time transcription) |
| Auth & DB | Supabase (PostgreSQL + Row Level Security) |
| Billing | Stripe (freemium / PRO tiers) |
| Notes Export | Notion OAuth API |
| Build | Turborepo + pnpm workspaces |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9.15.0 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example apps/web/.env.local
# Fill in: DEEPGRAM_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, etc.

# 3. Run local Supabase (requires Docker)
npx supabase start

# 4. Apply migrations
npx supabase db push

# 5. Start all apps in watch mode
pnpm dev
```

### Individual apps

```bash
pnpm --filter @clarvo/web dev         # Web app → localhost:3000
pnpm --filter @clarvo/extension dev   # Extension → build/.../chrome-mv3-dev/
```

## Environment Variables

See `.env.example` for a full list. Required at minimum:

|Var | Description |
|-----|-------------|
| `DEEPGRAM_API_KEY` | Deepgram Nova-2 transcription |
| `GEMINI_API_KEY` | Google Gemini 1.5 Pro |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `STRIPE_SECRET_KEY` | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature |

## Deployment

```bash
# Web app → Cloudflare Workers
pnpm --filter @clarvo/web build
pnpm --filter @clarvo/web deploy   # runs wrangler deploy

# Extension → Chrome Web Store
pnpm --filter @clarvo/extension build:chrome
pnpm --filter @clarvo/extension package
```

## License

MIT
