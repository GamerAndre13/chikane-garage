# Segurança — o que já existe e o que fica na borda

Documento de apoio à vaga de tarefas (`Tarefas.txt`, secção de segurança).
Resume o que a aplicação já faz hoje, o que é responsabilidade do Supabase Auth
e o que só se resolve na Cloudflare. Não altera código.

## 1. O que a aplicação já garante

| Área | Como está |
| --- | --- |
| HTTPS | `proxy.ts` redireciona qualquer pedido `http:` para `https:` com 308 antes de chegar às páginas. |
| Sessão | Cookies de sessão do Supabase (HttpOnly, geridos pela biblioteca); o `proxy.ts` renova-os em cada pedido. |
| Backoffice | O `proxy.ts` é o único ponto que valida `/admin`: exige `supabase.auth.getUser()` e `profiles.role === 'admin'`; caso contrário volta ao login. |
| Server actions e rotas de API | `proxy.ts` só guarda carregamentos de página, por isso cada ação (`app/actions/*`, `app/api/**/route.ts`) volta a verificar o utilizador e o papel antes de escrever. |
| Base de dados | Todas as tabelas têm RLS ligada (`supabase/setup.sql`). A chave usada no site é a **anon**; não existe service-role no código da aplicação. |
| Escritas de admin | As políticas de escrita exigem `EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')`. |
| Limites do lado do Supabase | O login e o envio de emails de autenticação já são limitados pelo Supabase Auth; a interface traduz `rate limit`/`too many requests` para «Demasiadas tentativas. Espera um pouco e tenta novamente.» |

## 2. O que é do Supabase Auth (não é código nosso)

- **Hash de passwords**: é feito pelo GoTrue (Supabase Auth) com BCrypt e
  `work factor` definido do lado do serviço. Não há hashing na aplicação, logo
  não há aqui nenhum parâmetro de custo para afinar.
- **Tokens**: JWT assinados pelo projeto; a renovação é feita pela biblioteca
  do Supabase no `proxy.ts`.
- **Bloqueios por tentativas**: também do lado do Supabase Auth, não da app.

Consequência prática: o guia fala em reduzir o custo do BCrypt e em validar
antes de calcular o hash. Isso não se aplica a este stack — não somos nós que
corremos o BCrypt.

## 3. O que só se resolve na borda (Cloudflare)

O site de produção corre como Worker `chikane-garage1` com o domínio
`chikanegarage.blog`, portanto quem vê o TLS primeiro é a Cloudflare.

1. **TLS fingerprinting** — a Cloudflare já termina o TLS; a classificação de
   bots por assinatura TLS (JA3/JA4) faz parte do Bot Management, disponível em
   planos pagos. Não é configurável a partir do repositório.
2. **Risk-based routing** — o equivalente prático aqui é:
   - *Bot Fight Mode* ligado para o domínio;
   - regras de *Rate limiting* nas rotas sensíveis (`/auth/*`, `/api/proposals/*`,
     `/api/newsletter/*`, `/contacto`);
   - *Turnstile* no formulário de contacto e no login, se o abuso aparecer.
3. **Short-circuit de tráfego confirmado como bot** — regra de WAF a devolver
   403/401 sem chegar ao Worker. Também do lado da Cloudflare.

Nada disto está ligado hoje; nenhuma destas mudanças se faz por commit.

## 4. Se quiseres avançar na Cloudflare

Ordem sugerida, do mais barato para o mais invasivo:

1. Confirmar que o domínio está com o proxy laranja da Cloudflare ligado.
2. Ligar *Bot Fight Mode* (gratuito) e observar durante uma semana.
3. Criar regras de *Rate limiting*: 10 pedidos/minuto por IP em `/auth/*` e
   `/api/*`, com bloqueio de 10 minutos.
4. Só se aparecer spam real: Turnstile no contacto e no login (obriga a mexer
   nos formulários e a validar o token no servidor — já é alteração de lógica,
   precisa de autorização).
