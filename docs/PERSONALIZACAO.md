# Personalização e extensibilidade

Avaliação de **2026-11-16** sobre o ramo `vaga/vendedor-proposta-qa`. Responde ao
pedido «verifica se o projeto está feito de modo que seja fácil de modificar
algo ou personalizar o site».

> A regra do projeto continua a ser a mesma: **não se altera lógica** sem pedido
> explícito do dono. Este documento mostra **onde** se personaliza cada coisa e
> o que é seguro mexer (layout, textos, conteúdo) sem tocar em consultas, RLS,
> `proxy.ts` ou `next.config.ts`. Ver [`REGRAS_PARA_IA.md`](REGRAS_PARA_IA.md).

---

## 1. Mapa rápido

| Quero mudar… | Onde | Precisa de código? |
|---|---|---|
| Cores, tipografia, espaçamentos base | `app/globals.css` | Sim (só CSS) |
| Textos da home e da garagem | Backoffice → **Definições** (`site_content`) | Não |
| Telefone, email, morada, redes sociais | Backoffice → **Definições** (`site_settings`) | Não |
| Textos legais | `app/termos-e-condicoes/page.tsx`, `app/politica-de-privacidade/page.tsx` | Sim (só texto) |
| Modelos e specs base das viaturas | `lib/vehicle-catalog.json` | Sim (JSON) |
| Cores/equipamento sugeridos no formulário | `lib/vehicle-options.ts` | Sim |
| Campos das fichas (novos/usados) | `lib/vehicle-specs.ts` | Sim |
| Endereço das fichas (novo/usado) | `lib/vehicle-links.ts` | Sim |
| Filtros do catálogo | `components/ui/catalog-browser.tsx` | Sim |
| Campanhas e fotos | Backoffice → **Campanhas** | Não |
| Emails transacionais | `app/api/**`, `lib/email-vehicle-block.ts` | Sim |
| Permissões de cada cargo | `lib/roles.ts` + RLS em `supabase/` | Sim + SQL |
| Menu e rodapé | `components/layout/header.tsx`, `footer.tsx` | Sim (só links) |
| SEO (títulos, sitemap) | `metadata` de cada página, `app/sitemap.ts` | Sim |

---

## 2. Tema visual

Tudo o que é cor, tipografia e efeito global está em **`app/globals.css`**:

- variáveis em `:root` (`--background`, `--surface`, `--foreground`, `--muted`,
  `--copper`, `--copper-light`, `--copper-deep`, `--success`, `--warning`…);
- ponte para o Tailwind v4 em `@theme` (`--color-copper`, etc.);
- utilitários próprios (`.kicker`, `.nav-link`, `.card-lift`, `grid-lines`,
  `shimmer`, `kenburns`).

As fontes são carregadas em **`app/layout.tsx`** (`Oswald` para títulos,
`Inter` para texto) e expostas como `--font-display` / `--font-sans`.

**Regra prática:** usa sempre o token (`bg-copper`, `text-muted`,
`border-border`) em vez do valor (`#f47724`, `#99938d`). Mudar a paleta inteira
passa a ser uma alteração de poucas linhas.

> Exceção conhecida: alguns sítios usam `text-white`/`bg-black/70` para
> contrastes pontuais sobre fotografias. Não são tema; são decisões locais de
> legibilidade.

---

## 3. Conteúdo sem tocar em código

### Home e «A Garagem»

A home lê `site_content` e tem um `FALLBACK` no próprio ficheiro
(`app/page.tsx`). O backoffice (**Definições**) é o caminho normal para mudar
textos. O fallback só aparece quando a base de dados não tem o valor.

### Contactos, redes e fotografias

`site_settings` (tipo em `lib/site-settings.ts`) alimenta o rodapé, a página de
contacto, a página Sobre e a home:

- contactos: `phone`, `email`, `address`, `location`, `location_url`;
- redes: `social_instagram`, `social_facebook`, `social_whatsapp`,
  `social_youtube`, `social_tiktok` — normalizadas em `lib/social-links.ts`;
- fotografias: `photo_home_hero`, `photo_home_history`, `photo_about_hero`,
  `photo_about_garage`;
- test drives: `td_duration_minutes`, `td_slots`, `td_days`;
- propostas: `proposal_notify_emails`;
- números da página Sobre: `about_inspection_points`, `about_vehicles_sold`,
  `about_years_experience`, `about_clients`.

### Textos legais

São páginas estáticas. Mudar o texto não obriga a mexer em lógica, mas o texto
tem de ser revisto juridicamente pelo dono.

