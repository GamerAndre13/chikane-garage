# Guia de layouts

Onde está cada ecrã, onde se mexe **só** no visual e como confirmar que não se
partiu nada.

> ⚠️ **Antes de mexer:** lê as [regras para IA/programadores](REGRAS_PARA_IA.md).
> A regra nº 1 é: **não se altera a lógica**, só layouts, estilo e textos visuais.

---

## 1. Onde está cada ecrã

| Ecrã (no site) | Ficheiro |
|---|---|
| Estrutura global (fontes, metadados, cabeçalho/rodapé) | `app/layout.tsx` |
| Estilos globais, cores e utilitários | `app/globals.css` |
| **Home** (hero, spotlight, catálogo, garagem, processo) | `app/page.tsx` |
| **Catálogo** (filtros + grelha) | `app/catalogo/page.tsx` |
| **Novos** (viaturas novas por encomenda) | `app/novos/page.tsx` |
| **Ficha da viatura** | `app/catalogo/[slug]/page.tsx` |
| **Comprar / pedir proposta** (extras + dados) | `app/comprar/[slug]/page.tsx` (+ `components/ui/vehicle-purchase.tsx`) |
| **Sobre** | `app/sobre/page.tsx` |
| **Contacto** | `app/contacto/page.tsx` |
| **Conta** (entrar / registar) | `app/conta/page.tsx` |
| **Perfil** (dados, favoritos, pedidos) | `app/conta/perfil/page.tsx` |
| Termos e condições | `app/termos-e-condicoes/page.tsx` |
| Política de privacidade | `app/politica-de-privacidade/page.tsx` |
| Página 404 | `app/not-found.tsx` |
| Imagem de partilha (redes sociais) | `app/opengraph-image.tsx` |
| **Backoffice** | `app/admin/` (layout em `app/admin/layout.tsx`, menu em `app/admin/AdminSidebar.tsx`) |
| ↳ Painel inicial | `app/admin/page.tsx` |
| ↳ Viaturas | `app/admin/veiculos/page.tsx` (+ `novo/`, `editar/[id]/`) |
| ↳ Extras (catálogo, fotografia, variantes, categoria e associação a viaturas novas) | `app/admin/veiculos/extras/page.tsx` |
| ↳ Pedidos | `app/admin/pedidos/page.tsx` |
| ↳ Propostas (viaturas novas, desconto e preço final) | `app/admin/propostas/page.tsx` (+ `[id]/`) |
| ↳ Contas | `app/admin/contas/page.tsx` |
| ↳ Estatísticas | `app/admin/analytics/page.tsx` |
| ↳ Definições | `app/admin/definicoes/page.tsx` |

### Componentes reutilizáveis

| Componente | Ficheiro | O que é |
|---|---|---|
| Cabeçalho / menu | `components/layout/header.tsx` | Barra superior e menu móvel |
| Rodapé | `components/layout/footer.tsx` | Contactos, redes, newsletter |
| Botão de cookies | `components/layout/cookie-settings-button.tsx` | Reabrir preferências |
| Grelha do catálogo | `components/ui/catalog-browser.tsx` | Cartões + filtros |
| Configurador + proposta (`/comprar/[slug]`) | `components/ui/vehicle-purchase.tsx` | Extras agrupados por categoria (1 escolha por categoria), resumo sticky e pedido de proposta (formulário no estilo de «Pedir informações») |
| Cartão de viatura (galeria) | `components/ui/vehicle-card-gallery.tsx` | Fotografia em cartão |
| Galeria da ficha | `components/ui/vehicle-detail-gallery.tsx` | Galeria grande |
| Galeria (genérica) | `components/ui/vehicle-gallery.tsx` | Lista de fotos |
| Especificações | `components/ui/vehicle-specifications.tsx` | Ficha técnica |
| Botão de favorito | `components/ui/favorite-button.tsx` | Coração nos cartões |
| Lista de favoritos | `components/ui/favorites-list.tsx` | Favoritos no perfil |
| Meus pedidos | `components/ui/my-requests.tsx` | Pedidos no perfil |
| Escolher fotografias | `components/ui/vehicle-photo-picker.tsx` | Upload no backoffice |
| Animação ao aparecer | `components/ui/reveal.tsx` | Efeito de entrada |
| Linhas decorativas | `components/ui/vgpu-speed-lines.tsx` | Detalhe gráfico |
| Formulário de newsletter | `components/newsletter-form.tsx` | Rodapé |
| Aviso de cookies | `components/cookie-consent.tsx` | Banner + Analytics |

---

## 2. Cores e tipografia (o "tema")

Tudo é definido em `app/globals.css`. **Nunca escrevas cores diretas** (como
`#f47724` ou `text-white`) — usa sempre o nome do token, para o site ficar
coerente.

### Cores

