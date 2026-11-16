# Regras para IA / programadores

> **Este ficheiro é a regra mais importante do projeto. Lê-o todo antes de
> alterar uma única linha de código.**

---

## 🛑 Regra nº 1 — É PROIBIDO alterar a lógica

**Só se alteram layouts.** Podes mexer em aparência, estrutura visual e textos.
**Não podes mexer na lógica da aplicação** — nem "para melhorar", nem "para
corrigir", nem "porque estava errado", nem "porque é mais eficiente".

A lógica **só** se altera quando **o dono do projeto o pedir explicitamente**
(por exemplo: "corrige este bug", "adiciona esta funcionalidade"). Na dúvida:
**não mexas — pergunta primeiro.**

### O que conta como "lógica" (PROIBIDO mexer)

- Consultas à base de dados: `supabase.from(...)`, `.select(...)`, `.insert(...)`,
  `.update(...)`, `.delete(...)`, chamadas `.rpc(...)`.
- Autenticação e sessões: `supabase.auth.*`, verificação de `user`, `profile`,
  `role`.
- Controlo de acesso: qualquer `redirect(...)`, `if (!user)`, verificação de
  `admin`.
- Server Actions (`app/actions/`) e rotas de API (`app/api/`).
- Regras de negócio em `lib/` (preços, visibilidade de viaturas, datas de venda,
  limites anti-spam, validações).
- SQL: `supabase/setup.sql` (schema base — tabelas, políticas RLS, funções,
  triggers e permissões) e as migrações numeradas `supabase/021_…` a
  `supabase/039_…` (tudo o que foi acrescentado depois). **Nunca** alterar nem
  correr SQL sem indicação.
- `proxy.ts`, `next.config.ts`, `wrangler.toml`, `package.json` (configuração e
  segurança).
- `revalidatePath(...)`, caches, redirecionamentos, emails, `fetch(...)`.
- Variáveis de ambiente e chaves.

### O que **é permitido** (layout)

- Classes Tailwind (`className`), cores do tema, espaçamentos, tamanhos, sombras.
- Estrutura visual: `div`, `span`, `section`, ordem dos elementos.
- Textos visíveis, etiquetas, títulos, mensagens de estado, placeholders.
- Ícones, imagens decorativas, animações de apresentação.
- Adaptação a ecrãs (mobile/PC) — ver [`GUIA_LAYOUTS.md`](GUIA_LAYOUTS.md).

> Nas páginas, o visual e a lógica partilham o mesmo ficheiro. **Mexe apenas no
> `return (...)`** — ou seja, na parte que desenha a página. Não toques no que
> vem antes (consultas, verificações, cálculos).

---

## 🚫 Regra nº 2 — Não introduzir dependências nem serviços novos

Não instales pacotes, não acrescentes *bibliotecas*, não ligues serviços de
terceiros (rastreadores, fontes externas, *analytics* novos), não cries scripts
de build, nem alteres o deploy — sem autorização explícita.

Qualquer rastreador novo tem de passar pelo aviso de cookies
(`components/cookie-consent.tsx`), como o Google Analytics.

---

## ✅ Regra nº 3 — Respeitar as convenções do projeto

- **Idioma:** todo o texto do site, comentários de código e mensagens de
  *commit* são em **português de Portugal (pt-PT)**. Mantém assim.
- **Nada de notas pessoais no repositório:** não cries (nem commites) ficheiros de
  apontamentos na raiz — listas de tarefas, resumos de deploy, ideias soltas. Na
  raiz devem existir apenas os ficheiros do site, a documentação de `docs/` e os
  documentos históricos (`DOCUMENTO_PROJETO.txt`, `DEPLOY_GUIDE.html`,
  `BOOTSTRAP.txt`) que já lá estão marcados como desatualizados.
- **Nunca commitar segredos:** o `.env.local` está protegido pelo `.gitignore`.
  Não o alteres nem o removas dessa proteção.
- **Testes:** o projeto usa **Vitest** (unitários) e **Playwright** (percursos
  públicos). Não acrescentes outro framework nem scripts paralelos. Para validar
  uma alteração, corre os comandos da regra nº 4.

---

## 🔍 Regra nº 4 — Verificar antes de dar por concluído

Depois de qualquer alteração:

```bash
npm run typecheck             # tipos (tem de estar limpo)
npm test                      # testes unitários (Vitest)
npx eslint <ficheiros que mexeste>   # só o que mexeste
npx next build --webpack      # build (antes de publicar)
```

Notas sobre o lint:

- O projeto **já tem** erros de lint de origem (regras de *react-hooks* em
  `app/admin/pedidos`, `components/ui/favorites-list`,
  `components/cookie-consent`, `components/ui/vehicle-photo-picker`). Não é
  preciso corrigi-los — **só não acrescentes novos**.
- A pasta `.open-next/` (resultado de builds) não está excluída do lint, por isso
  um `npm run lint` completo falha com milhares de avisos de ficheiros gerados.
  Isso é normal e **não** é um erro teu.

---

## 📢 Regra nº 5 — Publicar é só isto

```bash
git add .
git commit -m "Ajuste de layout: <descricao em pt-PT>"
git push
```

O Cloudflare publica automaticamente a partir do ramo `main`, em **5 a 9
minutos**. Não é preciso mais nada — e não se faz deploy à mão sem autorização.

---

## 🤝 Regra nº 6 — Quando o pedido exige lógica: PARAR e perguntar

Se o pedido do dono só se consegue cumprir mexendo na lógica (base de dados,
autenticação, pagamentos, emails, permissões), **não improvises**:

1. Explica claramente **porque** é que é preciso mexer na lógica.
2. Diz **que ficheiros** teriam de mudar e **que risco** isso tem.
3. Espera pela autorização antes de tocar em nada.

---

## Mensagem curta (para colar a uma IA)

> Estás no projeto **Chikane Garage**. Regra absoluta: **é proibido alterar a
> lógica da aplicação**. Só podes mexer em layouts (aparência, estrutura visual e
> textos). Não toques em consultas à base de dados, autenticação, permissões,
> `app/actions/`, `app/api/`, `lib/`, `supabase/*.sql`, `proxy.ts`,
> `next.config.ts`, `wrangler.toml` nem `package.json`. A lógica só se altera com
> indicação explícita do dono. Escreve tudo em pt-PT. Verifica com
> `npx tsc --noEmit` e `npx eslint <ficheiro>`. Na dúvida, pergunta antes de
> mexer.

---

Voltar ao [README](../README.md) · Ver [guia de layouts](GUIA_LAYOUTS.md) ·
Ver [pôr o site no ar](COLOCAR_NO_AR.md) ·
Ver [variáveis de ambiente](VARIAVEIS_AMBIENTE.md)

*Última atualização: 2026-10-14.*
