# Chikane Garage como produto — marca, cópias e comercialização

> Documento de **definições** (nada foi alterado no site). Escrito a 15/10/2026.
> Complementa `docs/PLANO_LOJA.md`, `docs/PLANO_ETAPA_1.md` e `docs/MODELO_DADOS_LOJA.md`.
> Lê-se antes de `docs/REGRAS_PARA_IA.md`.

## 1. Porquê este documento

O dono quer manter a **versão de carros como está na Chikane (a principal)** e,
mais tarde, **vender uma cópia a outra empresa** (ex.: Benimoto). Isso é uma
decisão de arquitetura: uma coisa é ter *um* site, outra é ter um *produto* que se
instala em vários clientes.

Este documento fixa a decisão, o que muda de cliente para cliente e o que há a
fazer no código (quando for autorizado).

## 2. Decisão: uma instalação por cliente

**Cada cliente tem o seu próprio site**: o seu domínio, a sua base de dados, as
suas fotos, as suas contas. O código é o mesmo — muda a **marca** e a
**configuração**.

Porquê:

- **Isolamento total** — é impossível um cliente ver dados de outro; não se toca
  na segurança que já existe (regras RLS por utilizador).
- **É o que se vende**: um site pronto a usar, com o nome do cliente.
- **Preço simples** de explicar (instalação + manutenção), sem contas de SaaS.
- Sem risco de uma alteração num cliente afetar o outro.

Custo: cada cliente tem a sua instalação; atualizar é aplicar as mesmas mudanças
por cliente (com um só repositório, é pouco trabalho).

**Alternativa** (uma só instalação a servir várias empresas, estilo SaaS):
- Só compensa a partir de muitos clientes e com mensalidade.
- Exige refazer o modelo de dados (um campo "empresa" em quase todas as tabelas)
  e a segurança (políticas por empresa). É trabalho grande e arriscado.
- **Recomendação:** fica para a Fase 4. Para não fechar a porta, a marca e os
  módulos passam a ser **configuração** (secção 4), e não texto no código.

**Decisão (proposta):** uma instalação por cliente, com a marca e os módulos em
configuração. Reverter para "vários clientes num só site" continua possível.

## 2.1 O que se vende, exatamente

- **Chikane** (o site atual) = a **edição Stand**, a principal.
- **Cópia para outro stand (ex.: Benimoto)**: a mesma aplicação com outra marca,
  outro domínio, outras contas e apenas os módulos que o cliente quiser.
- Nada é partilhado entre clientes (dados, ficheiros, emails, pagamentos).

## 2.2 Módulos (edições)

Tudo por configuração, sem versões de código separadas:

| Módulo | Edição Stand (Chikane) | Edição Loja | Edição Completa |
|---|---|---|---|
| Catálogo de viaturas | Sim | Não | Sim |
| Viaturas novas / por encomenda | Sim | Não | Sim |
| Reservas e test-drives | Sim | Não | Sim |
| Pedido de financiamento | Sim | Não | Sim |
| Loja + carrinho + encomendas | Opcional | Sim | Sim |
| Área de cliente (encomendas, favoritos) | Sim | Sim | Sim |
| Newsletter | Sim | Sim | Sim |
| Lojas de conteúdo (sobre, contactos, legais) | Sim | Sim | Sim |

## 3. O que muda de cliente para cliente

Checklist de personalização (um cliente novo):

**Identidade**
- [ ] Nome comercial e assinatura (tagline)
- [ ] Logótipo e favicon
- [ ] Cores e tipografia
- [ ] Foto(s) de destaque

**Contactos**
- [ ] Telefone, WhatsApp, email
- [ ] Morada, localização e link do Google Maps
- [ ] Redes sociais
- [ ] NIF e dados para o comprovativo

**Domínio e comunicações**
- [ ] Domínio próprio
- [ ] Endereço de envio de emails (Resend) e assinatura
- [ ] Google Analytics (opcional)

**Módulos e comércio**
- [ ] Que módulos ficam ligados (secção 2.2)
- [ ] Preços e IVA
- [ ] Portes: zonas, peso, limites e portes grátis
- [ ] Métodos de pagamento (conta do cliente)
- [ ] Política de devoluções

**Conteúdo**
- [ ] Viaturas, produtos, categorias, marcas (lista)
- [ ] Textos institucionais (sobre, contactos)

**Legal**
- [ ] Política de privacidade, termos e condições, política de cookies
- [ ] Livro de reclamações / informações do consumidor

## 4. Como está hoje e o que falta para ser "vestível"

**Já configurável** (guardado na base de dados, editável em `/admin/definicoes`):

`site_settings` — telefone, email, morada, localização, link do Maps, redes
sociais, tagline do rodapé, fotos das páginas, avatares e configuração dos
test-drives. Tipo em `lib/site-settings.ts`.

**Falta centralizar** (é este o trabalho da "camada de marca"):

1. **Nome/marca escrita em texto fixo em 30 ficheiros** do código. Exemplos:
   `app/layout.tsx`, `app/page.tsx`, `app/sobre/page.tsx`, `app/contacto/page.tsx`,
   `app/termos-e-condicoes/page.tsx`, `app/politica-de-privacidade/page.tsx`,
   `components/layout/header.tsx`, `components/layout/footer.tsx`,
   `app/catalogo/page.tsx`, `app/catalogo/[slug]/page.tsx`, `app/conta/**`,
   `app/admin/**` e vários `app/api/**` (emails e assuntos).
   → Passar a ler de uma configuração de marca.