### Campanhas

Criadas no backoffice (`campaigns` + `campaign_images`). A página pública é
genérica; não há texto de campanha no código.

---

## 4. Viaturas

### 4.1. Catálogo de modelos

`lib/vehicle-catalog.json` é uma lista mantida à mão com marca, modelo, motor,
potência, binário, caixa e tração. Os formulários do backoffice usam-na para
pré-preencher especificações. **Adicionar um modelo novo = acrescentar uma
entrada neste JSON** (e, se necessário, atualizar `lib/vehicle-options.ts`).

### 4.2. Opções dos formulários

`lib/vehicle-options.ts` concentra:

- cores exteriores e interiores sugeridas;
- equipamento de série sugerido (`DEFAULT_FEATURES`);
- países de origem;
- máscara e validação da cilindrada (`maskEngineValue`, `isEngineValid`).

### 4.3. Fichas públicas

`lib/vehicle-specs.ts` é a **única** fonte das linhas de especificações:

- `usedVehicleSpecs()` → `Ano | Km`, `Combustível | Caixa`, `Potência | Binário`,
  `Motor | Consumo`, `Cor Ext. | Cor Int.`, `Tração | Estilo`, `Origem | Donos`;
- `newVehicleSpecs()` → exatamente `Ano | Combustível`, `Motor | Consumo`,
  `CV | NM`, `Cor Int. | Cor Ext.`, `Tração | Estilo`.

O que não cabe nos pares vai para «Mostrar mais informação». O componente que
desenha isto é `components/ui/vehicle-specifications.tsx`.

**Onde está cada ficha:**

| Tipo | Página |
|---|---|
| Usado | `app/usados/[slug]/page.tsx` |
| Novo | `app/novo/carro/[slug]/page.tsx` |

As duas fichas são deliberadamente diferentes. Ao acrescentar um campo novo,
alterar **as duas** páginas (tipo e consulta) e **as duas** funções de specs.

### 4.4. Endereços das fichas

`lib/vehicle-links.ts` → `vehicleHref({ slug, sale_type })`:

- `sale_type === "new"` → `/novo/carro/<slug>`;
- restantes → `/usados/<slug>`.

Qualquer cartão, email ou link interno deve usar esta função para não apontar
para a ficha errada. Os redirects antigos estão em `app/catalogo/`.

### 4.5. Validação dos formulários

`lib/vehicle-form-validation.ts` define os campos obrigatórios (todos, exceto
`description` e `co2_emissions`). Os campos de usado só são exigidos quando
`sale_type === "used"`. Se o formulário ganhar um campo, acrescentar aqui a
regra e a mensagem — os dois ecrãs do backoffice passam a validar igual.

### 4.6. Base de dados

Cada campo novo exige:

1. coluna nova em `supabase/` (migração numerada, idempotente);
2. atualização do `select`/`insert`/`update` no backoffice;
3. atualização do tipo `Vehicle` nas duas fichas e em `lib/vehicle-specs.ts`;
4. atualização do formulário e da validação.

**Nunca** alterar `supabase/setup.sql` diretamente: o padrão é um ficheiro novo
(`040_…`, `041_…`).

---

## 5. Catálogo e filtros

`components/ui/catalog-browser.tsx` é o mesmo componente em `/usados` e
`/novos`. Os filtros são fixos e aplicados no browser com `useMemo`:

- pesquisa livre (marca/modelo/versão);
- marca, combustível, caixa, carroçaria, ano, preço e ordenação;
- etiquetas de estado (disponível, reservada, vendida).

Para acrescentar um filtro:

1. acrescentar o campo ao tipo `Vehicle` do browser;
2. acrescentar o estado e o controlo no painel;
3. acrescentar a condição no filtro (`useMemo`);
4. garantir que a página que carrega as viaturas faz `select` desse campo.

A barra lateral é fixa em desktop (`lg:sticky`) e painel deslizante em mobile.
O offset do topo acompanha a altura do header (`4.75rem`). Se a altura do header
mudar em `header.tsx`, atualizar também este offset.

---

## 6. Campanhas

- Tabelas: `campaigns` e `campaign_images` (migrações `027` e `029`).
- Backoffice: `app/admin/campanhas/page.tsx`.
- Página pública: `app/campanhas/[slug]/page.tsx`.
- A viatura associada vem por `vehicles(...)`; o CTA usa `cta_url` ou, na falta
  dele, a ficha da viatura.
