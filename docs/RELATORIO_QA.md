# Revisão funcional e caça ao erro

Revisão feita a **2026-11-16** sobre o ramo `vaga/vendedor-proposta-qa` (base
`main` em `5519049`). O objetivo é entrar na fase de **testes de funcionalidades
e caça ao erro**: o que já está validado automaticamente, o que só se confirma
com a base de dados e os serviços reais, e que riscos ficam registados.

> Este documento é um **registo de QA**. Não altera lógica. As correções que
> impliquem mexer em consultas, ações, RLS ou emails têm de ser pedidas ao dono
> (ver [`REGRAS_PARA_IA.md`](REGRAS_PARA_IA.md)).

---

## 1. Estado das verificações

| Verificação | Estado | Nota |
|---|---|---|
| `npm run typecheck` | ✅ passa | `tsc --noEmit` sem erros |
| `npm test` (Vitest) | ✅ 58/58 | Inclui testes novos de validação, permissões e opções |
| ESLint nos ficheiros alterados | ✅ passa | O lint global continua com erros pré-existentes (ver §3) |
| `npx next build --webpack` | ✅ passa | Build local com variáveis fictícias |
| RLS / Supabase real | ⏳ manual | Depende das migrações `021`–`039` aplicadas |
| Uploads R2 | ⏳ manual | Precisa de `VEHICLE_IMAGES` ou das chaves S3 e de `R2_PUBLIC_URL` |
| Emails Resend | ⏳ manual | Precisa de `RESEND_API_KEY` no Worker |
| Percursos mobile / telemóvel real | ⏳ manual | Checklist em §5 |

As verificações automáticas não provam que o site está correto em produção: só
confirmam tipos, regras puras e que o projeto compila.

---

## 2. Mapa de funcionalidades

### 2.1. Público

| Funcionalidade | Onde | O que deve acontecer |
|---|---|---|
| Home | `/` (`app/page.tsx`) | Hero, spotlight, grelha de viaturas, processo, newsletter; o popup de resposta ao test drive só interpreta `?testdrive=` nesta página |
| Usados | `/usados` | Lista apenas `sale_type !== "new"`; filtros laterais fixos em desktop e painel em mobile |
| Ficha de usado | `/usados/<slug>` | Galeria, preço, specs de usado (ano/km/caixa…), reserva, informações e test drive |
| Novos | `/novos` | Lista apenas `sale_type = "new"` |
| Ficha de novo | `/novo/carro/<slug>` | Layout próprio: configuração em destaque, sem km/donos/origem; CTA «Configurar» |
| Configurador / proposta | `/comprar/<slug>` | Extras, variantes, totais e pedido de proposta |
| Campanhas | `/campanhas` e `/campanhas/<slug>` | Listagem e página com carrossel, informação lateral, viatura associada e 3 campanhas relacionadas |
| Sobre / Contacto / legais | `/sobre`, `/contacto`, `/politica-de-privacidade`, `/termos-e-condicoes` | Conteúdo e formulários |
| Links antigos | `/catalogo`, `/catalogo/<slug>` | Redirecionam para `/usados` |
| Resposta a test drive | `/test-drive/resposta/<token>` | Aceitar nova data ou pedir outro horário |
| Favoritos | `/conta/perfil` | Lista de favoritos com ligação à ficha certa (novo ou usado) |
| SEO | `/sitemap.xml`, `/robots.txt` | URLs públicas incluem `/usados`, `/novos`, campanhas e fichas |

### 2.2. Conta e área de cliente

| Funcionalidade | Onde | O que deve acontecer |
|---|---|---|
| Registo / login / recuperação | `/conta` | Confirmação por email; bloqueio temporário após 5 tentativas falhadas |
| Perfil | `/conta/perfil` | Nome, telefone, avatar, favoritos |
| Meus pedidos | `/conta/perfil` | Contactos, test drives e reservas associados ao utilizador ou ao email da sessão |
| Eliminação de conta | `/conta/perfil` | Pedido registado e tratado no backoffice |

### 2.3. Comercial

| Funcionalidade | Onde | O que deve acontecer |
|---|---|---|
| Pedido de informações | `/contacto?vehicle=<slug>` | Cria `contact_requests`; limite anti-spam; email ao cliente e ao staff |
| Test drive | `/contacto?testdrive=<slug>` | Cria `test_drives`; calendário; confirmação e reagendamento por email |
| Reserva | `/contacto?reserva=<slug>` | Cria `reservations`; decisão no backoffice; expira em 7 dias |
| Proposta | `/comprar/<slug>` | Cálculo de extras/desconto; email de comprovativo ao cliente e aviso ao gestor |
| Newsletter | Rodapé | Subscrição e email de boas-vindas; `RESEND_API_KEY` necessária |

