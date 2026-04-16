# Technology Stack

**Analysis Date:** 2026-04-15

## Languages

**Primary:**
- TypeScript ^5 - all source files in `src/`

**Secondary:**
- SQL - database migrations in `supabase/migrations/`

## Runtime

**Environment:**
- Node.js (LTS) - required by Next.js

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.35 - App Router, Server Actions, API routes
- React ^18 - UI rendering

**Build/Dev:**
- PostCSS ^8 - CSS processing (`postcss.config.mjs`)
- Tailwind CSS ^3.4.1 - utility-first styling (`tailwind.config.ts`)
- TypeScript ^5 - strict mode enabled (`tsconfig.json`)
- ESLint ^8 with `eslint-config-next` 14.2.35 - linting

**Testing:**
- Not configured (no jest/vitest config found)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.103.2 - Supabase JS client (auth, db, storage, realtime)
- `@supabase/ssr` ^0.10.2 - Supabase SSR helpers for Next.js (cookie-based session management)
- `next` 14.2.35 - framework core
- `lucide-react` ^1.8.0 - icon library (thin, consistent icons per design spec)

**Infrastructure:**
- No additional infrastructure packages detected (no PWA, no state management library)

## Configuration

**TypeScript (`tsconfig.json`):**
- `strict: true` - all strict checks enabled
- `noEmit: true` - type-check only, Next.js handles compilation
- Path alias `@/*` → `./src/*`
- Module resolution: `bundler`

**Tailwind (`tailwind.config.ts`):**
- Scans `src/pages/**`, `src/components/**`, `src/app/**`
- Extends with CSS variable-based `background` and `foreground` colors
- No additional plugins

**Next.js (`next.config.mjs`):**
- Empty config - no custom settings, no PWA plugin configured yet

**PostCSS (`postcss.config.mjs`):**
- Standard Next.js PostCSS setup

## Platform Requirements

**Development:**
- Node.js LTS
- Supabase CLI for local development (`supabase start`, `supabase db push`)
- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Production:**
- Vercel deployment target
- Supabase hosted project

---

*Stack analysis: 2026-04-15*