2. **Logótipo, favicon, cores e tipografia** — hoje fixos no código/estilos.
2. **Metadados** (título, descrição, imagem de partilha) por cliente.
3. **Emails**: assinatura e conteúdo com o nome do cliente.
4. **Módulos**: ligar/desligar cada secção por configuração.

> Nota: os ficheiros de `app/api/**` e `lib/*` são **lógica** — só se mexem com
> autorização explícita do dono, como manda `docs/REGRAS_PARA_IA.md`.

## 5. Pacote de entrega (quando se vende)

- Instalação: worker Cloudflare, base de dados Supabase, R2, domínio.
- Ficheiro de modelo de dados (`supabase/setup.sql`) já com a loja incluída.
- Documentação: este documento, `docs/COLOCAR_NO_AR.md`, `docs/VARIAVEIS_AMBIENTE.md`
  e um **manual do backoffice** (a criar).
- Textos legais: base a personalizar pelo cliente (a criar).
- Formação breve (uma sessão) e acompanhamento inicial.

**O cliente tem de ter**: domínio, contas (Cloudflare, Supabase, R2, gateway de
pagamento, Resend), textos legais e conteúdos (viaturas/produtos).

## 5.1 Cuidados ao vender

- **RGPD**: ao vender, o cliente passa a ser responsável pelos dados; é preciso
  contrato de subcontratação e política de privacidade própria. Nada é partilhado
  entre clientes.
- **Faturação**: na entrega, a fatura legal é emitida pelo cliente (fora do site);
  o site entrega o comprovativo.
- **Contas no nome do cliente**: domínio, gatways e alojamento sempre do cliente,
  para não haver dependência.
- **Marca**: numa instalação nova, confirmar que nenhum texto menciona "Chikane"
  (checklist da secção 3).
- **Manutenção**: combinar o que fazer quando o Código/serviços mudam.

## 6. Próximos passos

1. **Confirmar a decisão** da secção 2 (recomendação: uma instalação por cliente;
   marca por configuração).
2. Definir o que o cliente (Benimoto?) quer: módulos, cores, domínio.
3. Implementar a camada de marca (tirar "Chikane" do código) — **só com
   autorização explícita**, porque toca em ficheiros de lógica.
4. Melhorar `docs/COLOCAR_NO_AR.md` para "site novo num cliente novo".
5. Criar o manual do backoffice.

> Nada nesta página foi aplicado ao site: serve para decidir antes de implementar.

---

## 7. Caso concreto: Benimoto (Benedita) — o que muda

Informação pública recolhida a 15/10/2026 (site, Facebook e diretórios).

**Quem são**

- Domínio: **benimoto.pt**
- Sede: Estrada Nacional 1, Km 84, 2475-016 Benedita (concelho de Alcobaça,
  distrito de Leiria) · +351 262 920 054 · geral@benimoto.pt
- Segunda loja: R. Infante D. Henrique 13, 2500-852 Caldas da Rainha ·
  +351 262 380 903 · geral.cr@benimoto.pt
- Horário: Seg–Sex 9h–13h e 14h30–19h · Sáb 9h–13h
- Facebook `/Benimoto` · Instagram `benimoto_pt` · YouTube

**O que vendem**

Motos e muito mais: Yamaha, Kawasaki, Suzuki, Can-Am, Sea-Doo, Aprilia,
Piaggio, Vespa, MV Agusta e SYM. Nas categorias: motos, scooters, moto4 (quads),
side-by-side, jet ski (Sea-Doo), ATV, eBikes, golf e veículos de manutenção,
**usados**, serviço de oficina, financiamento e pré-reserva de modelos novos.

**Estado atual do site deles (importante)**

O site é em tecnologia antiga (páginas `.aspx`, do CodeMind.pt) e tem, escrito
na navegação: **“Loja Online — brevemente disponível”**, com a promessa de
“vasta gama de capacetes, vestuário, equipamento e acessórios das melhores
marcas”. Ou seja: **a loja que estamos a definir é exatamente a peça que lhes
falta** — catálogo + loja + conta de cliente + backoffice.

**O que o nosso produto tem de ganhar para os servir**

| Ganho | Hoje | Para servir a Benimoto |
|---|---|---|
| Tipo de veículo | só carros (`vehicles` + `lib/vehicle-catalog.json`) | campo de **tipo** (carro, moto, scooter, quad, ATV, side-by-side, jet ski, eBike) e listas de specs por tipo — **já definido**: `docs/COMPATIBILIDADE_STANDS.md` e `docs/rascunho/ETAPA_2_TIPOS_E_LOCAIS.sql` |
| Localizações | uma morada em `site_settings` | **várias lojas/contactos** (Benedita + Caldas) com horários e contactos próprios — **já definido** na tabela `locations` |
| Categorias da loja | pensadas para carros (peças, detailing, jantes) | capacetes, vestuário, equipamento, acessórios, consumíveis — são **dados**, por isso já serve; é configuração |
| Reservas | test-drive | **marcação de serviço** na oficina |
| Viaturas novas | stock próprio + por encomenda | igual, com **pré-reserva** de modelo novo |
| Idiomas | só português | o site deles tem EN/ES por tradutor; começamos em português |
| Marca | “Chikane” escrito no código (30 ficheiros) | nome, logótipo, cores e imagens por cliente |

**Conclusão**: o produto serve-os sem ser reescrito, desde que (1) a marca saia
do código e (2) as *viaturas* passem a ter um **tipo** configurável. São as duas
coisas a fazer antes de haver um cliente destes.

> Nota: informação pública do site deles. Antes de qualquer contacto ou
> proposta, confirmar o estado atual do site e o que querem (secção 3).