### 2.4. Backoffice (`/admin`)

| Área | Quem entra | O que faz |
|---|---|---|
| Dashboard / estatísticas | admin, editor, sales | Visão geral |
| Viaturas | admin, sales (**editor só leitura**) | Criar, editar, fotos, equipamento, destaque; **apagar só admin** |
| Extras | admin, sales | Catálogo de extras, variantes e associação a viaturas novas |
| Campanhas | admin, editor | Criar/editar campanhas e fotos |
| Pedidos / propostas | admin, sales | Contactos, test drives, reservas e propostas |
| Contas | admin | Gestão de contas e pedidos de eliminação |
| Definições | admin, editor | Conteúdo do site, contactos, redes, estatísticas |
| Utilizadores | admin | Atribuir `user`, `editor` ou `sales`; **`admin` só na base de dados** |

O menu esconde as áreas sem permissão, e `proxy.ts` é a única barreira de
página. As Server Actions e as APIs voltam a validar sessão e cargo — é isso que
impede um utilizador de chamar a rota diretamente.

---

## 3. Riscos encontrados

### P0 — resolver antes de abrir os testes com dados reais

**P0-1. As migrações `021`–`039` têm de estar aplicadas.**
`supabase/setup.sql` é o schema base; as tabelas de extras, campanhas e
propostas vivem nas migrações seguintes (`022`, `025`, `027`, `029`, `034`,
`035`, `038`, `039`). Sem elas:

- `/campanhas` e `/campanhas/<slug>` devolvem 404 se faltar a migração `027`
  (sem a `029` perdem-se apenas as fotografias adicionais, porque a consulta
  falha em silêncio);
- o configurador de extras e o backoffice de extras não funcionam;
- o gestor de vendas não consegue criar viaturas (RLS antiga);
- a regra «admin só na base de dados» não está garantida.

**Confirmar no SQL Editor:**

```sql
-- Tabelas que devem existir
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('campaigns','campaign_images','vehicle_extras','extra_variants','proposals');

-- Funções de apoio
select proname from pg_proc
where proname in ('has_role','prevent_admin_role_assignment');
```

Se faltar alguma, correr por ordem `021` → `039` no SQL Editor. **Não** se
alterou `setup.sql`.

**P0-2. `RESEND_API_KEY` e `R2_PUBLIC_URL` em produção.**
Sem a chave Resend, os emails são silenciosamente ignorados. Sem
`R2_PUBLIC_URL`, `uploadToR2()` lança erro e as fotografias não são guardadas.
Confirmar em **Cloudflare → Worker `chikane-garage1` → Settings → Variables and
Secrets**.