- As 3 sugestões dão prioridade à mesma marca e depois às mais recentes.

Para mudar a regra das sugestões, é lógica: pedir ao dono. Para mudar o
desenho, é só o `return` da página.

---

## 7. Emails

| Email | Onde |
|---|---|
| Confirmação de conta | `supabase/email-templates/confirm-signup.html` (template do Supabase) |
| Proposta — comprovativo ao cliente | `app/api/admin/proposal-final/route.ts` |
| Proposta — aviso ao gestor | `app/api/proposals/notify/route.ts` |
| Contacto | `app/api/admin/reply/route.ts` |
| Test drive — confirmação/reagendamento | `app/api/admin/test-drive/confirm/route.ts`, `update/route.ts` |
| Test drive — resposta do cliente | `app/api/test-drive/respond/route.ts` |
| Reserva | `app/api/admin/reservation/decision/route.ts` |
| Newsletter | `app/api/newsletter/subscribe/route.ts` |
| Bloco com foto da viatura (partilhado) | `lib/email-vehicle-block.ts` |

O HTML está **inline** em cada rota (necessário para clientes de email). Para
mudar um bloco comum, começar por `lib/email-vehicle-block.ts`. As cores são
hexadecimais fixos (`#f47724`, `#090909`) porque o email não lê o tema do site —
é esperado.

`RESEND_API_KEY` é um segredo do Worker, não do repositório. Sem ele, os emails
são ignorados sem bloquear o pedido.

---

## 8. Permissões e cargos

`lib/roles.ts` é a fonte única do lado da aplicação:

- `AREA_ROLES` diz que cargos abrem cada área do backoffice;
- `canManageVehicles`, `canManageExtras`, `canManageContent`,
  `canManageSales` dizem o que cada um pode fazer.

As mesmas regras estão em SQL (`035`, `038`, `039`). **Alterar uma permissão
exige alterar os dois lados** — caso contrário o menu mostra uma coisa e a base
de dados recusa (ou pior, permite) outra.

Para acrescentar uma área ao backoffice:

1. criar a página em `app/admin/<area>/page.tsx`;
2. acrescentar a entrada no menu (`app/admin/layout.tsx`);
3. acrescentar a área a `AdminArea` e `AREA_ROLES` em `lib/roles.ts`;
4. garantir que o `proxy.ts` e as RLS continuam a bloquear quem não deve.

O cargo `admin` só se atribui no SQL Editor (migração `039`).

---

## 9. Rotas e navegação

- Rotas = pastas em `app/`. Um `page.tsx` por ecrã; um `route.ts` por endpoint.
- O menu superior está em `components/layout/header.tsx` (desktop e mobile).
- O menu do rodapé está em `NAV_LINKS`, em `components/layout/footer.tsx`.
- O menu do backoffice está em `app/admin/layout.tsx`.
- Os links entre páginas usam `next/link`; para viaturas, usar `vehicleHref`.

Ao renomear uma rota, criar sempre um redirect na antiga (como foi feito em
`app/catalogo/`). Ao acrescentar uma rota pública, acrescentar também ao
`sitemap.ts` e ao menu, se fizer sentido.

---

## 10. Fotografias e R2

- Upload do backoffice → Server Action `app/actions/upload.ts`.
- Recorte e compressão no browser → `lib/crop-vehicle-image.ts`,
  `components/ui/vehicle-photo-picker.tsx`.
