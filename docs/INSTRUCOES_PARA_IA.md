# Instruções para IA — Chikane Garage

> **Começa por aqui.** Este ficheiro diz o que o dono tem em mente, o que já está
> definido, o que se pode e não se pode fazer, e onde está cada coisa.
> Só depois de o ler é que se abre código.
>
> **Estado:** em vigor · **Última atualização:** 27/10/2026

---

## 1. Ordem de leitura (obrigatória)

| # | Documento | Para que serve |
|---|---|---|
| 1 | `docs/INSTRUCOES_PARA_IA.md` (este) | visão do dono, estado da obra, como trabalhar |
| 2 | `docs/REGRAS_PARA_IA.md` | **a regra mais importante**: não alterar lógica |
| 3 | `docs/FASES.md` | as fases (0 a 5): o que se faz e como |
| 4 | `docs/PLANO_LOJA.md` | as decisões fechadas (o que o dono quer) |

Depois, conforme a tarefa:

| Tarefa | Documentos |
|---|---|
| Mexer no aspeto de um ecrã | `docs/GUIA_LAYOUTS.md` + `docs/REGRAS_PARA_IA.md` |
| Base de dados / loja | `docs/MODELO_DADOS_LOJA.md` + `docs/rascunho/*.sql` |
| Detalhe da Fase 1 | `docs/PLANO_ETAPA_1.md` |
| Carros vs motos (outro cliente) | `docs/COMPATIBILIDADE_STANDS.md` |
| Comercializar / marca | `docs/PRODUTO_E_MARCA.md` |
| Emails e textos legais | `docs/TEXTOS_LOJA.md` |
| Pôr o site no ar | `docs/COLOCAR_NO_AR.md` + `docs/VARIAVEIS_AMBIENTE.md` |

---

## 2. O que o dono tem em mente

O **Chikane Garage** é um stand de **carros** (usados e novos). Neste momento o
foco é **apenas o catálogo de viaturas**, com backoffice para gestão.

O que o dono quer, por palavras dele:

1. **Tudo completo e profissional** — acabado a sério, não uma maqueta.
2. **Sem abdicar da performance** — o site não pode ficar mais lento.
3. **Sem complicação** — simples de explicar, simples de manter.
4. **Foco no catálogo** — gestão de viaturas, imagens, contactos, reservas,
   marcação de test-drive, favoritos e newsletter.
5. **A Chikane continua a ser o principal.** Nada pode partir o que já está em
   produção.

---

## 3. Regras que não se discutem

Detalhe completo em `docs/REGRAS_PARA_IA.md`. Em resumo:

1. **É proibido alterar a lógica sem autorização explícita do dono.** Só se mexe
   em layouts (aparência, estrutura visual, textos visíveis). Nas páginas, só o
   `return (...)`.
2. **Nada de dependências nem serviços novos** (pacotes, rastreadores, fontes).
3. **pt-PT** em textos, comentários e mensagens de commit.
4. **Nunca commitar segredos** nem mexer no `.env.local`.
5. **Não existe framework de testes** — não criar.
6. **Aditivo**: cada alteração acrescenta; não quebra o que está em produção.
7. Se o pedido só se resolve mexendo na lógica: **parar, explicar (o quê,
   ficheiros, risco) e esperar autorização.**
8. Não se faz deploy à mão; publicar é `git push` para `main` (Cloudflare, 5–9 min).

---

## 4. O que determinada tarefa é (antes de mexer)

| Tipo de pedido | O que fazer |
|---|---|
| **Layout** (aspeto, texto visível, ordem, mobile) | Mexer só no `return (...)`; seguir `docs/GUIA_LAYOUTS.md` |
| **Decisão nova** (produto, regra, preço, fluxo) | **Escrever primeiro a decisão em `docs/`** (pt-PT, com data e estado) e só depois implementar |
| **Lógica** (base de dados, pagamentos, auth, emails, `lib/`) | **Parar e pedir autorização**; nunca "melhorar" por iniciativa própria |
| **Base de dados** | Só depois de autorizado; `supabase/setup.sql` é o ficheiro único e idempotente; SQL corre-se à mão no painel do Supabase |
| **Dúvida** | Perguntar. Nunca decidir em silêncio |