**P0-3. Primeiro administrador.**
Numa base de dados nova, ninguém é admin. A única forma é o SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'email@exemplo.pt';
```

A migração `039` bloqueia a promoção a admin a partir de qualquer sessão
autenticada; o SQL Editor continua a poder fazê-lo (`auth.uid()` é `NULL`).

### P1 — funcionalidade quebrada ou enganadora em condições reais

**P1-1. Teste e2e de staging desatualizado.**
`tests/e2e/public-journeys.spec.ts` procura um link chamado **«Catálogo»** e
espera `/catalogo$`. Esse link já não existe (o menu diz **«Usados»**) e
`/catalogo` passou a redirecionar. O teste já falhava antes por causa do nome;
agora falha também no URL. **Ação sugerida:** atualizar o teste para clicar em
«Usados», esperar `/usados$` e, se se quiser, cobrir `/novo/carro/<slug>`. Ficou
fora dos commits por instrução do dono.

**P1-2. Emails apontam sempre para `/usados/<slug>`.**
Os emails de test drive, reserva, resposta e newsletter montam
`${siteUrl}/usados/<slug>`. Para viaturas novas funciona, mas com um redirect
extra (`/usados/<slug>` → `/novo/carro/<slug>`). Se o redirect for removido, os
links dos emails partem. **Ação sugerida:** usar `vehicleHref()` nas rotas que
já têm `sale_type`; nas que não têm, incluir `sale_type` no `select`.

**P1-3. Campanhas e extras dependem de migrações específicas.**
Ver P0-1. O `loadCampaign()` engole qualquer erro e mostra 404 — uma falha de
base de dados parece «campanha apagada». **Ação sugerida:** distinguir «não
existe» de «falhou a leitura» (ex.: `error` explícito), sem alterar o
comportamento visível.

**P1-4. Formulário de viatura: campos automáticos nas viaturas novas.**
Ano, mês, km, donos, caderneta e origem não aparecem nas viaturas novas, mas
continuam a ser enviados automaticamente. Se a regra de preenchimento automático
mudar, a validação partilhada tem de acompanhar. **Ação sugerida:** teste manual
de criar e editar uma viatura nova e uma usada depois de cada alteração ao
formulário (`lib/vehicle-form-validation.ts`).

### P2 — polimento, SEO e manutenção

**P2-1. Redirects `/catalogo` são temporários (307).**
Para consolidar SEO, o ideal é um redirect permanente (`permanentRedirect`).
Exige decisão do dono porque mexe em routing.

**P2-2. Ficha nova e ficha usada são ficheiros separados.**
É intencional (o dono pediu layouts diferentes), mas duplica consultas e
estrutura. As specs já estão centralizadas em `lib/vehicle-specs.ts` e os links
em `lib/vehicle-links.ts`. Ao acrescentar um campo, atualizar **os dois**
ficheiros de detalhe e as duas funções de specs.

**P2-3. `generateMetadata` e a página repetem a mesma leitura.**
Em `/campanhas/<slug>` e nas fichas, a metadata e o componente carregam os
mesmos dados duas vezes. Não é visível para o utilizador, mas pesa em produção.
Pode ser resolvido com `cache()` do React, se o dono autorizar.

**P2-4. Bloqueio de login é local ao browser.**
`lib/login-attempts.ts` guarda as tentativas em `localStorage`; limpar os dados
do browser contorna o bloqueio. É uma proteção de conveniência, não de
segurança. A defesa real é a do Supabase Auth.

**P2-5. Lint global não está verde (pré-existente).**
Erros de `react-hooks` em `app/admin/pedidos`, `components/ui/favorites-list`,
`components/cookie-consent` e `components/ui/vehicle-photo-picker`, e
`.open-next/` fora dos ignores. Avaliar só os ficheiros alterados com
`npx eslint <caminho>`.

**P2-6. Dependências com vulnerabilidades moderadas.**
`npm audit --audit-level=high` passa; ficam moderadas em `glob`/`minimatch`
(OpenNext e ferramentas de lint). Não usar `npm audit fix --force`: propõe um
downgrade incompatível.

---

## 4. Checklist manual — percursos públicos

Marcar à medida que se testa. Usar uma janela anónima e, depois, uma conta de
teste.

### Home

- [ ] Hero, spotlight e grelha carregam; imagens não rebentam.
- [ ] CTA «Ver Usados» abre `/usados`; «Ver tudo» abre `/usados`.
- [ ] Cartão de viatura usada abre `/usados/<slug>`.
- [ ] Cartão de viatura nova abre `/novo/carro/<slug>`.
- [ ] Newsletter aceita email novo e recusa repetido com mensagem clara.
- [ ] Abrir `/` com `?testdrive=<token>` mostra o popup; abrir outra página com
      o mesmo parâmetro **não** mostra o popup.

### Usados

- [ ] Filtros de marca, combustível, caixa, preço e ano funcionam.
- [ ] Em desktop, a barra de filtros acompanha o scroll sem tapar header/rodapé.
- [ ] Em mobile, o painel de filtros abre e fecha; aplicar filtro fecha o painel.
- [ ] Estado vazio aparece quando nenhum resultado corresponde.
- [ ] `/catalogo` e `/catalogo/<slug>` redirecionam para `/usados…`.
- [ ] Viatura vendida continua visível durante 7 dias e depois desaparece.

### Ficha de usado

- [ ] Ordem das specs: `Ano | Km`, `Combustível | Caixa`, `Potência | Binário`,
      `Motor | Consumo`, `Cor Exterior | Cor Interior`, `Tração | Estilo`,
      `Origem | Donos`.
- [ ] «Mostrar mais informação» abre mês, país, caderneta, CO₂ e garantia.
- [ ] Reservar, pedir informações e marcar test drive abrem `/contacto` com o
      parâmetro certo.
- [ ] Favorito funciona sem sessão (pede login) e com sessão (guarda).
- [ ] Abrir uma viatura nova em `/usados/<slug>` redireciona para
      `/novo/carro/<slug>`.

### Novos

- [ ] Só aparecem viaturas `sale_type = "new"`.
- [ ] Ficha nova mostra **exatamente** as 5 linhas: `Ano | Combustível`,
      `Motor | Consumo`, `CV | NM`, `Cor Interior | Cor Exterior`,
      `Tração | Estilo`.
- [ ] «Mostrar mais informação» mostra caixa, CO₂, garantia, COC e ISV.
- [ ] «Configurar» abre `/comprar/<slug>`; «Pedir informações» abre `/contacto`.
- [ ] Viatura nova em `/novo/carro` sem slug vai para `/novos`.
- [ ] Viatura usada em `/novo/carro/<slug>` vai para `/usados/<slug>`.

### Configurador e proposta

- [ ] Extras aparecem com preço e variante mais barata por omissão.
- [ ] Alterar variante atualiza o total.
- [ ] Desconto e âmbito (total/extras/viatura) refletem-se no resumo.
- [ ] Submeter sem sessão e com sessão; confirmar mensagem de sucesso.
- [ ] Email ao cliente é um **comprovativo** (sem CTA de compra) e inclui foto,
      valores, extras, desconto, legalização, total, referência e data.
- [ ] Email ao gestor abre a proposta no backoffice.

### Campanhas

- [ ] «← Campanhas» está numa barra no topo, antes das fotografias.
- [ ] Fotografias em carrossel (setas, miniaturas e teclado).
- [ ] Descrição, período, preço e viatura associada legíveis em desktop e mobile.
- [ ] CTA abre o `cta_url` ou a ficha da viatura.
- [ ] Aparecem 3 campanhas relacionadas; se não houver, a secção não aparece.

### Contacto e conta

- [ ] Contacto: nome, email, telefone e mensagem validam com mensagens claras.
- [ ] Test drive: calendário bloqueia datas passadas e horários ocupados.
- [ ] Reserva: motivo obrigatório e pedido aparece no backoffice.
- [ ] Registo: email de confirmação chega; conta fica utilizável.
- [ ] Login: 5 tentativas erradas bloqueiam temporariamente com contagem.
- [ ] Recuperação de password: email chega e o link funciona.
- [ ] Perfil: alterar nome/telefone persiste; avatar carrega.
- [ ] Favoritos e «meus pedidos» mostram a viatura e ligam à ficha certa.

### Backoffice

- [ ] `admin` vê todas as áreas; `editor` não vê Viaturas (edição), Pedidos,
      Extras, Propostas, Contas nem Utilizadores; `sales` não vê Campanhas,
      Definições, Contas nem Utilizadores.
- [ ] `sales` cria e edita uma viatura, carrega fotos e define capa.
- [ ] `sales` **não** vê o botão de apagar; `admin` vê e apaga.
- [ ] `editor` abre Viaturas em modo leitura (sem criar/editar/apagar).
- [ ] Criar viatura sem preencher campos obrigatórios mostra erro em cada campo.
- [ ] Descrição e CO₂ podem ficar vazios.
- [ ] Em viatura usada, km/donos/caderneta/origem são obrigatórios.
- [ ] Em viatura nova, esses campos não aparecem e não bloqueiam.
- [ ] Utilizadores: o seletor só oferece Cliente, Editor e Gestor de vendas.
- [ ] Utilizadores: quem já é admin vê o cargo bloqueado com «só na base de dados».
- [ ] Utilizadores: o próprio cargo fica só leitura.
- [ ] Promover alguém a admin por API/SQL autenticado falha (migração `039`).

### Emails

Testar com uma caixa real e confirmar também o spam.

- [ ] Confirmação de conta.
- [ ] Recuperação de password.
- [ ] Contacto: confirmação ao cliente + aviso ao staff.
- [ ] Test drive: confirmação, reagendamento e resposta do cliente.
- [ ] Reserva: pedido, decisão e expiração.
- [ ] Proposta: comprovativo ao cliente + aviso ao gestor.
- [ ] Newsletter: boas-vindas e campanha manual (`/test-newsletter`).
- [ ] Todos os links abrem no domínio certo e caem na ficha correta.

### Segurança e dados

- [ ] Sem sessão, `/admin` redireciona para `/conta`.
- [ ] Com sessão de cliente, `/admin` continua bloqueado.
- [ ] Chamar uma API de admin sem sessão devolve 401/403.
- [ ] Um utilizador só lê os próprios favoritos, pedidos, test drives e reservas.
- [ ] `service_role` não aparece em nenhum ficheiro do site.
- [ ] `robots.txt` e `sitemap.xml` respondem e não listam `/admin`.

---

## 5. Checklist rápido de regressão (15 minutos)

Para correr depois de qualquer alteração de layout:

1. `/` abre e o hero não tem sobreposições.
2. `/usados` filtra e abre uma ficha.
3. `/novos` abre uma ficha nova.
4. `/campanhas` abre uma campanha e o carrossel navega.
5. `/contacto` valida e não submete sem dados.
6. `/conta` mostra login e registo.
7. `/admin` bloqueia sem sessão.
8. Menu e rodapé não têm links mortos.
9. Consola do browser sem erros novos.
10. Vista de telemóvel (375 px) sem scroll horizontal.

---

## 6. Registo de execução

Preencher a cada ronda de testes.

| Data | Versão / commit | Ambiente | Resultado | Falhas abertas | Responsável |
|---|---|---|---|---|---|
| 2026-11-16 | `vaga/vendedor-proposta-qa` | local + build | Typecheck, Vitest, ESLint e build verdes; QA manual por fazer | P0-1 a P0-3, P1-1 a P1-4 | — |

---

*Última atualização: 2026-11-16.*
