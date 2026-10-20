# Base de dados compatível — carros, motos e várias lojas

> Documento de **definições**. Nada foi alterado no site nem na base de dados.
> O SQL correspondente é o rascunho `docs/rascunho/ETAPA_2_TIPOS_E_LOCAIS.sql`.
> Complementa `docs/PRODUTO_E_MARCA.md` e `docs/MODELO_DADOS_LOJA.md`.

## 1. A regra

> **Uma só base de dados serve um stand de carros e um stand de motos.**
> Mudar de cliente (Chikane → Benimoto) é mudar **dados e layout**, nunca a
> estrutura.

Consequência prática: quando eu disser "isto é configuração", ninguém tem de
escrever SQL novo nem tocar em ficheiros de lógica — entra no backoffice.

## 2. Como se garante isto

1. **Listas na base de dados, não no código**
   - tipos de veículo (`vehicle_types`): carro, moto, scooter, moto4/quad, ATV,
     side-by-side, jet ski, eBike, golf, outro
   - categorias de produto (6 decididas, editáveis)
   - marcas de artigo (`brands`)
   - lojas/localizações (`locations`) — a Benimoto tem 2
   - zonas e preços de portes, cupões, definições da loja
2. **Campos opcionais** em `vehicles`: quando não se aplicam ficam a nulo
   (ex.: `license_category` numa viatura, `drivetrain` num jet ski).
3. **Layouts e marcação** fora da base de dados: é o trabalho da camada de marca
   (`docs/PRODUTO_E_MARCA.md`), que não exige SQL.

## 3. O que é igual e o que muda

| Grupo de campos | Carros | Motos / Scooters | Quads, ATV, SxS, Jet Ski |
|---|---|---|---|
| Identificação (marca, modelo, versão, ano, matrícula/ref.) | igual | igual | igual |
| Estado e visibilidade (disponível, reservado, vendido, 7 dias) | igual | igual | igual |
| Preço, financiamento, retoma, garantia | igual | igual | igual |
| Fotos, vídeo, descrição, destaques | igual | igual | igual |
| Cilindrada `engine_cc` | opcional | **essencial** | essencial (jet ski) |
| Categoria de carta `license_category` | — | A1/A2/A/AM | por vezes B/nenhuma |
| Horas de uso `usage_hours` | — | raramente | jet ski, golf |
| Consumo/CO₂ | igual | igual | igual |
| Tração `drivetrain` | fwd/rwd/awd | normalmente nulo | nulo |
| Transmissão | manual/auto | manual/auto (scooter auto) | auto |
| Livro de revisões, acidentes, nº de donos | igual | igual | igual |
| Origem/legalização (COC, ISV) | igual | igual | conforme o caso |

Novos tipos acrescentam-se na tabela `vehicle_types` — **sem SQL**.

## 4. Dois clientes, a mesma base

| | Chikane (carros) | Benimoto (motos e afins) |
|---|---|---|
| Tipos de veículo ativos | `carro` | `moto`, `scooter`, `moto4`, `atv`, `side_by_side`, `jet_ski`, `ebike`, `golf` |
| Categorias da loja | peças, detailing, jantes, merchandising | capacetes, vestuário, equipamento, acessórios, consumíveis |
| Lojas | 1 | 2 (Benedita, Caldas da Rainha) |
| Marca/cores | Chikane | Benimoto |
| Rotas/páginas | as do catálogo de viaturas | as mesmas, só muda a apresentação |

## 5. O que ainda **não** é só layout (trabalho de código)

Para ser honesto quanto ao "mudar só os layouts":

1. Mostrar o tipo de veículo nos filtros e nas fichas (usar `vehicle_types`).
2. Etiquetas visíveis: "Viaturas" vs "Motos" (camada de marca).
3. Preenchimento automático de especificações: `lib/vehicle-catalog.json` é de
   carros; é preciso um ficheiro equivalente por tipo (ex.: motos) e a escolha
   pelo `vehicle_type`.
4. Adaptar as reservas: hoje "test-drive"; para motos "test-ride"; para uma
   oficina, "marcação de serviço".
5. Renomear o que se chama "carro" no código, se aparecer.

Nada disto muda a estrutura da base de dados — são apresentações/etiquetas. A
estrutura fica já preparada.

## 6. Ficheiros desta definição

- `docs/rascunho/ETAPA_2_TIPOS_E_LOCAIS.sql` — tipos de veículo, colunas novas
  em `vehicles`, tabela `locations`, RLS, permissões e exemplos comentados.
  (Sintaxe validada com o parser real do PostgreSQL.)
- `docs/rascunho/ETAPA_1_LOJA.sql` — a loja (23 tabelas) e a coluna `condition`
  (`new`/`used`) e `sale_type` (`stock`/`on_order`) das viaturas.

## 7. Checklist quando um cliente novo aparecer

1. Criar a instalação (ver `docs/COLOCAR_NO_AR.md`) e correr o `setup.sql`
   com os dois rascunhos já incorporados.
2. Ativar só os tipos de veículo que o cliente vende.
3. Carregar categorias/marcas/lojas/portes e o conteúdo.
4. Vestir a marca (nome, logótipo, cores) — camada de marca.
5. Confirmar que nenhuma etiqueta diz "Chikane".

## 8. Como se prova que é compatível (sem alterar o site)

- Sintaxe dos dois rascunhos validada com o parser real do PostgreSQL.
- Revisão campo a campo: nenhum campo obrigatório é de carro ou de moto
  (o que é específico é opcional/nulo).
- Plano de teste quando for autorizado: criar dados de exemplo de um stand de
  carros e de um stand de motos na mesma base e verificar que:
  - a montra filtra por tipo sem SQL novo;
  - a ficha mostra só os campos que existem;
  - nada quebra com campos a nulo;
  - a Chikane continua com o comportamento igual (default `carro`).

> Nada disto foi aplicado: são dois rascunhos e três documentos de decisão.
