# Fases da obra — o que se faz e como

> Documento de planeamento. **Nada foi implementado.** Escrito a 15/10/2026.
> Mostra as fases por ordem, o que cada uma entrega, como é feita e como se valida.
>
> Documentos que completam este: `docs/PLANO_LOJA.md` (decisões),
> `docs/PLANO_ETAPA_1.md` (detalhe da Fase 1), `docs/MODELO_DADOS_LOJA.md`,
> `docs/COMPATIBILIDADE_STANDS.md`, `docs/PRODUTO_E_MARCA.md`,
> `docs/TEXTOS_LOJA.md` e os rascunhos em `docs/rascunho/`.

## Regras que valem em todas as fases

1. **Nada de lógica sem autorização explícita do dono** (`docs/REGRAS_PARA_IA.md`).
2. **Aditivo**: cada fase acrescenta; não quebra o que já existe (o site está em produção).
3. **Completo e profissional** — acaba-se antes de passar à frente.
4. **Rápido** — nenhuma fase deixa o site mais lento; mede-se antes e depois.
5. **Simples** — se precisa de SQL novo para mudar de cliente, está errado.
6. **Validado sempre** com `npx tsc --noEmit`, `npm run lint` (sem erros novos),
   `npm run build`, e com o parser real do PostgreSQL nos ficheiros de esquema.

---

## Fase 0 — Preparação (não se vê nada)

**Objetivo**: ter tudo fechado para implementar de uma vez, sem parar a meio.

**O que se faz**

| # | Tarefa | Quem |
|---|---|---|
| 0.1 | Contas de pagamento (cartão + MB Way) e respetivas chaves | dono |
| 0.2 | Textos legais revistos (contabilista/jurista) | dono |
| 0.3 | Layouts finais (Lovable) para a loja e as fichas | dono + IA |
| 0.4 | Revisão dos dois rascunhos SQL e junção no `setup.sql` (por autorizar) | IA |
| 0.5 | Camada de marca definida (nome, cores, "Viaturas"/"Motos") | IA |
| 0.6 | Conteúdo real: 5–10 produtos com fotos e preços; marcas reais | dono |

**Como**: revisão de documentos e de SQL; validação de sintaxe; nada aplicado.

**Pronto quando**: existem layouts, contas e textos legais; o SQL está revisto.

---

## Fase 1 — Loja a vender (o essencial)

**Objetivo**: vender extras, acessórios e merchandising.

**O que fica a funcionar**: catálogo com categorias/marcas/filtros, ficha de
produto com variantes (cor/tamanho), stock e alertas, carrinho (convidado e
cliente), checkout com moradas e NIF, **cartão e MB Way**, portes por peso e zona
com portes grátis definidos no backoffice, cupões, comprovativo por link, emails,
área de cliente com as suas encomendas, e backoffice de produtos/encomendas/stock.

**Como** (detalhe em `docs/PLANO_ETAPA_1.md`)

1. Base de dados: aplicar `docs/rascunho/ETAPA_1_LOJA.sql` (23 tabelas, 23
   índices, RLS, 11 funções) + conteúdo inicial (6 categorias, marcas, zonas,
   25 faixas de portes).
2. Camada de acesso: leitura do catálogo no servidor; o preço é sempre lido da
   base de dados, nunca vem do browser.
3. Páginas: loja, categoria, marca, ficha, carrinho, checkout, confirmação.
4. Pagamentos: cartão e MB Way; a encomenda só fica "paga" com confirmação.
5. Emails (Resend, já em uso) — textos em `docs/TEXTOS_LOJA.md`.
6. Conta de cliente: encomendas, moradas, favoritos.
7. Backoffice: produtos, stock, encomendas, cupões, portes e definições.

**Como se valida**: os 10 cenários de `docs/PLANO_ETAPA_1.md` (carrinho misto,
stock a 0, cupão expirado, peso acima de 30 kg, convidado sem conta, etc.),
`npm run build` e medição da primeira carga em móvel.

**Pronto quando**: se compra e se recebe do início ao fim, e a garagem vê e
trata a encomenda no backoffice.

---

## Fase 2 — Viaturas (usadas e novas, e por tipo de cliente)

**Objetivo**: completar o catálogo de viaturas e servir stands de carros e de motos.

**O que se faz**

1. Aplicar `docs/rascunho/ETAPA_2_TIPOS_E_LOCAIS.sql`: tipos de veículo como
   dados, `vehicle_type`, cilindrada, carta, horas, novo/usado, stock/por
   encomenda, e a tabela de lojas.
