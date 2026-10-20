# Textos da loja — emails e páginas legais

> Documento de **definições**. Nada foi alterado no site.
> Complementa `docs/PLANO_LOJA.md` e `docs/PLANO_ETAPA_1.md`.
> Os textos legais são uma **base**: têm de ser revistos pelo contabilista/jurista
> antes de a loja abrir.

## 1. Como os emails são enviados

O site usa o **Resend**, igual ao que já existe:

- `app/api/newsletter/subscribe/route.ts` (newsletter)
- `app/api/admin/reply/route.ts` (resposta ao cliente)
- `app/api/admin/test-drive/update/route.ts` (test-drive)

Remetente atual: `Chikane Garage <no-reply@chikanegarage.blog>`
(e `newsletter@` para a newsletter).

**Regra**: a encomenda nunca depende do email. O email é aviso. A encomenda
existe na base de dados e o cliente pode consultá-la pelo link do comprovativo.

---

## 2. Emails da loja

### 2.1 Encomenda registada (pagamento pendente)

**Quando**: no fim do checkout, antes de pagar (ou a aguardar MB Way).

- Assunto: `Encomenda CG-2026-0001 registada`
- Corpo:

> Olá {{nome}},
>
> Recebemos a tua encomenda **{{numero}}**.
>
> {{#se pagamento_pendente}}A encomenda só será preparada depois de o pagamento
> estar confirmado.{{/se}}
>
> Podes consultar a qualquer momento:
> **{{link_comprovativo}}**
>
> Resumo:
> {{itens}}
>
> Subtotal: {{subtotal}} €
> Portes: {{portes}} €
> **Total: {{total}} €**
>
> {{morada_entrega}}
>
> Qualquer dúvida: {{email_suporte}} · {{telefone}}
>
> Chikane Garage

### 2.2 Pagamento confirmado

**Quando**: o gateway confirma (webhook ou verificação manual).

- Assunto: `Pagamento recebido — encomenda {{numero}}`
- Corpo:

> Olá {{nome}},
>
> Confirmámos o pagamento de **{{total}} €** da encomenda **{{numero}}**.
> Vamos começar a preparar os teus artigos.
>
> Seguimento: **{{link_comprovativo}}**
>
> Obrigado,
> Chikane Garage

### 2.3 Encomenda enviada

- Assunto: `Encomenda {{numero}} a caminho`
- Corpo:

> Olá {{nome}},
>
> A tua encomenda **{{numero}}** foi enviada por {{transportadora}}.
> Rastreio: **{{codigo}}** ({{link_rastreio}})
>
> Prazo estimado: {{prazo_min}} a {{prazo_max}} dias úteis.
>
> Chikane Garage

### 2.4 Encomenda entregue

- Assunto: `Encomenda {{numero}} entregue`
- Corpo:

> Olá {{nome}},
>
> A encomenda **{{numero}}** foi entregue.
>
> Tens {{dias_devolucao}} dias para devolver qualquer artigo (ver condições em
> {{politica_devolucoes}}). Gostamos de saber a tua opinião.
>
> Chikane Garage

### 2.5 Encomenda cancelada / Reembolso feito

- Assunto: `Encomenda {{numero}} cancelada` · `Reembolso de {{valor}} € — encomenda {{numero}}`
- Corpo: motivo, valor e prazo do reembolso (5–10 dias úteis, depende do método),
  e o que fazer se não aparecer.

### 2.6 Devoluções

- **Devolução pedida** (cliente): assunto `Pedido de devolução — encomenda {{numero}}`,
  com lista dos artigos, prazo de 14 dias, quem paga os portes
  (paga a garagem se for erro/defeito nosso; caso contrário o cliente), morada de envio.
- **Devolução aceite**: instruções de envio + prazo.
- **Devolução recusada**: motivo claro e alternativas.
- **Artigos recebidos**: confirmação do que foi conferido, o que volta ao stock e
  o valor a reembolsar.

### 2.7 "Avisar-me quando chegar"

- Assunto: `{{produto}} já está disponível`
- Corpo: link direto para o artigo, com nota de que o stock é limitado.

### 2.8 Aviso interno (para a garagem)

**Quando**: nova encomenda, sempre.

- Assunto: `Nova encomenda {{numero}} — {{total}} € ({{pagamento}})`
- Corpo: cliente, telemóvel, NIF, artigos, portes, morada de envio e nota do cliente.

---

## 3. Páginas legais (base)

Criar/atualizar em `app/` — páginas simples, com `data` de atualização à vista.

### 3.1 `app/termos-e-condicoes` (já existe)

Acrescentar a parte de **venda**:

- Identificação do vendedor (nome, NIF, morada, contactos, email de apoio)
- Objeto (que artigos se vendem) e preços **com IVA incluído à taxa legal (23%)**
- Pagamento: métodos aceites (cartão, MB Way), quando é que a encomenda é preparada
- Portes e prazos (remete para a tabela de zonas/portes)
- **Direito de livre resolução: 14 dias** (DL 24/2014) — como se exerce, quem paga o
  envio de devolução (a garagem se for erro/defeito nosso; o cliente nos restantes casos)
- Reembolso: prazo e método
- Garantia legal dos bens (3 anos em Portugal, a confirmar)
- Reclamações: **livro de reclamações eletrónico** e RAL
- Lei aplicável e foro

### 3.2 `app/politica-de-privacidade` (já existe)

Acrescentar a loja: que dados recolhemos (nome, email, telefone, NIF, morada,
histórico de encomendas), para quê, quanto tempo os guardamos, e **com quem são
partilhados** (Supabase, Cloudflare, Resend e o fornecedor de pagamentos — cada um
com a sua função). Direitos do cliente e contacto do responsável.

### 3.3 Nova página: devoluções e reembolsos

- O que pode ser devolvido e prazo (14 dias a contar da receção)
- Como pedir (pela conta ou pelo link do comprovativo)
- Estado do artigo (como novo, com embalagem), exceções (artigos personalizados/montados)
- Quem paga o envio de volta (a garagem se for erro/defeito nosso; o cliente nos outros casos)
- Prazos: verificação na receção, reembolso no prazo legal
- Trocas

### 3.4 Nova página: envios e portes

- Zonas (Portugal continental, Madeira, Açores, Espanha, Europa)
- Portes por peso, e portes grátis acima de um valor (definido no backoffice)
- Prazos estimados por zona
- O que acontece em caso de extravio, falha de entrega ou morada errada

### 3.5 Cookies

Já existe consentimento em `components/cookie-consent.tsx`. Na loja, apenas
o essencial funciona sem consentimento (carrinho e checkout). Qualquer medição
(Google Analytics) continua a depender do "aceitar".

---

## 4. Onde fica cada texto (para implementar)

| Texto | Onde |
|---|---|
| Termos e condições | `app/termos-e-condicoes/page.tsx` |
| Privacidade | `app/politica-de-privacidade/page.tsx` |
| Devoluções e reembolsos | página nova (ex.: `app/devolucoes/page.tsx`) |
| Envios e portes | nova página (ex.: `app/envios/page.tsx`) |
| Emails de encomenda | rotas de servidor (padrão de `app/api/admin/reply/route.ts`) |
- Rodapé: ligar todas estas páginas, como já acontece com as existentes.

## 5. Personalização por cliente

Numa cópia para outro cliente (`docs/PRODUTO_E_MARCA.md`), mudam: nome, marca,
morada, NIF, email de apoio, o remetente dos emails e **todos** os textos legais.
Nada deve dizer "Chikane".

## 5.1 O que falta ao dono para isto ficar completo

- [ ] Nome comercial, NIF e morada a constar nos termos
- [ ] Email e telefone de apoio à loja
- [ ] Métodos de pagamento confirmados (cartão, MB Way/Multibanco)
- [ ] Prazo e forma das devoluções (já definido: artigo a artigo; envio pago por quem
      tiver razão), prazos concretos de reembolso
- [ ] Revisão dos textos pelo contabilista/jurista

> Nada desta página foi aplicado ao site.
