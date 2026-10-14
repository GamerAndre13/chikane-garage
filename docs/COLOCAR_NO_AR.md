# Pôr o site no ar — guia completo

Este guia leva-te do zero até ao site online em `https://o-teu-dominio`.
Faz as fases **pela ordem** — cada uma depende da anterior.

Se só quiseres pôr a funcionar outra vez um site que já existe, salta para a
[Fase 4](#fase-4--correr-o-projeto-no-teu-pc).

**Tempo estimado:** 1 a 2 horas (sem contar com a propagação de DNS, que pode
levar 5 a 30 minutos).

---

## Índice

- [Fase 0 — Pré-requisitos](#fase-0--pré-requisitos)
- [Fase 1 — Supabase (base de dados e contas)](#fase-1--supabase-base-de-dados-e-contas)
- [Fase 2 — Cloudflare R2 (fotografias)](#fase-2--cloudflare-r2-fotografias)
- [Fase 3 — Resend (emails)](#fase-3--resend-emails)
- [Fase 4 — Correr o projeto no teu PC](#fase-4--correr-o-projeto-no-teu-pc)
- [Fase 5 — GitHub](#fase-5--github)
- [Fase 6 — Cloudflare Worker (pôr online)](#fase-6--cloudflare-worker-pôr-online)
- [Fase 7 — Google (estatísticas e pesquisa)](#fase-7--google-estatísticas-e-pesquisa)
- [Fase 8 — Verificação final](#fase-8--verificação-final)
- [Problemas comuns](#problemas-comuns)

---

## Fase 0 — Pré-requisitos

Instala / cria contas (todas têm plano gratuito suficiente):

| O que | Onde | Para que serve |
|---|---|---|
| Node.js 20 ou superior | <https://nodejs.org> | correr o projeto no PC |
| Git | <https://git-scm.com> | enviar o código para o GitHub |
| Conta GitHub | <https://github.com> | guardar o código |
| Conta Cloudflare | <https://dash.cloudflare.com/sign-up> | alojar o site + fotografias |
| Conta Supabase | <https://supabase.com/dashboard> | base de dados + contas de utilizador |
| Conta Resend | <https://resend.com> | enviar emails (confirmações, contactos, newsletter) |
| Conta Google | <https://analytics.google.com> | estatísticas e presença na pesquisa (opcional) |
| Domínio próprio | registador à tua escolha | endereço do site (ex.: `chikanegarage.blog`) |

Confirma que o Node está instalado:

```bash
node -v      # deve responder v20.x ou superior
```

> **Sem domínio próprio?** Funciona na mesma — o Cloudflare dá um endereço
> temporário (`https://chikane-garage1.<a-tua-conta>.workers.dev`). Troca
> `https://o-teu-dominio` por esse endereço em todos os passos abaixo.
> O domínio só é obrigatório para emails (Fase 3) e para a verificação do Google
> (Fase 7).

---

## Fase 1 — Supabase (base de dados e contas)

### 1.1 Criar o projeto

1. Entra em <https://supabase.com/dashboard> → **New project**.
2. Nome: `chikane-garage`. Escolhe uma **região europeia** (ex.: `West EU` ou
   `eu-west-1`) — o público é português, fica mais rápido.
3. Define e **guarda** a password da base de dados (não é a mesma coisa que as
   chaves da aplicação).
4. Espera ~2 minutos até o projeto ficar pronto.

### 1.2 Copiar as chaves

Em **Project Settings → API**, copia:

- **Project URL** → vai para `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → vai para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> A chave `service_role` **não** é usada pela aplicação — nunca a coloques no
> código nem no `.env.local`. Toda a segurança é feita por RLS (regras na base de
> dados, definidas nos ficheiros `.sql`).

### 1.3 Criar a estrutura da base de dados

Abre **SQL Editor** no Supabase. Abre o ficheiro `supabase/setup.sql` deste
pacote, copia **todo** o conteúdo, cola no SQL Editor e carrega em **Run**.

| Ordem | Ficheiro | O que faz |
|---|---|---|
| 1 | `supabase/setup.sql` | **Tudo**: tabelas, colunas, RLS, políticas, índices, triggers, funções (RPC), permissões, textos iniciais e configuração do site. |
| 2 | `supabase/seed.sql` | *(Opcional)* Dados de exemplo — viaturas de demonstração com fotografias. **Salta esta linha num site real**: inseres as tuas viaturas pelo backoffice. |

> **Um único ficheiro.** Toda a estrutura vive no `supabase/setup.sql`. As
> migrations antigas (`002` a `020`, `favorites.sql`, `newsletter.sql`,
> `migration_vehicle_sold_expiry.sql`, `migracao_perfil_e_fotos.sql`) já foram
> consolidadas nele e deixaram de existir.
>
> É **idempotente**: podes correr `setup.sql` as vezes que quiseres. Num projeto
> novo cria tudo; num projeto que já está em produção apenas garante que está
> tudo na versão final — não apaga nem altera dados (exceto pequenos acertos
> pontuais sobre registos desatualizados, indicados no próprio ficheiro).
>
> Se já tinhas o site a funcionar e nunca correste a migration `020`, correr
> agora o `setup.sql` resolve isso: é ele que acrescenta o estado "arquivada"
> das viaturas e o estado "respondido" dos pedidos.

### 1.4 Configurar os endereços de autenticação

Em **Authentication → URL Configuration**:

- **Site URL:** `https://o-teu-dominio`
- **Redirect URLs** (adiciona todas):
  - `https://o-teu-dominio/auth/callback`
  - `https://o-teu-dominio/conta`
  - `http://localhost:3000/auth/callback` *(para desenvolvimento)*
  - `http://localhost:3000/conta` *(para desenvolvimento)*

Sem isto, o link de confirmação de conta leva o utilizador para o lado errado.

### 1.5 (Recomendado) Emails da marca

Por omissão, a Supabase envia os emails de confirmação como `no-reply@supabase.co`.
Para saírem como Chikane Garage: o passo-a-passo completo está em
[`supabase/email-templates/LEIAME.md`](../supabase/email-templates/LEIAME.md)
(configuração SMTP com Resend + template de email). Faz isto **depois** da
[Fase 3](#fase-3--resend-emails), porque precisas da chave do Resend.

### 1.6 Criar o primeiro administrador

Sem isto não consegues entrar no backoffice (`/admin`).

1. Com a Fase 4 concluída (site a correr), cria uma conta normal em
   `https://o-teu-dominio/conta` (ou em `http://localhost:3000/conta`).
2. No **SQL Editor** do Supabase, corre (troca o email pelo teu):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'o-teu-email@exemplo.com';
```

3. Sai e volta a entrar no site. O `/admin` fica acessível.

> Todos os novos registos entram como `user`. Para dar acesso a mais alguém,
> repete este `UPDATE` com o email dessa pessoa.

---

## Fase 2 — Cloudflare R2 (fotografias)

As fotografias das viaturas e os avatares são guardados no **R2** (armazenamento
de ficheiros do Cloudflare). Sem esta fase, o upload de fotos falha.

### 2.1 Criar o bucket

1. <https://dash.cloudflare.com> → **R2** → **Create bucket**.
2. Nome: **`vehicle-images`** (exatamente este, é o que o projeto espera).
3. Cria.

### 2.2 Tornar as imagens públicas

As fotos têm de ser visíveis publicamente (o site mostra-as diretamente).

1. Abre o bucket → **Settings** → secção **Public access**.
2. Liga o **R2.dev subdomain** (é o mais simples) ou liga um domínio próprio.
3. Copia o endereço que aparecer — algo como
   `https://pub-xxxxxxxxxxxxxxxx.r2.dev`.

Esse endereço é o valor de **`R2_PUBLIC_URL`**.

> ⚠️ Se o teu endereço for diferente do que está no `wrangler.toml`
> (`https://pub-44978f3d48d64618815b4f7834cc7f06.r2.dev`), tens de o atualizar
> nesse ficheiro — está na secção `[vars]`.

### 2.3 Criar as credenciais de acesso

Necessárias para o **upload a partir do teu PC** (em produção o site usa outra via
interna e não precisa destas chaves).

1. **R2** → **Manage API tokens** (lado direito) → **Create API token**.
2. Permissões: **Object Read & Write**.
3. Limita ao bucket `vehicle-images` (mais seguro).
4. Cria e copia (só aparecem uma vez):
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
5. O **Account ID** está na barra lateral do dashboard do Cloudflare →
   `R2_ACCOUNT_ID`.

---

## Fase 3 — Resend (emails)

Os emails de contacto/reserva/test-drive e a newsletter saem pelo Resend.

### 3.1 Verificar o domínio

1. <https://resend.com> → **Domains** → **Add domain** → `o-teu-dominio`.
2. O Resend mostra registos DNS (SPF, DKIM). Adiciona-os no teu registador de
   domínio (ou no Cloudflare → **DNS**).
3. Espera a propagação (5 a 30 minutos) e carrega em **Verify**.

> Sem domínio próprio: o Resend tem um domínio de testes
> (`onboarding@resend.dev`), mas só envia para o **teu** email — serve para
> testar, não para o site real.

### 3.2 Criar a chave de API

1. **API Keys** → **Create API Key**.
2. Nome: `chikane-garage`. Permissão: **Full access** (ou só *Sending*).
3. Copia o valor (começa por `re_`) — é o **`RESEND_API_KEY`**.

---

## Fase 4 — Correr o projeto no teu PC

### 4.1 Instalar as dependências

Na pasta do projeto (onde está o `package.json`):

```bash
npm install
```

### 4.2 Criar o ficheiro de variáveis

1. Copia `.env.local.example` para um ficheiro novo chamado **`.env.local`**
   (mesma pasta).
2. Preenche os valores. A explicação de cada um está em
   [`VARIAVEIS_AMBIENTE.md`](VARIAVEIS_AMBIENTE.md).

Exemplo de `.env.local` preenchido:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=https://o-teu-dominio

R2_ACCOUNT_ID=xxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
R2_BUCKET=vehicle-images
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev

RESEND_API_KEY=re_xxxxxxxxxxxx
```

> ⚠️ O `.env.local` **nunca** vai para o GitHub (está protegido pelo
> `.gitignore`). Contém chaves tuas.

### 4.3 Arrancar

```bash
npm run dev
```

Abre <http://localhost:3000>. Deves ver a home completa.

### 4.4 Verificar o essencial antes de publicar

- [ ] A home abre sem erros.
- [ ] `/catalogo` mostra viaturas.
- [ ] Consigo criar conta em `/conta` e recebo o email de confirmação.
- [ ] Depois de me tornar admin (passo 1.6), o `/admin` abre.
- [ ] No admin, criar uma viatura e carregar uma fotografia funciona (testa o R2).

---

## Fase 5 — GitHub

O código já está pronto. Só precisas de o guardar num repositório teu.

```bash
git init
git add .
git commit -m "Chikane Garage: versao inicial"
git branch -M main
git remote add origin https://github.com/O-TEU-UTILIZADOR/chikane-garage.git
git push -u origin main
```

> Se o repositório já existir, salta o `git init` e o `git remote add`.
> Confirma com `git status` que o `.env.local` **não** aparece na lista de
> ficheiros a enviar.

---

## Fase 6 — Cloudflare Worker (pôr online)

### 6.1 Ligar o Worker ao repositório

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   **Workers** → **Connect to Git**.
2. Escolhe o repositório `chikane-garage` e o ramo **`main`**.
3. Nome do Worker: **`chikane-garage1`** (tem de ser igual ao `name` do
   `wrangler.toml`; se escolheres outro nome, atualiza também o `wrangler.toml`).
4. Nas definições de build:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
5. **Save and Deploy**.

> A partir daqui, **cada `git push` para `main` reconstrói e publica o site
> sozinho** (demora 5 a 9 minutos).

### 6.2 Variáveis de build

São os valores que ficam **embutidos no site** quando ele é construído. Sem eles,
o site publicado fica sem base de dados.

Cloudflare → **Workers & Pages** → **`chikane-garage1`** → **Settings** →
**Builds** → **Environment Variables** (variáveis de build):

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | o mesmo do `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | o mesmo do `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | `https://o-teu-dominio` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | (opcional) ver [Fase 7](#fase-7--google-estatísticas-e-pesquisa) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | (opcional) ver [Fase 7](#fase-7--google-estatísticas-e-pesquisa) |

Depois de as adicionares, faz um novo deploy (push ou botão **Retry deployment**).

### 6.3 Segredos de execução

Chaves que **não** podem estar visíveis no código. Em produção só existe **uma**:

```bash
npx wrangler login
npx wrangler secret put RESEND_API_KEY --name chikane-garage1
```

O Wrangler pergunta o valor — cola o do `.env.local`.

> **E as chaves do R2?** Em produção **não** são precisas: o site acede ao R2
> através de uma ligação interna do Cloudflare (binding `VEHICLE_IMAGES`), que já
> está declarada no `wrangler.toml`. As variáveis `R2_ACCOUNT_ID`,
> `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` servem **apenas** para correr o
> projeto no teu PC (Fase 4) e nunca devem ser necessárias no Worker.

> **Alternativa pelo dashboard:** Workers & Pages → `chikane-garage1` →
> **Settings** → **Variables and Secrets** → **Add** → tipo **Secret**.

> **Importante:** sem o `RESEND_API_KEY`, a newsletter *parece* funcionar mas
> **não envia nada** (a rota devolve sucesso e regista um aviso no log). Foi a
> causa de um bug difícil de encontrar — não te esqueças deste passo.

### 6.4 Ligar o domínio

1. Workers & Pages → `chikane-garage1` → **Settings** → **Domains & Routes**.
2. **Add** → **Custom domain** → `o-teu-dominio`.
3. Se o domínio estiver no Cloudflare, a configuração é automática. Se não,
   aponta os *nameservers* do domínio para o Cloudflare.

### 6.5 (Alternativa) Publicar a partir do PC

Se preferires não ligar o Git (ou para um primeiro teste):

```bash
npm run deploy
```

Isto constrói e publica diretamente, usando o `wrangler.toml` deste projeto.

### 6.6 Confirmar que ficou tudo bem

```bash
npx wrangler deployments list --name chikane-garage1
```

Deve listar deployments recentes. Depois abre `https://o-teu-dominio` no
navegador.

> **Está a ver a versão antiga?** O Cloudflare mantém cache. Abre o site com um
> parâmetro qualquer no fim, por exemplo
> `https://o-teu-dominio/?v=1` — força a versão nova.

---

## Fase 7 — Google (estatísticas e pesquisa)

Opcional, mas recomendado: ter estatísticas de visitas e aparecer na pesquisa.
Os dois serviços são independentes; podes fazer só um.

### 7.1 Google Analytics 4 (estatísticas)

1. <https://analytics.google.com> → **Admin** → **Criar propriedade** (nome do
   site, fuso horário de Lisboa).
2. Em **Fluxos de dados** → **Web** → o teu domínio. Obtém o **ID de medição**
   (formato `G-XXXXXXXX`).
3. Coloca esse valor em **dois** sítios:
   - no `.env.local` (desenvolvimento): `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX`;
   - nas **variáveis de build** do Worker (passo 6.2) — é isto que conta no site
     publicado.
4. Faz um novo deploy e confirma: aceitar os cookies no site → GA4 →
   *Relatórios → Tempo real* → deve aparecer a tua visita.

> O Analytics **só** carrega depois de o visitante aceitar os cookies. Se não
> aceitares, não aparece nada — é o comportamento correto.
>
> *(Opcional)* GA4 → **Admin → Fluxos de dados → Definir tráfego interno**, para
> excluir as tuas próprias visitas das estatísticas.

### 7.2 Google Search Console (aparecer na pesquisa)

1. <https://search.google.com/search-console> → **Adicionar propriedade** → tipo
   **Domínio** → `o-teu-dominio`.
2. **Verificar**: copia o registo **TXT** que o Search Console mostra →
   Cloudflare → **DNS** → **Adicionar registo** → tipo `TXT`, nome `@`, valor
   colado → espera 5 a 30 minutos → **Verificar**.
   *(Alternativa sem DNS: escolher o método "Etiqueta HTML" e colocar o valor em
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, nas variáveis de build do Worker.)*
3. Em **Sitemaps**, submete: `https://o-teu-dominio/sitemap.xml`.
4. Em **Inspeção de URL**, pede a indexação da página inicial.
5. A indexação demora dias — é normal. Volta 3 a 7 dias depois e confirma o
   relatório **Páginas**.

> O `robots.txt` e o `sitemap.xml` são gerados automaticamente pelo site; não
> precisas de os criar.

---

## Fase 8 — Verificação final

Faz esta lista **no site publicado**:

- [ ] A home abre e aparece o desenho completo.
- [ ] `http://o-teu-dominio` (sem `s`) redireciona para `https://`.
- [ ] `/catalogo` lista viaturas; abrir uma ficha funciona.
- [ ] Os filtros do catálogo funcionam.
- [ ] Criar conta funciona e chega o email de confirmação.
- [ ] Recuperar password funciona.
- [ ] `/admin` abre (com um utilizador `admin`) e fecha para quem não é admin.
- [ ] No admin: criar/editar viatura e **carregar fotografias** (R2).
- [ ] No admin: marcar uma viatura como ★ Destaque e ver o spotlight na home.
- [ ] Formulário de contacto guarda o pedido e ele aparece em `/admin/pedidos`.
- [ ] Marcar test-drive: aparece o calendário e o pedido chega ao admin.
- [ ] Newsletter: subscrever e receber o email (confirma o Resend).
- [ ] `/robots.txt` e `/sitemap.xml` respondem.
- [ ] Aceitar cookies → o Analytics regista a visita (se configurado).
- [ ] Abrir o site no telemóvel — menu, catálogo e botões utilizáveis.

---

## Problemas comuns

**O push não mostra alterações no site.**
O deploy demora **5 a 9 minutos**. Espera antes de assumir que falhou. Confirma o
estado em Cloudflare → Workers → `chikane-garage1` → **Deployments**.

**O site abre mas está sem viaturas / dá erro de dados.**
Faltam as variáveis de *build* (`NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — passo 6.2. Têm de estar presentes **no momento
da construção**, não basta adicioná-las depois.

**O `/admin` recusa o acesso, ou dá erro 401.**
A conta não tem `role = 'admin'`. Corre o `UPDATE` do passo 1.6.

**O upload de fotografias falha.**
- Em produção: confirma que o bucket do R2 se chama `vehicle-images`, que o
  `R2_PUBLIC_URL` do `wrangler.toml` corresponde ao teu bucket e que o *binding*
  `VEHICLE_IMAGES` continua declarado nesse ficheiro.
- Em local: confirma as credenciais do R2 no `.env.local`
  (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`).
- O `R2_PUBLIC_URL` é **obrigatório** — sem ele o upload é recusado de propósito.

**A newsletter diz que enviou, mas não chega nada.**
Falta o `RESEND_API_KEY` no Worker (passo 6.3). Sem ele o envio é saltado em
silêncio.

**Não chega o email de confirmação de conta.**
- Confirma o SMTP do Resend na Supabase
  ([`supabase/email-templates/LEIAME.md`](../supabase/email-templates/LEIAME.md)).
- A porta SMTP tem de ser **587**. Uma porta errada faz o registo pendurar e
  devolver erro 504.

**Erro "policy already exists" ao correr SQL.**
Estás a correr um ficheiro antigo (as migrations `002`–`020` já não existem).
Corre apenas o `supabase/setup.sql` — ele apaga e recria cada política, por isso
não dá este erro.

**O `npm run lint` dá milhares de erros.**
É esperado depois de um build: a pasta `.open-next/` (gerada) não está excluída.
Isto não afeta o site. Para verificares só o que mexeste:
`npx eslint <caminho>`.

---

Voltar ao [README](../README.md) · Ver [variáveis de ambiente](VARIAVEIS_AMBIENTE.md) ·
Ver [guia de layouts](GUIA_LAYOUTS.md) · Ver [regras para IA](REGRAS_PARA_IA.md)

*Última atualização: 2026-10-14.*