2. Filtros Novos/Usados e por tipo; ficha com campos próprios de cada tipo
   (carro, moto, scooter, quad, ATV, side-by-side, jet ski, eBike).
3. Preenchimento automático de specs por tipo (ficheiro por tipo: carros já
   existe; motos a criar).
4. Pedido de proposta de financiamento; retoma.
5. Reservas: test-drive (carros), test-ride (motos) e marcação de serviço (oficina).
6. Prévias para conteúdos (SEO) de viaturas, como já acontece hoje.

**Porque nesta ordem**: a loja (Fase 1) é o que ainda não existe em lado nenhum;
as viaturas já funcionam, e por isso ganham as melhorias depois.

**Pronto quando**: a Chikane vende viaturas novas e usadas como sempre, e a mesma
instalação serve motos mudando só os dados e a apresentação.

---

## Fase 3 — Remate (loja madura)

**Objetivo**: fechar o que faz a diferença a longo prazo.

- Devoluções e reembolsos (artigo a artigo, transformados já na base de dados).
- Relatórios e exportação para o contabilista (IVA por período, vendas).
- SEO: dados estruturados (produtos, ofertas, viaturas), sitemap, títulos.
- Avaliações de produtos e "wishlist".
- Campanhas e cupões por categoria.
- Busca por texto no catálogo (quando houver conteúdo).

**Como**: cada ponto é uma alteração aditiva; as tabelas já existem
(`return_requests`, `return_items`, `coupons.applies_to`).

**Pronto quando**: a garagem trata tudo sem sair do backoffice.

---

## Fase 4 — Produto e marca (vender a outro stand)

**Objetivo**: poder entregar o mesmo site a outro cliente (ex.: Benimoto) mudando
só a marca e os dados. Base: `docs/PRODUTO_E_MARCA.md`.

**O que se faz**

1. **Camada de marca**: nome, logótipo, favicon, cores e etiquetas fora do código
   (hoje "Chikane" está escrito em 30 ficheiros).
2. **Várias lojas**: usar a tabela `locations` no rodapé/contactos.
3. **Etiquetas configuráveis**: "Viaturas" vs "Motos", tipos ativos.
4. **Guia de colocação no ar** por cliente (`docs/COLOCAR_NO_AR.md`) — passo a passo.
5. **Manual do backoffice** para o cliente.
6. **Base de textos legais por cliente** (`docs/TEXTOS_LOJA.md`).

**Como**: trabalho de apresentação e configuração; a base de dados não muda.

**Pronto quando**: se cria um site novo para outro stand sem escrever SQL nem
tocar em lógica — só configuração e layout.

---

## Fase 5 — Opcional (só se valer a pena)

Idiomas (EN/ES como o site da Benimoto), notícias/blog, integração com
transportadoras, SMS, faturação automática, API, temas.

**Regra**: cada extra só entra com um uso real identificado, e nunca à custa da
velocidade.

---

## Ordem, e porquê

| Fase | Depende de | Entrega |
|---|---|---|
| 0 | dono (contas, textos, layouts) | tudo pronto para implementar |
| 1 | Fase 0 | loja a vender |
| 2 | Fase 1 (não quebra) | viaturas completas + tipos |
| 3 | Fases 1 e 2 | loja madura |
| 4 | Fases 1 a 3 | produto entregável a outro cliente |
| 5 | Fase 4 | extras |

**Sem prazos fixos** (decidido): cada fase fecha quando estiver **completa e
validada**. Uma fase só começa quando a anterior estiver estável em produção.

---

## O que já está feito (e não se repete)

- Definições: `docs/PLANO_LOJA.md` (24 decisões fechadas).
- Plano detalhado da Fase 1: `docs/PLANO_ETAPA_1.md`.
- Modelo de dados: `docs/MODELO_DADOS_LOJA.md` (23 tabelas).
- Rascunhos SQL validados: `docs/rascunho/ETAPA_1_LOJA.sql` (229 comandos) e
  `docs/rascunho/ETAPA_2_TIPOS_E_LOCAIS.sql` (35 comandos).
- Compatibilidade carros/motos: `docs/COMPATIBILIDADE_STANDS.md`.
- Produto, marca e caso Benimoto: `docs/PRODUTO_E_MARCA.md`.
- Emails e textos legais: `docs/TEXTOS_LOJA.md`.

> Nada foi aplicado ao site: esta página serve para decidir **antes** de mexer.