- Escrita no R2 → `lib/r2.ts` (`uploadToR2`, `deleteFromR2`).
- Em produção usa o binding `VEHICLE_IMAGES`; em local, as chaves S3
  (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
- `R2_PUBLIC_URL` é obrigatório para o site conseguir mostrar as imagens.

Domínios de imagens externas estão em `next.config.ts` (`images.remotePatterns`).
Acrescentar um domínio novo é configuração — pedir ao dono.

---

## 11. SEO

- `metadata` / `generateMetadata` em cada página.
- `app/sitemap.ts` — lista as rotas públicas e as fichas de viaturas.
- `app/robots.ts` — regras de indexação.
- JSON-LD na home (`app/page.tsx`) para dados estruturados.
- `metadataBase` em `app/layout.tsx` usa `NEXT_PUBLIC_SITE_URL`.

Ao acrescentar páginas públicas relevantes, acrescentar ao sitemap. `/admin` e
`/conta` não devem ser indexados.

---

## 12. Verificações depois de personalizar

```powershell
npm run typecheck
npm test
npx eslint <ficheiros-alterados>
npx next build --webpack
```

O lint global tem erros pré-existentes (ver
[`RELATORIO_QA.md`](RELATORIO_QA.md) §3). Validar só os ficheiros tocados.

Checklist visual em
[`RELATORIO_QA.md`](RELATORIO_QA.md) §5 (regressão de 15 minutos).

---

## 13. Avaliação de extensibilidade

### O que está bem

| Área | Porquê |
|---|---|
| Tema | Tokens CSS centralizados; Tailwind v4 ligado às variáveis |
| Conteúdo | Home, contactos, redes e fotos editáveis no backoffice |
| Specs | `lib/vehicle-specs.ts` evita divergência entre fichas |
| Links de viaturas | `lib/vehicle-links.ts` centraliza a regra novo/usado |
| Modelos | `lib/vehicle-catalog.json` é fácil de acrescentar |
| Permissões | Uma função por capacidade + RLS espelhada |
| Rotas | App Router simples, sem monorepo, com redirects nos links antigos |
| Tipos | TypeScript `strict`; `npm run typecheck` apanha regressões |

### O que dificulta a personalização

| Área | Problema | Impacto |
|---|---|---|
| Fichas de viatura | Duas páginas grandes e separadas (`usados` e `novo/carro`) | Um campo novo mexe em 2 ficheiros + tipos + spec + formulário |
| Textos | Muita copy está escrita diretamente nas páginas | Mudar um título obriga a código |
| Emails | HTML inline repetido em 7 rotas | Um ajuste visual pode ter de ser replicado |
| Filtros | Listas e condições escritas no componente | Novo filtro = código no browser |
| Cores pontuais | Alguns `text-white`/`bg-black` locais | Pequenas inconsistências ao trocar de tema |
| Dados | Consultas espalhadas pelas páginas | Sem camada única de acesso a dados |

### Recomendações (sem alterar lógica)

1. **Camada de conteúdo**: passar mais textos para `site_content` (página
   Usados, Novos, Campanhas e mensagens de estado).
2. **Componente único de ficha**: extrair o esqueleto comum e deixar apenas a
   lista de specs diferente — reduz o custo de um campo novo.
3. **Bloco de email partilhado**: usar `lib/email-vehicle-block.ts` em todas as
   rotas que hoje repetem HTML.
4. **Catálogo de filtros**: guardar opções de filtro numa constante tipada
   (`lib/vehicle-filters.ts`) para o componente ficar só com a apresentação.
5. **Consultas**: criar funções de leitura reutilizáveis (ex.:
   `getPublicVehicles()`) para `/usados` e `/novos` não repetirem `select`.
6. **Testes**: cobrir as regras puras (`vehicle-specs`, `vehicle-links`,
   `vehicle-form-validation`) para personalizações futuras não partirem nada.

Nenhuma destas recomendações é obrigatória para o lançamento; são o caminho para
o site ficar mais fácil de personalizar a cada pedido.

---

## 14. Receitas rápidas

### Mudar a cor principal

1. `app/globals.css`: `--copper`, `--copper-light`, `--copper-deep` e os
   `--color-*` correspondentes.
2. Confirmar contraste em botões, etiquetas e links.
3. Verificar emails? Não — os emails usam hexadecimais próprios.

### Acrescentar um modelo ao formulário

1. Acrescentar a entrada em `lib/vehicle-catalog.json`.
2. Se tiver cores ou equipamento específicos, acrescentar em
   `lib/vehicle-options.ts`.
3. Criar a viatura no backoffice e confirmar o pré-preenchimento.

### Acrescentar uma linha às specs de usado

1. Acrescentar o campo ao tipo `SpecVehicle` e a `usedVehicleSpecs()` em
   `lib/vehicle-specs.ts`.
2. Garantir que `app/usados/[slug]/page.tsx` faz `select` do campo (usa `*`).
3. Confirmar que o formulário do backoffice permite preenchê-lo.
4. Se for obrigatório, acrescentar a regra em `lib/vehicle-form-validation.ts`.

### Acrescentar uma campanha

1. Backoffice → **Campanhas** → criar.
2. Carregar fotografia de capa e fotos adicionais.
3. Associar a viatura, se houver.
4. Confirmar `/campanhas` e a página da campanha.

### Acrescentar um item ao menu

1. `components/layout/header.tsx` (desktop e mobile).
2. `components/layout/footer.tsx` (`NAV_LINKS`).
3. `app/sitemap.ts`, se for público e relevante.

---

*Última atualização: 2026-11-16.*