> **Regra de ouro**: se não está escrito nos documentos, não é uma decisão — é
> uma pergunta ou uma proposta (marcada como 🟡).

---

## 5. Estado da obra (o que existe e o que é só plano)

| O que | Estado |
|---|---|
| Site Chikane em produção (catálogo, conta, pedidos/test-drive, reservas, favoritos, newsletter, backoffice) | ✅ funciona |
| Base de dados viaturas (otimizada) | ✅ aplicada — `supabase/setup.sql` |
| Campanhas na home | ✅ funciona |
| CMS (conteúdo e definições do site) | ✅ funciona |
| Imagens no Cloudflare R2 | ✅ funciona |
| Loja online | ❌ removida / não ativa |

---

## 6. Receita de trabalho (seguir sempre)

1. **Ler** este documento e as regras (secção 1).
2. **Classificar** o pedido (secção 4).
3. **Procurar**: está escrito em `docs/`? Segue-se. Não está? Perguntar ou propor.
4. **Implementar** o mínimo que resolve, no ficheiro certo, no estilo do que lá está.
5. **Validar**:
   - `npx tsc --noEmit`
   - `npx eslint <ficheiros que mexeste>` (sem erros novos)
   - `npm run build`
   - SQL: validar a sintaxe com o parser real do PostgreSQL antes de propor
   - performance: nenhuma fase deixa o site mais lento (medir quando aplicável)
6. **Relatar** em pt-PT: o que mudou, que ficheiros, como se validou, o que falta.
7. **Commit** só com autorização do dono, com mensagem em pt-PT.

---

## 7. Índice mestre dos documentos

### Regras e como trabalhar
| Documento | O que é |
|---|---|
| `docs/INSTRUCOES_PARA_IA.md` | este ficheiro — ponto de entrada |
| `docs/REGRAS_PARA_IA.md` | regras obrigatórias (não alterar lógica) |
| `docs/GUIA_LAYOUTS.md` | onde está cada ecrã e onde se mexe no layout |
| `AGENTS.md` / `CLAUDE.md` | regras técnicas do repositório (lidas automaticamente) |

### Plano do produto (loja + viaturas)
| Documento | O que é |
|---|---|
| `docs/PLANO_LOJA.md` | decisões fechadas + mapa do site |
| `docs/FASES.md` | as fases 0–5: o que se faz e como |
| `docs/PLANO_ETAPA_1.md` | detalhe da Fase 1 (tarefas, tabelas, critérios) |
| `docs/MODELO_DADOS_LOJA.md` | 23 tabelas, RLS, RPC, conteúdo inicial |
| `docs/COMPATIBILIDADE_STANDS.md` | a mesma base para carros e motos |
| `docs/PRODUTO_E_MARCA.md` | produto, marca, edições, caso Benimoto |
| `docs/TEXTOS_LOJA.md` | emails da loja e base das páginas legais |

### Base de dados (rascunhos — não correr)
| Documento | O que é |
|---|---|
| `docs/rascunho/ETAPA_1_LOJA.sql` | 23 tabelas da loja (229 comandos, validado) |
| `docs/rascunho/ETAPA_2_TIPOS_E_LOCAIS.sql` | tipos de veículo e lojas (35 comandos, validado) |

### Operação
| Documento | O que é |
|---|---|
| `docs/COLOCAR_NO_AR.md` | pôr o site no ar, do zero |
| `docs/VARIAVEIS_AMBIENTE.md` | chaves e variáveis: para que servem e onde ficam |

### Histórico (não é fonte de verdade)
`DOCUMENTO_PROJETO.txt`, `DEPLOY_GUIDE.html`, `BOOTSTRAP.txt`.

---

## 8. Convenções técnicas (resumo)

O detalhe completo está em `AGENTS.md`. O essencial:

