# Variáveis de ambiente

Todas as chaves que o projeto usa, para que servem, onde se obtêm e **onde têm de
ficar**. Nenhum destes valores está no código — quem tiver o código sem estes
valores não consegue pôr o site a funcionar.

> **Nunca** coloques este ficheiro com valores preenchidos no GitHub, nem
> partilhes o `.env.local`. O `.gitignore` já protege os ficheiros `.env*`.

---

## Resumo rápido

| Variável | É segredo? | Onde tem de estar |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | não | `.env.local` + **variáveis de build** do Worker |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | não | `.env.local` + **variáveis de build** do Worker |
| `NEXT_PUBLIC_SITE_URL` | não | `.env.local` + **variáveis de build** do Worker |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | não | `.env.local` + **variáveis de build** do Worker *(opcional)* |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | não | **variáveis de build** do Worker *(opcional)* |
| `R2_PUBLIC_URL` | não | `.env.local` + **`wrangler.toml`** (secção `[vars]`) |
| `R2_ACCOUNT_ID` | **sim** | `.env.local` *(só local — ver nota)* |
| `R2_ACCESS_KEY_ID` | **sim** | `.env.local` *(só local)* |
| `R2_SECRET_ACCESS_KEY` | **sim** | `.env.local` *(só local)* |
| `R2_BUCKET` | não | `.env.local` *(opcional; por omissão `vehicle-images`)* |
| `RESEND_API_KEY` | **sim** | `.env.local` + **segredo do Worker** |

**Onde ficam as "variáveis de build" do Worker:**
Cloudflare → Workers & Pages → `chikane-garage1` → **Settings** → **Builds** →
**Environment Variables**.

**Segredos do Worker:**
`npx wrangler secret put NOME_DA_CHAVE --name chikane-garage1`

---

## Públicas (visíveis no site)

Estas variáveis começam por `NEXT_PUBLIC_` e vão embutidas no site construído —
são visíveis a quem inspecionar a página. **Não são segredos**, mas o site não
funciona sem elas, e têm de existir **no momento em que o site é construído**
(por isso ficam nas *Builds → Environment Variables*).

### `NEXT_PUBLIC_SUPABASE_URL`

- **Para que serve:** endereço do projeto Supabase (base de dados e contas).
- **Onde obter:** Supabase → Project Settings → API → *Project URL*.
- **Formato:** `https://xxxxxxxxxxxx.supabase.co`

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- **Para que serve:** chave pública de acesso à base de dados.
- **Onde obter:** Supabase → Project Settings → API → *anon public*.
- **Nota:** é *pública por desenho*. A proteção dos dados é feita pelas regras
  **RLS** definidas nos ficheiros em `supabase/` — nunca pela chave.
  ⚠️ **Nunca** uses aqui a chave `service_role` (essa ignora todas as regras e
  não deve existir em código de aplicação).

### `NEXT_PUBLIC_SITE_URL`

- **Para que serve:** o endereço canónico do site. Usado no `sitemap.xml`, no
  `robots.txt`, nas imagens de partilha (OpenGraph) e nos links dos emails.
- **Valor:** `https://o-teu-dominio` (sem barra no fim).
- **Se ficar vazio:** o sitemap e as partilhas em redes sociais ficam incompletos.

### `NEXT_PUBLIC_GA_MEASUREMENT_ID` *(opcional)*

- **Para que serve:** estatísticas do Google Analytics 4.
- **Onde obter:** <https://analytics.google.com> → fluxo Web → *Measurement ID*.
- **Formato:** `G-XXXXXXXX`.
- **Nota:** o Analytics **só** é carregado depois de o visitante aceitar os
  cookies (ver `components/cookie-consent.tsx`). Se ficar vazio, o site funciona
  normalmente e nada é medido.

### `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` *(opcional)*

- **Para que serve:** prova de posse do site para o Google Search Console
  (insere uma meta tag no HTML).
- **Onde obter:** Search Console → adicionar propriedade → método *etiqueta HTML*
  → o valor dentro de `content="..."`.
- **Nota:** alternativa sem esta variável: verificar por registo **TXT** no DNS
  (não requer deploy). Lida em `app/layout.tsx`.

---

## Do Cloudflare R2 (fotografias)

### `R2_PUBLIC_URL`

- **Para que serve:** endereço público de onde as fotografias são servidas.
- **Onde obter:** Cloudflare → R2 → bucket `vehicle-images` → Settings → *Public
  access* → endereço `r2.dev` (ou domínio próprio).
- **Formato:** `https://pub-xxxxxxxxxxxxxxxx.r2.dev` (sem barra no fim).
- **⚠️ Obrigatório:** o código **recusa o upload** sem esta variável
  (`lib/r2.ts`).
- **Onde fica:** no `.env.local` para desenvolvimento **e** no `wrangler.toml`
  (secção `[vars]`) para produção.

### `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

- **Para que servem:** credenciais de acesso ao R2 usadas **apenas quando corres o
  projeto no teu PC**. Em produção, o site acede ao R2 por uma ligação interna do
  Cloudflare (binding `VEHICLE_IMAGES` do `wrangler.toml`) e **não** precisa
  destas chaves.
- **Onde obter:** Cloudflare → R2 → *Manage API tokens* → Create API token
  (permissão *Object Read & Write*, limitado ao bucket `vehicle-images`). O
  *Account ID* está no painel lateral do dashboard.
- **Nota:** estas são **segredos reais** — não partilhar nem colocar em código.

### `R2_BUCKET` *(opcional)*

- **Para que serve:** nome do bucket, para desenvolvimento local.
- **Valor predefinido:** `vehicle-images` (não precisas de o definir se usares
  esse nome).

---

## Do Resend (emails)

### `RESEND_API_KEY`

- **Para que serve:** enviar todos os emails: confirmações de pedidos,
  reservas, test-drives, newsletter e avisos ao backoffice.
- **Onde obter:** <https://resend.com> → API Keys → Create API Key.
- **Formato:** `re_xxxxxxxxxxxx`.
- **Onde fica:** no `.env.local` **e** como **segredo do Worker** (produção).
- **⚠️ Importante:** sem esta chave no Worker, o envio de emails do site
  (newsletter) **falha em silêncio** — a página diz que correu bem mas nada é
  enviado. É a causa nº 1 de "os emails não chegam".
- **Nota:** a Supabase também a usa para enviar os emails de autenticação
  (SMTP) — ver `supabase/email-templates/LEIAME.md`.

---

## Ficheiros de exemplo

- **`.env.local.example`** — modelo com todas as variáveis, sem valores.
  Copia-o para `.env.local` e preenche.
- **`.env.local`** — o teu ficheiro real. **Nunca** é enviado para o GitHub.

---

## Variáveis de outros sítios (não usadas em produção)

Estas existem apenas num ficheiro de automação antigo
(`.github/workflows/deploy.yml`) que já **não** publica nada — a produção é
publicada pelo Worker. Podes ignorá-las.

| Variável | Onde | Estado |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets | vestigial, não usada pela app |
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | vestigial |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | vestigial |

---

Voltar ao [README](../README.md) · Ver [pôr o site no ar](COLOCAR_NO_AR.md) ·
Ver [guia de layouts](GUIA_LAYOUTS.md) · Ver [regras para IA](REGRAS_PARA_IA.md)

*Última atualização: 2026-10-14.*
