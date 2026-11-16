# Chikane Garage

Site de venda de viaturas de performance importadas (BMW), com backoffice para o
proprietário gerir viaturas, pedidos e conteúdo.

- **Em produção:** <https://chikanegarage.blog>
- **Tecnologia:** Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript
- **Base de dados e contas:** Supabase
- **Alojamento:** Cloudflare Workers (via OpenNext) + Cloudflare R2 (fotografias)
- **Emails:** Resend

---

## Começar por aqui

Se recebeste este pacote e o objetivo é **pôr o site no ar**, lê por esta ordem:

| # | Documento | Para que serve |
|---|---|---|
| 1 | [`docs/COLOCAR_NO_AR.md`](docs/COLOCAR_NO_AR.md) | **Guia principal.** Todos os passos, do zero até ao site online, por ordem. |
| 2 | [`docs/VARIAVEIS_AMBIENTE.md`](docs/VARIAVEIS_AMBIENTE.md) | Todas as variáveis/chaves: para que servem, onde se obtêm e onde têm de ficar. |
| 3 | [`docs/GUIA_LAYOUTS.md`](docs/GUIA_LAYOUTS.md) | Onde está cada ecrã e onde se mexe (só) no layout. |
| 4 | [`docs/REGRAS_PARA_IA.md`](docs/REGRAS_PARA_IA.md) | **Regras obrigatórias** para qualquer IA/programador que mexa no código. |
| 5 | [`docs/RELATORIO_QA.md`](docs/RELATORIO_QA.md) | Revisão funcional, riscos e checklist de testes. |
| 6 | [`docs/PERSONALIZACAO.md`](docs/PERSONALIZACAO.md) | Onde personalizar o site e como acrescentar coisas. |

> ⚠️ **Regra nº 1 deste projeto:** é proibido alterar a lógica da aplicação.
> Só se mexem em **layouts, estilo e textos visuais**. A lógica só se altera se o
> dono do projeto o pedir explicitamente. Detalhes em
> [`docs/REGRAS_PARA_IA.md`](docs/REGRAS_PARA_IA.md).

---

## O que já está feito

- Home com hero, catálogo em destaque (spotlight), garagem, processo e newsletter.
- Usados com filtros (`/usados`) e ficha própria de cada viatura (`/usados/[slug]`).
- Novos por encomenda (`/novos`) com ficha própria em `/novo/carro/[slug]` e
  configurador de extras em `/comprar/[slug]`.
- Campanhas (`/campanhas`) com página própria e carrossel de fotografias.
- Contas: registo, login, confirmação por email, recuperação de password, perfil
  com avatar e favoritos.
- Pedidos: informações, reservas e marcação de test-drive (com calendário).
- Backoffice (`/admin`): viaturas (fotos em R2), extras, campanhas, pedidos,
  propostas, contas, utilizadores e conteúdo do site — com três cargos
  (`admin`, `editor`, `sales`); o cargo `admin` só se atribui na base de dados.
- SEO: `robots.txt`, `sitemap.xml`, imagens de partilha.
- Segurança: RLS no Supabase, `/admin` protegido, cabeçalhos de segurança.

## O que ainda falta (opcional / pós-lançamento)

- Analytics do Google (GA4) e Search Console — passos no
  [`docs/COLOCAR_NO_AR.md`](docs/COLOCAR_NO_AR.md) (Fase 7).
- Textos legais definitivos (`/termos-e-condicoes`, `/politica-de-privacidade`).
- Dados de contacto reais do negócio (telefone, email, morada) — editáveis no
  backoffice em **Definições**.

---

## Comandos do dia-a-dia

```bash
npm install          # instalar dependências (primeira vez)
npm run dev          # servidor de desenvolvimento → http://localhost:3000
npm run build        # verificar que o projeto compila
npx tsc --noEmit     # verificar tipos
npm run lint         # análise de estilo (ver nota abaixo)
```

**Publicar (produção):** basta fazer `git push` para o ramo `main` — o Cloudflare
reconstrói e publica o site automaticamente. Demora entre **5 e 9 minutos**; não
concluir que falhou antes disso.

> **Nota sobre o `npm run lint`:** o projeto tem alguns erros de lint
> pré-existentes (nas regras de react-hooks) e a pasta `.open-next/` (resultado de
> builds) não está excluída, o que faz o lint completo falhar com milhares de
> avisos de ficheiros gerados. Isto é esperado. Para verificar só o que mexeste,
> usa: `npx eslint <caminho-do-ficheiro>`.

---

## Estrutura (resumo)

```
app/            Páginas e rotas (App Router)
  admin/        Backoffice (protegido)
  usados/       Listagem e ficha das viaturas usadas
  novos/        Listagem das viaturas novas
  novo/carro/   Ficha própria das viaturas novas
  comprar/      Configurador de extras e pedido de proposta
  campanhas/    Listagem e página de campanha
  catalogo/     Redirects dos links antigos para /usados
  api/          Rotas de servidor (newsletter, decisões de admin)
  actions/      Server Actions (upload, autenticação)
components/
  layout/       Cabeçalho e rodapé
  ui/           Componentes visuais (cartões, galerias, botões)
lib/            Lógica e clientes (Supabase, R2, regras de visibilidade)
supabase/       SQL: setup.sql (ficheiro único com todo o schema, RLS e funções)
                e seed.sql (dados de exemplo, opcional)
docs/           Guias deste pacote
proxy.ts        Redirecionamento HTTPS + sessão + proteção do /admin
wrangler.toml   Configuração do Worker Cloudflare
```

Detalhe de cada ficheiro e do que se pode/não pode alterar:
[`docs/GUIA_LAYOUTS.md`](docs/GUIA_LAYOUTS.md).

---

## Notas sobre os ficheiros antigos deste pacote

Estes ficheiros existem, mas **já não são a fonte de verdade** (foram substituídos
pelos guias em `docs/`). Estão mantidos apenas como histórico:

- `DOCUMENTO_PROJETO.txt` — descreve o projeto por fases; tem partes
  desatualizadas (ex.: fala de uma loja que já não existe, e do deploy via
  Cloudflare Pages, quando hoje é um Worker).
- `DEPLOY_GUIDE.html` — guia de deploy antigo (fala de Cloudflare Pages).
- `BOOTSTRAP.txt` — checklist de setup local antigo (fala de `middleware.ts`,
  `pnpm` e `/hooks`, que já não existem).

As notas pessoais do dono e os ficheiros de trabalho pontuais **não fazem parte
deste pacote**: a entrega leva apenas o código do site e a documentação dos
guias.

Última atualização: **2026-11-16**.
