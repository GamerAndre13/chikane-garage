# Chikane Garage

Stand de viaturas importadas com catálogo online, backoffice para gestão de viaturas, contactos, reservas, test-drive e conteúdo.

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
| 0 | [`docs/INSTRUCOES_PARA_IA.md`](docs/INSTRUCOES_PARA_IA.md) | **Ponto de entrada** (dono e IA): visão, estado da obra, como trabalhar e onde está cada documento. |
| 1 | [`docs/COLOCAR_NO_AR.md`](docs/COLOCAR_NO_AR.md) | **Guia principal.** Todos os passos, do zero até ao site online, por ordem. |
| 2 | [`docs/VARIAVEIS_AMBIENTE.md`](docs/VARIAVEIS_AMBIENTE.md) | Todas as variáveis/chaves: para que servem, onde se obtêm e onde têm de ficar. |
| 3 | [`docs/GUIA_LAYOUTS.md`](docs/GUIA_LAYOUTS.md) | Onde está cada ecrã e onde se mexe (só) no layout. |
| 4 | [`docs/REGRAS_PARA_IA.md`](docs/REGRAS_PARA_IA.md) | **Regras obrigatórias** para qualquer IA/programador que mexa no código. |

> ⚠️ **Regra nº 1 deste projeto:** é proibido alterar a lógica da aplicação.
> Só se mexem em **layouts, estilo e textos visuais**. A lógica só se altera se o
> dono do projeto o pedir explicitamente. Detalhes em
> [`docs/REGRAS_PARA_IA.md`](docs/REGRAS_PARA_IA.md).

---

## O que já está feito

- Home com hero, catálogo em destaque (spotlight), secção de campanhas, garagem, processo e newsletter.
- Catálogo com filtros e ficha de viatura por URL amigável (`/catalogo/[slug]`).
- Contas: registo, login, confirmação por email, recuperação de password, perfil
  com avatar e favoritos.
- Contactos: pedido de informação, reservas e marcação de test-drive (com calendário).
- Campanhas promocionais editáveis no backoffice.
- Backoffice (`/admin`): viaturas (fotos em R2), contactos, reservas, test-drives, utilizadores, conteúdo do site, campanhas e definições.
- SEO: `robots.txt`, `sitemap.xml`, imagens de partilha.
- Segurança: RLS no Supabase, `/admin` protegido, cabeçalhos de segurança.

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
  catalogo/     Catálogo e ficha de viatura
  campanhas/    Campanhas promocionais
  api/          Rotas de servidor (newsletter)
  actions/      Server Actions (upload, autenticação, viaturas)
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

- `DOCUMENTO_PROJETO.txt` — histórico do projeto
- `DEPLOY_GUIDE.html` — guia de deploy antigo
- `BOOTSTRAP.txt` — checklist de setup local antigo

Foco atual: **apenas catálogo de viaturas**.

Última atualização: **2026-10-14**.
