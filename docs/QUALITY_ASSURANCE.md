# Guia de configuração da qualidade e testes

Este guia explica como preparar os ambientes e usar os controlos automáticos do
Chikane Garage. Faz os passos pela ordem indicada. As verificações remotas devem
usar um staging isolado; nunca uses a base de dados nem o domínio de produção
para testes, Lighthouse ou carga.

## O que fica preparado

- **Qualidade**: TypeScript, 6 testes unitários, lint focado nos ficheiros de QA
  e build Next.js com Webpack. Corre em cada pull request e push para `main`.
- **Segurança**: auditoria das dependências, CodeQL e revisão de dependências.
  Corre em pull requests, push para `main`, semanalmente e manualmente.
- **Staging**: verifica a API/RLS do Supabase de staging e percorre páginas
  públicas com Playwright. Preenche o formulário de contacto sem o submeter.
- **Lighthouse**: executa três medições do site de staging e guarda o relatório.
- **Carga k6**: execução manual protegida por confirmação e aprovação. Faz
  pedidos GET à homepage, sem iniciar sessão nem submeter formulários.

Os relatórios ficam na execução correspondente em **Actions → execução →
Artifacts**. Playwright conserva-os 7 dias; Lighthouse e k6, 14 dias. Os horários
automáticos estão em UTC.

## 1. Criar um projeto Supabase de staging