| Token | Valor | Uso típico | Classe Tailwind |
|---|---|---|---|
| `--background` | `#090909` | Fundo principal | `bg-background` |
| `--background-alt` | `#0a0a0a` | Fundo alternativo | `bg-background-alt` |
| `--surface` | `#121110` | Caixas e cartões | `bg-surface` |
| `--surface-mid` | `#141414` | Cartões (tom médio) | `bg-surface-mid` |
| `--surface-raised` | `#1a1917` | Elementos elevados | `bg-surface-raised` |
| `--foreground` | `#f1efed` | Texto principal | `text-foreground` |
| `--muted` | `#99938d` | Texto secundário | `text-muted` |
| `--border` | `#302d2a` | Contornos | `border-border` |
| `--copper` | `#f47724` | **Cor de destaque** (botões, títulos) | `text-copper` / `bg-copper` |
| `--copper-light` | `#ff9145` | Destaque (hover) | `text-copper-light` |
| `--red` | `#a32020` | Avisos, "vendido" | `text-red` |
| `--success` | `#22c55e` | Confirmações | `text-success` |
| `--warning` | `#f59e0b` | Avisos suaves | `text-warning` |

### Tipografia

- **Títulos:** `font-display` (tipo *Oswald*), normalmente com
  `uppercase tracking-[0.2em]` para o ar "premium".
- **Texto corrido:** `font-sans` (tipo *Inter*) — é o tipo predefinido.

### Utilitários próprios

- `clip-chicane` — recorta o canto superior direito (o "notch" de 26px que o
  spotlight e os destaques usam).
- `clip-notch` — recorte mais pequeno (18px), para cartões.

---

## 3. Responsividade

O projeto é **mobile-first**: escreve-se o estilo do telemóvel primeiro e
acrescentam-se adaptações para ecrãs maiores com prefixos.

| Prefixo | Aplica-se a | Nós chamamos-lhe |
|---|---|---|
| *(sem prefixo)* | telemóvel (< 640px) | mobile |
| `sm:` | ≥ 640px | telemóvel grande / tablet |
| `md:` | ≥ 768px | tablet |
| `lg:` | ≥ 1024px | **PC** |

> **Convenção importante:** neste projeto, "PC" começa nos 640px (`sm:`), não nos
> 1024px. O hero e o spotlight foram afinados assim. Ao alterar algo só para
> telemóvel, **não uses `sm:`** (usar `sm:` muda o PC também).

---

## 4. Como alterar com segurança

1. **Identifica o ficheiro** na tabela da secção 1.
2. **Muda só o que é visual:** classes Tailwind (`className`), texto entre tags,
   ordem dos elementos, `div`/`span` de estrutura, ícones.
3. **Não mexas** em nada que leia ou escreva dados (ver secção 5).
4. **Confirma que compila:**
   ```bash
   npx tsc --noEmit
   npx eslint app/page.tsx        # põe o caminho do ficheiro que mexeste
   ```
   Para ver o resultado no ecrã: `npm run dev` → <http://localhost:3000>.
5. Se for uma alteração grande, corre também `npm run build` antes de publicar.

### Publicar

```bash
git add .
git commit -m "Ajuste de layout: <descricao curta>"
git push
```

O Cloudflare republica o site em 5 a 9 minutos. **Não** commites o `.env.local`
nem as notas `.txt`/`.md` da raiz (não fazem parte do site).

---

## 5. O que **não** é layout (não mexer)

Estes ficheiros e linhas fazem o site funcionar. Uma alteração aqui pode apagar
dados, deixar entrar quem não deve, ou partir o pagamento/emails:

| Ficheiro / pasta | Porquê |
|---|---|
| `proxy.ts` | Redirecionamento HTTPS, sessão e a **única** proteção do `/admin` |
| `app/actions/*` | Ações de servidor (autenticação, upload de fotografias) |
| `app/api/**/route.ts` | Endpoints (newsletter, decisões de pedidos) |
| `lib/*` | Lógica: Supabase, R2, visibilidade de viaturas, validações |
| `supabase/setup.sql` | Schema, segurança (RLS), funções e permissões da base de dados (ficheiro único) |
| `app/auth/callback/route.ts` | Confirmação de conta |
| `app/robots.ts`, `app/sitemap.ts` | SEO técnico |
| `next.config.ts`, `wrangler.toml`, `package.json` | Configuração do site |

**Dentro das páginas** (`app/**/page.tsx`) há visual **e** lógica no mesmo
ficheiro. Só podes mexer no `return (...)` (o que se vê). Não mexas em nada
parecido com:

```ts
supabase.from("vehicles").select("*")     // consultas à base de dados
const { data: { user } } = await supabase.auth.getUser()   // sessão
if (!profile || profile.role !== "admin") redirect("/conta")  // controlo de acesso
revalidatePath("/catalogo")               // atualização de cache
createClient()                            // ligação à base de dados
```

Em caso de dúvida: **pergunta antes de mexer**.

---

Voltar ao [README](../README.md) · Ver [pôr o site no ar](COLOCAR_NO_AR.md) ·
Ver [variáveis de ambiente](VARIAVEIS_AMBIENTE.md) ·
Ver [regras para IA](REGRAS_PARA_IA.md)

*Última atualização: 2026-10-14.*
