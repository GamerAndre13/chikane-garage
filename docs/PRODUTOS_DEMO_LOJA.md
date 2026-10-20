# Produtos de demonstração da loja

**Estado:** dados temporários para pré-visualização · **Data:** 20/10/2026

O dono pediu artigos de exemplo para conseguir ver a montra e o backoffice antes
de introduzir o catálogo real. O ficheiro `supabase/loja_produtos_demo.sql`
cria três artigos marcados como demonstração, com imagens próprias e variantes
sem stock. Os preços são ilustrativos; stock zero impede a compra.

Quando os produtos reais estiverem prontos, arquivar ou substituir os exemplos,
atualizar os preços, descrições, referências e fotografias e registar o stock
real no backoffice.

O ficheiro `supabase/veiculos_acessorios_demo.sql` acrescenta duas viaturas novas
e dois acessórios de demonstração ligados aos respetivos modelos. Executa-o no
SQL Editor depois de `supabase/setup.sql`. As viaturas estão identificadas como
demonstração e sem preço; os acessórios têm stock zero e não podem ser comprados.
O formulário de produto permite editar a compatibilidade no formato
`Marca; modelo; ano inicial; ano final; notas`.