- **Next.js 16 App Router**, React 19, Tailwind v4, TypeScript estrito. Alias `@/*`.
- Interceção de pedidos: **`proxy.ts`** na raiz (não criar `middleware.ts`); é a
  única verificação de `/admin`, e as *server actions* verificam-se sozinhas.
- **Supabase** (base de dados + autenticação) só com a chave pública (`anon`);
  tudo passa por **RLS** definido em `supabase/setup.sql`.
- **R2** para imagens; **Resend** para emails; **GA** só depois do aviso de cookies.
- Viaturas: fichas por **slug**; vendidas ficam visíveis **7 dias**.
- Um único ficheiro de esquema `supabase/setup.sql`, **idempotente**.
- Produção: Worker `chikane-garage1` (`chikanegarage.blog`), publicado a cada
  `git push` para `main`.

---

## 9. Performance e simplicidade (briefing permanente)

Regra completa na secção 11 de `docs/PLANO_ETAPA_1.md`. Em resumo:

- Um índice por consulta quente, composto quando filtra e ordena pelo mesmo caminho.
- Sem `SELECT *` nas listas; uma consulta por relação (nada de N+1).
- Catálogo servido pelo servidor e revalidado; paginação a partir de 24 artigos.
- Imagens no R2 com `lazy`; só a primeira de cada ficha carrega de imediato.
- Nenhuma biblioteca nova para o que o Next já faz.
- **Nenhuma fase deixa o site mais lento.**
- Teste final: *se for preciso SQL novo para mudar de cliente, está errado.*

---

## 10. Aquilo que nunca se faz

- Alterar lógica, consultas, autenticação, preços, emails ou SQL por iniciativa própria.
- Correr SQL ou juntar os rascunhos ao `setup.sql` sem autorização.
- Criar `middleware.ts`, mexer no `proxy.ts`, `next.config.ts`, `wrangler.toml` ou `package.json`.
- Instalar pacotes, fontes ou rastreadores.
- Mexer no `.env.local` ou commitar segredos.
- Reformatar/renomear ficheiros "por arrumação" — dificulta a comparação.
- Deixar código de carro escrito como se fosse o único caso (a base serve carros e motos).
- Criar ficheiros de apontamentos na raiz; todo o papel vai para `docs/`.
- Publicar (deploy) à mão ou commitar sem autorização.

---

## 11. Perguntas em aberto (só o dono responde)

| # | Pergunta | Onde |
|---|---|---|
| 1 | Confirmar "uma instalação por cliente" (não multi-empresa) | `docs/PRODUTO_E_MARCA.md` |
| 2 | O que a Benimoto quer (módulos, cores, domínio) | `docs/PRODUTO_E_MARCA.md` §7 |
| 3 | Contas de pagamento (cartão + MB Way) | `docs/PLANO_LOJA.md` §10 |
| 4 | Textos legais revistos | `docs/TEXTOS_LOJA.md` |
| 5 | Guardar os documentos novos num commit | — |
| 6 | Apagar ficheiros antigos de trabalho | `AGENTS.md` |

---

## 12. Glossário

| Termo | Significado |
|---|---|
| **Viagem / viatura** | Qualquer veículo: carro, moto, scooter, quad, ATV, jet ski, eBike |
| **Tipo de veículo** | Carro, moto, scooter… — vive na tabela `vehicle_types` (dados, não código) |
| **Condição** | `new` (novo) ou `used` (usado) |
| **Variante** | Versão de um artigo (cor, tamanho) |
| **SKU / referência** | Código do artigo |
| **RLS** | Regras do Supabase que decidem quem lê e escreve |
| **RPC** | Função na base de dados chamada pelo site |
| **Fase / etapa** | Bloco de trabalho da obra (ver `docs/FASES.md`) |
| **Layout** | Aparência, estrutura visual e textos — o único que se pode alterar livremente |

---

Voltar ao [README](../README.md) · [Regras para IA](REGRAS_PARA_IA.md) ·
[Fases](FASES.md) · [Plano da loja](PLANO_LOJA.md)
