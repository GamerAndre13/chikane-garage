---
name: project-rules
description: Regras e convenções do Chikane Garage
---

# Chikane Garage - Regras do Projeto

## Stack Tecnológica
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 (inline @theme)
- **Database/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Language**: TypeScript (strict mode)
- **UI Components**: shadcn/ui v4 (via MCP server)

## Design System (Dark Theme Premium)
```css
/* Cores principais */
--bg: #0a0a0a;           /* Background principal */
--surface: #141414;      /* Cards, modais, sidebar */
--surface-raised: #1c1c1c; /* Elementos elevados */
--foreground: #f5f5f0;   /* Texto principal */
--muted: #9a9a94;        /* Texto secundário */
--border: #2a2a2a;       /* Bordas */
--copper: #b87333;       /* Accent principal (marca) */
--copper-light: #d99b5f; /* Accent hover */
--silver: #c8c8c8;       /* Texto prata */
--red: #a32020;          /* Erro/perigo */

/* Fontes */
--font-display: 'Oswald', sans-serif; /* Headings, uppercase, tracking-wide */
--font-body: 'Inter', sans-serif;     /* Body text */
```

## Estrutura de Pastas
```
chikane-garage-novo/
├── .claude/
│   └── skills/              # Skills do projeto
├── app/
│   ├── (auth)/              # Route group para auth
│   │   ├── conta/           # Login, registo, perfil
│   │   └── auth/callback/   # Callback email confirmation
│   ├── (admin)/             # Route group para admin
│   │   └── admin/           # Dashboard, veículos, leads, etc.
│   ├── api/                 # API routes (se precisar)
│   ├── catalogo/            # Páginas públicas de veículos
│   ├── components/          # Componentes React partilhados
│   ├── actions/             # Server Actions ("use server")
│   ├── globals.css          # Tailwind + @theme + fonts
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home
├── components/
│   ├── layout/              # Header, Footer, Sidebar
│   ├── ui/                  # Componentes shadcn/ui
│   └── vehicles/            # Componentes específicos veículos
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Supabase client (browser)
│   │   └── server.ts        # Supabase server (cookies + SSR)
│   └── utils.ts             # Utilitários (cn, formatters)
├── middleware.ts            # Proteção rotas /admin/*
├── supabase/
│   ├── setup.sql            # SQL completo para Supabase
│   └── migrations/          # Migrações versionadas
├── public/                  # Assets estáticos
└── package.json
```

## Convenções de Código

### Server vs Client Components
- **Default**: Server Components (sem "use client")
- **Adiciona "use client"** apenas quando precisares de:
  - `useState`, `useEffect`, `useReducer`
  - `useRouter`, `useSearchParams`, `usePathname`
  - Event handlers (`onClick`, `onChange`, `onSubmit`)
  - Browser APIs (`localStorage`, `window`, `document`)
  - `supabase.auth.getUser()` no client (usa `lib/supabase/client.ts`)

### Supabase
- **Client side**: `lib/supabase/client.ts` → `createBrowserClient`
- **Server side**: `lib/supabase/server.ts` → `createServerClient` (com cookies)
- **Middleware**: `middleware.ts` → protege `/admin/*` verificando `role === 'admin'` na tabela `profiles`

### Tabela `profiles` (essencial)
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
email TEXT NOT NULL
full_name TEXT DEFAULT ''
phone TEXT DEFAULT ''
avatar_url TEXT DEFAULT ''
role TEXT DEFAULT 'user' -- 'user' | 'admin'
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### RLS (Row Level Security)
- `SELECT`: `true` (qualquer autenticado vê)
- `INSERT`: `false` (só via trigger `handle_new_user`)
- `UPDATE`: `auth.uid() = id` (próprio user)
- `DELETE`: `auth.uid() = id` (próprio user)

### Forms & Inputs
```tsx
// Estilo padrão inputs
<input className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper transition-colors" />

// Botão primário
<button className="bg-copper px-8 py-3 font-display text-sm uppercase tracking-widest text-background hover:bg-copper-light transition-colors" />

// Botão secundário
<button className="border border-border px-8 py-3 font-display text-sm uppercase tracking-widest text-muted hover:border-copper hover:text-foreground transition-colors" />
```

## Como Usar o MCP Server shadcn/ui

O servidor MCP está configurado globalmente. Para buscar componentes:

```bash
# Exemplos de componentes úteis para este projeto:
- sidebar          # Admin sidebar navigation
- data-table       # Tabelas com sorting, filtering, pagination
- dialog           # Modais (confirm delete, forms)
- form             # React Hook Form + Zod integration
- select           # Dropdowns (marca, modelo, ano)
- tabs             # Abas no admin
- sheet            # Mobile sidebar/drawer
- dropdown-menu    # User menu, actions menu
- avatar           # User avatar no header/perfil
- badge            # Status badges (admin, active, sold)
- button           # Todos os botões
- input            # Form inputs
- textarea         # Descrições veículos
- card             # Vehicle cards no catálogo
- table            # Admin tables (users, vehicles, leads)
- toast/sonner     # Notifications
```

**Como pedir-me para usar:**
> "Vai buscar o componente **sidebar** do shadcn e adapta para o admin layout"
> "Quero o **data-table** para a lista de veículos no admin"
> "Mostra-me o **dialog** para confirmação de eliminação"

## Autenticação & Auth Flow
1. **Registo**: `/conta` → email + password + full_name
2. **Confirmação email**: `/auth/callback` → troca code por sessão
3. **Login**: `/conta` → email + password
4. **Perfil**: `/conta/perfil` → editar nome, telefone, avatar, password
5. **Admin access**: middleware verifica `profile.role === 'admin'`
6. **Logout**: Server Action `app/actions/auth.ts`

## Email (Resend)
- Domínio teste: `onboarding@resend.dev` (sem verificação domínio)
- `FROM_EMAIL="Chikane Garage <onboarding@resend.dev>"`
- `ADMIN_EMAIL="onboarding@resend.dev"`
- Templates em `app/actions/contact.ts`, `app/actions/test-drive.ts`

## Próximos Passos (Checklist)
- [ ] Executar `supabase/setup.sql` no Supabase SQL Editor
- [ ] Configurar Supabase Auth: Email provider ON, Site URL, Redirect URLs
- [ ] Criar `.env.local` com keys do Supabase + Resend
- [ ] `npm install` + `npm run dev`
- [ ] Testar: Registo → Email → Login → Perfil → Admin