1. Abre o [dashboard Supabase](https://supabase.com/dashboard) e cria um projeto
   novo, separado do projeto de produção. Escolhe uma região adequada, define
   uma palavra-passe própria e guarda-a num gestor de palavras-passe.
2. Não copies a base de dados de produção nem dados de clientes. Este staging
   serve para testar schema, políticas e páginas públicas.
3. No projeto novo, abre **SQL Editor**, cria uma query e copia o conteúdo de
   `supabase/setup.sql`. Executa-o apenas neste projeto novo. Esse ficheiro é a
   origem do schema, políticas RLS e conteúdo inicial do CMS.
4. `supabase/seed.sql` é opcional: acrescenta carros de demonstração. Os testes
   incluídos não precisam desses carros; podes executar o seed se quiseres
   validar o catálogo com exemplos.
5. Em **Project Settings → API** (ou **API Keys**, conforme a versão do
   dashboard), copia o **Project URL** e a chave pública **Publishable** que
   começa por `sb_publishable_`. Se o projeto ainda só mostrar a chave antiga
   `anon`, essa também é aceite. Nunca uses `service_role`, `secret` ou uma
   chave privada nos workflows. As chaves antigas `anon`/`service_role` estão
   em transição para as novas chaves públicas/secretas; consulta a
   [documentação atual das chaves Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
6. A aplicação não precisa de autenticação para os percursos Playwright atuais.
   Se também quiseres testar login, configura depois os URLs de redirecionamento
   de Auth para o endereço workers.dev do staging e os caminhos de callback que
   a aplicação utiliza.

O script de verificação consulta `site_content` para confirmar que a chave e o
schema estão acessíveis e tenta ler `profiles`, `favorites`,
`newsletter_subscribers`, `contact_requests`, `test_drives` e `reservations`.
Uma tabela privada só passa se a leitura anónima for bloqueada ou devolver zero
registos. O script não escreve dados.

## 2. Criar o site Worker de staging

O repositório tem configuração de produção e agora também uma configuração
isolada em `wrangler.staging.toml`. Esta cria o Worker
`chikane-garage-staging`, sem ligação ao bucket R2 de produção. O staging não
terá uploads funcionais até existir um bucket R2 próprio e separado; os testes
incluídos não fazem uploads.

1. No [Cloudflare Dashboard](https://dash.cloudflare.com/), abre **Workers &
   Pages → Create → Workers Builds** e liga o repositório GitHub
   `GamerAndre13/chikane-garage` (o nome pode variar ligeiramente na interface).
2. Configura um Worker de staging com o nome `chikane-garage-staging`, associado
   ao ramo `main`. Confirma que a configuração usada é
   `wrangler.staging.toml`, e não `wrangler.toml`.
3. Usa estes comandos de build e publicação:

   ```text
   Build command: npx opennextjs-cloudflare build --config=wrangler.staging.toml
   Deploy command: npx opennextjs-cloudflare deploy --config=wrangler.staging.toml
   ```

4. Em **Settings → Variables and Secrets** do Worker de staging, define as
   variáveis de build seguintes com os valores do projeto Supabase de staging:

   | Nome | Valor |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase de staging |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave Publishable `sb_publishable_...` ou chave `anon` de staging |
   | `NEXT_PUBLIC_SITE_URL` | URL HTTPS workers.dev do staging, sem `/` no fim |

5. Faz o primeiro build e abre o URL `workers.dev` mostrado no Worker. Se ainda
   não souberes esse URL ao configurar `NEXT_PUBLIC_SITE_URL`, faz o primeiro
   build com o URL previsível indicado pela Cloudflare, corrige a variável e
   volta a publicar.
6. Confirma manualmente que a homepage abre e que o Worker de staging aparece
   separado do Worker `chikane-garage1` de produção. A ligação ao repositório
   pode publicar automaticamente cada atualização do ramo configurado.

Se já criaste o Worker `chikane-garage-tester`, podes usá-lo como destino de
staging: define `STAGING_BASE_URL` com o seu URL workers.dev no passo 3. Criar
um Worker na Cloudflare, por si só, não cria uma verificação com o nome dele no
GitHub. O check **Workers Builds: nome-do-worker** só aparece quando esse Worker
está ligado ao repositório através de Workers Builds. O workflow GitHub
**Verificações de staging** testa o URL definido em `STAGING_BASE_URL`; corre em
pull requests, manualmente e diariamente, não em cada push para `main`.

Consulta a [configuração de builds Cloudflare Workers](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
as [regras de ramos e previews](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
e a [CLI OpenNext para Cloudflare](https://opennext.js.org/cloudflare/cli) se os
rótulos do dashboard tiverem mudado.

## 3. Adicionar as variáveis no GitHub

No repositório GitHub, abre **Settings → Secrets and variables → Actions →
Variables → New repository variable**. Adiciona estes cinco valores:

| Nome | Conteúdo |
|---|---|
| `STAGING_BASE_URL` | URL HTTPS do Worker workers.dev de staging |
| `STAGING_SUPABASE_URL` | Project URL Supabase de staging |
| `STAGING_SUPABASE_ANON_KEY` | Publishable key `sb_publishable_...` (ou chave `anon`) de staging |
| `PRODUCTION_BASE_URL` | `https://chikanegarage.blog` |
| `PRODUCTION_SUPABASE_URL` | Project URL do Supabase de produção, sem qualquer chave |

Apesar do nome histórico `STAGING_SUPABASE_ANON_KEY`, a variável aceita também
a chave Publishable atual. A Publishable é uma chave pública; a segurança dos
dados depende das políticas RLS. Não coloques `service_role`, `secret`, palavras-
passe ou tokens nestas variáveis. A variável de produção é apenas o URL, usado
para confirmar que o staging aponta para projetos e domínios diferentes.

O workflow de staging só executa as verificações quando as variáveis de staging
e produção estão todas definidas. Preenche-as antes de ativar verificações
obrigatórias no ramo.

## 4. Proteger a execução de testes de carga

Faz este passo antes de abrir o workflow de carga. Se uma execução mencionar um
ambiente inexistente, o GitHub pode criá-lo sem as proteções esperadas.

1. Abre **Settings → Environments → New environment** no GitHub.
2. Cria o ambiente com o nome exato `staging-load-test`.
3. Em **Required reviewers**, escolhe uma pessoa que possa verificar se o
   staging está isolado e se a execução está autorizada. Ativa a proibição de
   autoaprovação, se a opção estiver disponível.
4. Guarda. Antes de cada carga, confirma orçamento e limites de utilização na
   Cloudflare e Supabase. O cenário chega a 1000 utilizadores virtuais por
   etapas, mas só faz GET à homepage: não mede login, submissões, uploads, nem
   prova por si só que o site suporta 1000 utilizadores reais.

O GitHub explica os [ambientes, revisores e variáveis de deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## 5. Publicar os workflows QA

Os workflows só aparecem no GitHub depois de os ficheiros desta alteração
estarem no repositório. Revê as alterações e publica-as através de um pull
request para `main`. Depois da integração, o Worker de produção ligado ao ramo
`main` poderá publicar automaticamente; a configuração QA de staging usa outro
nome de Worker e não altera os bindings de produção.

No separador **Actions**, confirma que aparecem os workflows **Qualidade**,
**Segurança**, **Verificações de staging**, **Lighthouse em staging** e **Carga
k6 em staging**. Abre cada execução para ler o resultado e os logs.

## 6. Ativar proteção de `main`

Primeiro configura as variáveis e deixa cada workflow correr pelo menos uma vez.
Depois abre **Settings → Rules → Rulesets** (ou **Settings → Branches**), cria
uma regra para `main` e ativa a exigência de pull request e de verificações de
estado concluídas. Seleciona os nomes apresentados pelo GitHub, que deverão
corresponder a:

- `Qualidade / qualidade`
- `Segurança / dependencias`
- `Segurança / Análise CodeQL`
- `Segurança / revisao-dependencias`
- `Verificações de staging / verificar`

O job de staging é ignorado se faltarem variáveis, por isso não o tornes
obrigatório até todas estarem configuradas. A Dependency Review só tem resultado
em pull requests.

Depois da atualização segura do Next.js e de dependências transitivas, a última
auditoria encontrou 9 vulnerabilidades moderadas e nenhuma alta ou crítica;
`npm audit --audit-level=high` passou. As moderadas restantes incluem `glob` e
`minimatch` no OpenNext e nas ferramentas de lint. O `npm audit fix --force`
sugere um downgrade incompatível do OpenNext, por isso não o uses como correção.
A regra de proteção de branches está descrita
na [documentação GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

O workflow CodeQL usa configuração avançada e precisa de Code Scanning ativado
no repositório. Abre **Settings → Advanced Security → CodeQL analysis → Set up
→ Advanced**. Não mudes para configuração Default enquanto este workflow avançado
estiver ativo: a configuração Default substitui o workflow personalizado. A
[documentação GitHub sobre configuração avançada](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning)
explica os requisitos de acesso.

## 7. Usar cada verificação

### Qualidade

Corre automaticamente em pull requests e push para `main`. Verifica tipos,
testes unitários de visibilidade de veículos, lint dos ficheiros de QA e build
com valores Supabase fictícios. Não precisa das chaves reais. O relatório JUnit
fica no artefacto `relatorio-testes-unitarios`.

### Segurança

Corre em push, pull request, semanalmente (segunda-feira, 05:31 UTC) e a pedido.
Abre a execução **Segurança** para consultar o `npm audit`, CodeQL e revisão de
dependências. A auditoria com as vulnerabilidades acima pode falhar; CodeQL e
Dependency Review são verificações separadas.

### Staging / Playwright / RLS

Corre em pull request, diariamente (04:17 UTC) e a pedido. O Playwright visita a
homepage, o catálogo e a página de contacto, sem submeter o formulário. A
verificação RLS usa apenas a chave pública e lê as tabelas indicadas no passo 1.
Os traces, capturas e vídeo de falhas ficam no artefacto
`relatorio-playwright-staging`.

O workflow usa o endereço estável de `STAGING_BASE_URL`. Portanto, para testar
uma versão específica de pull request, essa versão tem de estar publicada nesse
endereço primeiro; o workflow não descobre automaticamente endereços preview
temporários.

Para executar esse workflow sem um pull request, abre **Actions → Verificações
de staging → Run workflow** e seleciona `main`. Se o job não aparecer ou for
ignorado, confirma primeiro as cinco variáveis do passo 3.

### Lighthouse

Corre à segunda-feira às 04:41 UTC ou manualmente. No GitHub, abre **Actions →
Lighthouse em staging → Run workflow** e escolhe o ramo `main`. Guarda três
medições e o relatório no artefacto `lighthouse-staging`. O workflow fornece
medições para análise; não define um limite mínimo de pontuação.

### Carga k6

Abre **Actions → Carga k6 em staging → Run workflow**, seleciona `main` e
escreve exatamente `TESTAR-STAGING-ATE-1000` no campo de confirmação. Inicia a
execução; o GitHub aguarda a aprovação de um revisor do ambiente
`staging-load-test`. Só aproves depois de confirmar que URLs e recursos estão
isolados. A rampa faz GET à homepage e mede erro abaixo de 2% e p95 abaixo de 2
segundos. O resumo fica em `relatorio-k6-staging`. Uma falha de threshold indica
que as metas não foram cumpridas nesse ensaio; uma aprovação não equivale a um
teste completo de todas as jornadas ou a uma garantia de capacidade em produção.

## 8. Executar verificações localmente

Na pasta do projeto, usa PowerShell:

```powershell
npm ci
npm run typecheck
npm test
npx eslint vitest.config.mts playwright.config.ts tests/unit/vehicle-visibility.test.ts tests/e2e/public-journeys.spec.ts scripts/check-staging-supabase.mjs
npx next build --webpack
```

O build local precisa de `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente. Usa valores públicos de staging;
não precisas de uma chave secreta para compilar. Para correr Playwright
localmente, instala o Chromium uma vez e define o URL de staging na sessão:

```powershell
npx playwright install chromium
$env:STAGING_BASE_URL = "https://o-teu-worker.workers.dev"
npm run test:e2e
```

Para apagar a variável da sessão PowerShell, executa
`Remove-Item Env:STAGING_BASE_URL`. O teste não submete o formulário.

Para validar a RLS localmente, define na sessão PowerShell as cinco variáveis
`STAGING_BASE_URL`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`,
`PRODUCTION_BASE_URL` e `PRODUCTION_SUPABASE_URL`, e executa:

```powershell
node scripts/check-staging-supabase.mjs
```

Não corras o teste de carga manualmente contra produção. O workflow é o caminho
preparado, pois valida a confirmação, compara os endereços com produção e exige
aprovação do ambiente.

## Resolução rápida de problemas

- **Staging falha na tabela `site_content`**: confirma Project URL, chave
  pública, `supabase/setup.sql` e permissões da API.
- **Uma tabela privada devolve linhas**: pára os testes e revê imediatamente as
  políticas RLS no projeto de staging antes de guardar dados reais ali.
- **Playwright não liga**: abre `STAGING_BASE_URL` no browser, confirma HTTPS e
  verifica se o deploy Cloudflare terminou.
- **Staging não reflete a alteração do pull request**: publica a versão no URL
  estável configurado ou executa o workflow depois de atualizar o Worker.
- **Build Cloudflare não encontra ficheiros**: confirma que o build e deploy
  apontam para `wrangler.staging.toml` e que `NODE_VERSION` é 22.
- **Carga não inicia**: confirma o ambiente `staging-load-test`, a aprovação
  pendente, a frase exata e que os URLs de staging e produção são distintos.
