# Matriz de testes do Chikane Garage

Esta matriz descreve os percursos e classes de dados que devem ser exercitados. Os testes automáticos existentes estão em `tests/unit/` e `tests/e2e/`; os fluxos que criam/alteram dados precisam de um projeto Supabase e um Worker de staging isolados. Nunca usar produção nem dados reais de clientes.

## Cobertura automatizada local

| Área | Casos válidos | Casos inválidos, limites e indisponibilidade | Estado |
|---|---|---|---|
| Validações de contacto | nome, email comum, telemóvel nacional/internacional, mensagem nos limites | vazio, comprimentos abaixo/acima, formato inválido, sugestão de domínio, telefone fixo, NIF inválido, número não finito, min/max, slug malformado, protocolo inseguro | Vitest |
| Opções de viatura | capitalização, merge de cores/equipamento, país por nome/código, motor X.X | duplicados com caixa/acentos, país desconhecido/vazio, motor incompleto/caracteres extra | Vitest |
| Cargos e backoffice | permissões de admin/editor/vendas nas áreas permitidas | cliente, cargo desconhecido/nulo e áreas proibidas | Vitest (matriz de permissões) |
| Etiquetas e visibilidade | novidade até 4 dias, reservado, usado/novo | fronteira temporal, vendido/novo, data inválida/ausente, arquivado e venda após 7 dias | Vitest em `vehicle-badges` e `vehicle-visibility` |
| Extras | variante ativa mais barata e desempate por posição | extra sem variantes, variante inativa, id sem correspondência | Vitest |
| Links/avatares | Maps configurado/pesquisa, links sociais em URL/domínio/identificador, seleção estável | dados vazios, URL vazia, telefone sem dígitos, pool ausente/vazio | Vitest |
| Tentativas de login | contagem, bloqueio ao 5.º erro, expiração, limpeza e formatação | email vazio/case diferente, armazenamento ausente, JSON inválido/quota | Vitest |
| Jornada pública | homepage → catálogo → contacto; preencher sem submeter | validação visual de campos obrigatórios e navegação básica | Playwright em staging |

## Matriz funcional para staging e revisão manual

| Ecrã/funcionalidade | Caminhos a executar | Caminhos negativos e limites | Pré-requisito seguro |
|---|---|---|---|
| Home, navegação, rodapé e cookies | links do cabeçalho/rodapé, menu móvel, aceitar/rejeitar/reabrir preferências | largura móvel, sem conteúdo CMS, recarregar após escolha | Staging publicado |
| Catálogo e filtros | combinar marca, modelo, preço, ano, quilómetros, combustível, ordenação e limpar filtros | nenhum resultado, limites invertidos, pesquisa sem correspondência, catálogo vazio | Viaturas fictícias no staging |
| Ficha da viatura e galeria | abrir cada imagem, especificações, semelhantes, CTA | slug inexistente, sem imagens, reservada/vendida/arquivada, dados opcionais vazios | Dados de teste |
| Pedido de informação / test-drive / reserva | submeter cada formulário com valores válidos e verificar confirmação | obrigatórios vazios, email/telefone inválidos, datas/horas indisponíveis, token expirado/reutilizado | Email e tabelas de staging; usar destinatário de QA |
| Compra de viatura nova / extras | escolher uma variante por categoria, verificar totais, enviar proposta | nenhuma seleção, trocar variante, variante inativa, valores/preços ausentes, submissão repetida | Viatura nova e extras fictícios |
| Campanhas e páginas legais | lista/detalhe, CTA, imagens; ler termos e privacidade | slug inexistente, campanha inativa/sem imagem, conteúdo opcional ausente | Campanhas de teste |
| Conta e autenticação | registo, confirmação, login, logout, recuperação/retorno de sessão, OAuth se configurado | password curta/incorreta, email inválido/duplicado, bloqueio local, callback inválido | Utilizadores descartáveis e URL OAuth de staging |
| Perfil | editar dados/avatar, password, favoritos, pedidos, pedido/cancelamento de eliminação | não autenticado, campo inválido, falha de rede, item removido, cancelar confirmação | Conta descartável; confirmar que email não envia para cliente |
| Backoffice: acesso | entrar como cada cargo; confirmar menu e páginas permitidas | anónimo, cliente, editor/vendas a abrir URL proibido, sessão expirada | Contas admin/editor/vendas dedicadas em staging |
| Backoffice: viaturas e fotografias | criar/editar, características, extras, destaque, fotos e capa | campos inválidos, ficheiro inválido/grande, falha R2, apagar/cancelar, IDs inexistentes | Bucket R2 separado de produção e imagens sem dados pessoais |
| Backoffice: extras/campanhas | CRUD, variantes, associação, várias fotos, ativar/desativar | nome/preço vazio, duplicado, associações vazias/inválidas, upload falhado | Staging isolado |
| Backoffice: pedidos, propostas e contas | atualizar estado, responder, proposta/desconto/preço final, alterar cargos | pedido/proposta inexistente, valor negativo/limites, falha de email, tentativa sem autorização | Emails capturados em ambiente QA; contas descartáveis |
| Definições, newsletter e analytics | alterar contactos/redes/textos/fotos; consentimento controla GA; inscrição de QA | URL inválido, email malformado/duplicado, consentimento revogado, configuração ausente | Resend sandbox/captura; nunca enviar campanhas reais |
| APIs, RLS e segurança | testar anónimo, cargo permitido, cargo proibido, payload válido e inválido em cada endpoint | JSON malformado, método errado, body em falta, ID/token inválido, repetição, rate limit | Só staging. Verificação read-only de RLS em workflow |
| Responsividade/acessibilidade | mobile/tablet/desktop, teclado, foco, leitores de ecrã, zoom e reduced motion | overflow, foco perdido, labels ausentes, contraste, imagens sem texto alternativo | Playwright + revisão manual |

## O que não é finito nem está coberto por uma afirmação de exaustividade

Não existe um conjunto finito que teste todas as combinações de texto, datas, imagens, browsers, tamanhos de ecrã, falhas de rede e estados externos. A matriz usa casos representativos, fronteiras e classes de equivalência. Os fluxos de escrita, email, OAuth, R2, permissões reais, RLS e upload não devem ser executados contra produção; requerem credenciais/serviços dedicados de staging. Casos “impossíveis” são cobertos como entradas inválidas, estados não autorizados, IDs/tokens inexistentes e dependências indisponíveis.

## Execução

- Unitários: `npm test`
- Tipos: `npm run typecheck`
- E2E: definir `STAGING_BASE_URL` para HTTPS de staging e executar `npm run test:e2e`
- QA/segurança/staging: seguir `docs/QUALITY_ASSURANCE.md` e os workflows aplicáveis.
