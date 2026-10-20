<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ⚠️ REGRA ABSOLUTA DO DONO — NÃO ALTERAR A LÓGICA

**É proibido alterar a lógica da aplicação.** Só se mexem em **layouts**
(aparência, estrutura visual e textos visuais). A lógica só se altera quando o
dono do projeto o pedir **explicitamente** — caso contrário, para e pergunta.

Não mexer (sem autorização explícita): consultas à base de dados
(`supabase.from/select/insert/update/rpc`, `createClient`, `getUser`), controlo de
acesso/`redirect`, `app/actions/*`, `app/api/**/route.ts`, `lib/*`,
`supabase/*.sql`, `proxy.ts`, `next.config.ts`, `wrangler.toml`, `package.json`,
variáveis de ambiente. Dentro das páginas só o `return (...)` (o que se vê).

Guia detalhado e lista completa: **`docs/REGRAS_PARA_IA.md`** (ler sempre antes de
mexer). Onde está cada ecrã: **`docs/GUIA_LAYOUTS.md`**. Documentação técnica
completa (deploy, chaves): pasta **`docs/`** — os ficheiros antigos
(`DOCUMENTO_PROJETO.txt`, `DEPLOY_GUIDE.html`, `BOOTSTRAP.txt`) já não são a fonte
de verdade.

## 📌 Ponto de entrada da IA — ler primeiro

**`docs/INSTRUCOES_PARA_IA.md`** diz o que o dono tem em mente, o que já está
definido, o que é só plano, como se classifica cada pedido (layout vs lógica) e
onde está cada documento. Antes de qualquer trabalho, ler por esta ordem:
`docs/INSTRUCOES_PARA_IA.md` → `docs/REGRAS_PARA_IA.md` → `docs/FASES.md` →
`docs/PLANO_LOJA.md`.

# Chikane Garage

Single Next.js 16 App Router app (React 19, Tailwind v4, strict TS) — no monorepo. **All UI copy, code comments, and commit messages are in Portuguese (pt-PT); keep new ones that way.** Import alias `@/*` → repo root.

## Agentes e modelos (`opencode.json`)
`opencode.json` define os agentes do projeto — **todos os modelos são free**. Ao delegar subtarefas, usa o modelo da lista conforme o tipo de tarefa (parâmetro `model`):
- Planeamento/análise → `opencode/fledge-alpha-free`
- Programação/debug → `opencode/mimo-v2.6-flash-free`
- Revisão de código → `opencode/nemotron-3.5-lightning-free`
- Tarefas rápidas → `opencode/ling-3.1-flash-free`
- Trabalho principal (default) → `opencode/big-pickle`

## Commands
- `npm run dev` — `next.config.ts` calls `initOpenNextCloudflareForDev()`, so `next dev` runs with the OpenNext/Cloudflare shim.
- Verify changes: `npx tsc --noEmit` (currently clean) → `npm run lint` → `npm run build` (reads `.env.local`, all routes are dynamic per the build output). **There is no test runner** — none exists, don't add one or look for a test script.
- Lint is **not green today** and that's expected:
  - A handful of pre-existing errors in project code (react-hooks rules in `app/admin/pedidos`, `components/ui/favorites-list`, `components/cookie-consent`, `components/ui/vehicle-photo-picker`). Only ensure you add none — scope a change with `npx eslint <paths>`.
  - `.open-next/` (gitignored build output) is missing from the ignores in `eslint.config.mjs`, so after `npm run preview`/`deploy` a full `npm run lint` fails with thousands of generated-file errors.
- Cloudflare: `npm run preview` / `npm run deploy` (OpenNext build → `.open-next/` → wrangler per `wrangler.toml`). After changing wrangler bindings, run `npm run cf-typegen` to regenerate `cloudflare-env.d.ts` (gitignored).

## Architecture
- Request interception is **`proxy.ts` at the repo root** (Next 16 renamed middleware → proxy; don't create `middleware.ts`). It does the HTTP→HTTPS redirect, Supabase cookie session, and is the **only `/admin` auth check** (`profiles.role === 'admin'`; `app/admin/layout.tsx` is nav-only).
- `proxy.ts` only guards page loads → **server actions must re-check auth/admin themselves** (`supabase.auth.getUser()` + profile `role`; pattern in `app/actions/upload.ts`).
- Supabase (DB + auth) with the **anon key only** — no service-role key in app code; every table access goes through RLS policies defined in `supabase/setup.sql` (admin writes = `EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')`).
- Vehicle photos in R2: Workers binding `VEHICLE_IMAGES`, with an S3-compatible fallback (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) for local dev. `R2_PUBLIC_URL` is required or `uploadToR2()` throws.
- Sold vehicles stay publicly visible for **7 days** — filter public listings through `isVehiclePubliclyVisible()` (`lib/vehicle-visibility.ts`).
- Vehicle detail pages are keyed by **slug, not id**: `/catalogo/[slug]` queries `.eq("slug", slug)`, so `revalidatePath` on vehicle pages needs the slug.
- Admin create/edit vehicle forms prefill brand/model specs from hand-maintained `lib/vehicle-catalog.json` — add new models there.
- GA loads only after explicit cookie consent (`components/cookie-consent.tsx`, localStorage `chikane-cookie-consent-v1`); any new third-party tracker must go through it.

## Database changes
No Supabase CLI / `config.toml` — SQL is run by hand in the Supabase dashboard SQL Editor. **`supabase/setup.sql` is the single schema file**: tables, columns, RLS policies, indexes, triggers, RPCs, grants and the initial CMS content. The incremental migrations (`002_…` → `020_…`, `favorites.sql`, `newsletter.sql`, `migration_vehicle_sold_expiry.sql`, `migracao_perfil_e_fotos.sql`) were consolidated into it and deleted; `supabase/seed.sql` is optional demo data. It is **idempotent** — safe to re-run on an existing database (no destructive statements). When adding anything: `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, and always `ENABLE ROW LEVEL SECURITY` + policies on new tables.

## Env, CI, stale docs
- `.env.local` is gitignored (`.env*`, so even `.env.local.example` is untracked). It documents Supabase URL/anon key, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`; server-only vars are discoverable only in code: `R2_*`, `RESEND_API_KEY` (Resend, used by the newsletter routes; `/test-newsletter` is a manual debug page).
- Push/PR to `main` runs `.github/workflows/deploy.yml`: `npm ci` + `npm run build` (only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are passed to the build) then `cloudflare/pages-action` — don't introduce other required build-time env without updating the workflow.
- **Production runs the git-synced Worker `chikane-garage1`** (custom domain `chikanegarage.blog`, built by Cloudflare Workers Builds on each push to `main`; `wrangler.toml` `name` matches it). The Pages project `chikane-garage` and the workflow above are vestigial — their builds 404 and serve nothing. Server secrets live on that worker: `npx wrangler secret put <KEY> --name chikane-garage1` (`RESEND_API_KEY` set on 2026-10-07; without it the newsletter route silently skips sending).
- `DOCUMENTO_PROJETO.txt` and `DEPLOY_GUIDE.html` were reconciled with the current Cloudflare/OpenNext deploy (2026-10-07) — if you change deploy config, keep them in sync. `BOOTSTRAP.txt` is a local setup checklist. Trust `package.json` / `wrangler.toml` / `next.config.ts` over prose. The owner's personal notes are no longer kept in the repo; leftover one-off work files (`fix_contas.mjs`, `fix_perfil.mjs`, `FIX_HELLO_WORLD.html`) are scratch, not instructions.
- `CLAUDE.md` contains only `@AGENTS.md` (imports this file).