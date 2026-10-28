-- ============================================================
-- SEED 023: DADOS DE TESTE — VIATURAS USADAS, NOVAS E EXTRAS
-- ============================================================
-- Correr DEPOIS de:
--   1. supabase/021_add_sale_type_and_proposals.sql  (coluna sale_type)
--   2. supabase/022_add_vehicle_extras.sql           (catálogo de extras)
--
-- Idempotente: pode ser re-executado sem duplicar registos.
--   • viaturas       → ON CONFLICT (slug) DO NOTHING
--   • equipamento    → apagado e reinserido por viatura
--   • extras         → inseridos só se ainda não existir o mesmo nome
--   • extras/viatura → apagados e reinseridos por viatura
--
-- As viaturas ficam sem fotografias (adiciona-as no backoffice, em
-- Viaturas → Editar → Fotografias). As marcas/modelos são BMW porque
-- lib/vehicle-catalog.json só tem modelos preenchidos para a BMW — assim
-- os formulários de edição abrem com a marca e o modelo certos.
-- ============================================================

-- ------------------------------------------------------------
-- 1. VIATURAS USADAS (sale_type = 'used')
-- ------------------------------------------------------------
INSERT INTO public.vehicles (
  slug, reference_code, brand, model, trim,
  registration_year, registration_month, status, sale_type,
  engine, power_hp, torque_nm, transmission, drivetrain,
  body_style, fuel_type, combined_consumption, co2_emissions,
  exterior_color, interior_color, mileage_km,
  previous_owners, service_book, accident_history,
  origin, origin_country, coc_confirmed, isv_paid,
  price, financing_available, warranty_months, trade_in_accepted,
  description, is_featured
) VALUES
  (
    'bmw-430d-xdrive-2022', 'CG-001', 'BMW', '430d xDrive', 'M Sport',
    2022, 5, 'available', 'used',
    '3.0d', 265, 620, 'automatic', 'awd',
    'Coupé', 'diesel', 6.2, 163,
    'Azul Portimão', 'Pele preta', 38500,
    1, 'full_dealer', false,
    'national', 'Portugal', true, true,
    62900, true, 12, true,
    'Coupé 430d xDrive com pack M Sport, jantes 20" e interior em pele. Livro de revisões completo na marca, sempre em garagem fechada.', true
  ),
  (
    'bmw-x5-40d-2021', 'CG-002', 'BMW', 'X5 40d', 'xLine',
    2021, 9, 'reserved', 'used',
    '3.0d', 340, 700, 'automatic', 'awd',
    'SUV', 'diesel', 7.4, 194,
    'Preto Safira', 'Pele castanha', 74000,
    1, 'full', false,
    'imported', 'Alemanha', true, true,
    71500, true, 12, true,
    'X5 40d com teto panorâmico, bancos aquecidos e assistência à condução Plus. Importado da Alemanha com ISV pago e COC confirmado.', false
  ),
  (
    'bmw-330d-2020', 'CG-003', 'BMW', '330d', 'Sport Line',
    2020, 3, 'available', 'used',
    '3.0d', 265, 620, 'automatic', 'rwd',
    'Sedan', 'diesel', 5.6, 149,
    'Branco Alpino', 'Pele preta', 96500,
    2, 'partial', false,
    'national', 'Portugal', true, true,
    44900, true, 6, true,
    '330d com caixa automática, navegação e câmara traseira. Revisões feitas em oficina independente, com faturas.', false
  ),
  (
    'bmw-520d-2019', 'CG-004', 'BMW', '520d', 'Business',
    2019, 11, 'sold', 'used',
    '2.0d', 190, 400, 'automatic', 'rwd',
    'Sedan', 'diesel', 4.9, 128,
    'Cinzento Grafite', 'Pele preta', 118000,
    2, 'full', false,
    'national', 'Portugal', true, true,
    32500, true, 6, true,
    '520d Business vendido recentemente — fica visível no site durante 7 dias como referência de preço.', false
  )
ON CONFLICT (slug) DO NOTHING;

-- Data de venda do 520d: 2 dias atrás, para testar a janela de 7 dias
-- em que as viaturas vendidas continuam visíveis (isVehiclePubliclyVisible).
UPDATE public.vehicles
SET sold_at = NOW() - INTERVAL '2 days'
WHERE slug = 'bmw-520d-2019'
  AND sale_type = 'used'
  AND sold_at IS NULL;

-- Reserva do X5 termina daqui a 3 dias (o expire_reservations liberta-a depois).
UPDATE public.vehicles
SET reserved_until = NOW() + INTERVAL '3 days'
WHERE slug = 'bmw-x5-40d-2021'
  AND status = 'reserved';

-- ------------------------------------------------------------
-- 2. VIATURAS NOVAS POR ENCOMENDA (sale_type = 'new')
-- ------------------------------------------------------------
INSERT INTO public.vehicles (
  slug, reference_code, brand, model, trim,
  registration_year, registration_month, status, sale_type,
  engine, power_hp, torque_nm, transmission, drivetrain,
  body_style, fuel_type, combined_consumption, co2_emissions,
  exterior_color, interior_color, mileage_km,
  previous_owners, service_book, accident_history,
  origin, origin_country, coc_confirmed, isv_paid,
  price, financing_available, warranty_months, trade_in_accepted,
  description, is_featured
) VALUES
  (
    'bmw-x3-30d-2026', 'CG-N01', 'BMW', 'X3 30d', 'M Sport',
    2026, 1, 'available', 'new',
    '3.0d', 265, 620, 'automatic', 'awd',
    'SUV', 'diesel', 6.8, 178,
    'Verde Mamba', 'Pele preta', 0,
    0, 'full_dealer', false,
    'imported', 'Alemanha', true, false,
    78900, true, 24, true,
    'X3 30d novo, por encomenda, com pack M Sport. Prazo de entrega de 8 a 12 semanas — configura os extras e gera a proposta.', false
  ),
  (
    'bmw-530d-xdrive-2026', 'CG-N02', 'BMW', '530d xDrive', 'M Sport Pro',
    2026, 1, 'available', 'new',
    '3.0d', 265, 620, 'automatic', 'awd',
    'Sedan', 'diesel', 6.1, 161,
    'Preto Safira', 'Pele castanha', 0,
    0, 'full_dealer', false,
    'imported', 'Alemanha', true, false,
    92400, true, 24, true,
    '530d xDrive por encomenda com M Sport Pro, faróis laser e suspensão adaptativa. Entrega prevista para 10 a 14 semanas.', false
  ),
  (
    'bmw-x1-20d-2026', 'CG-N03', 'BMW', 'X1 20d', 'xLine',
    2026, 1, 'available', 'new',
    '2.0d', 190, 400, 'automatic', 'fwd',
    'SUV', 'diesel', 5.4, 142,
    'Branco Alpino', 'Pele preta', 0,
    0, 'full_dealer', false,
    'imported', 'Alemanha', true, false,
    52900, true, 24, true,
    'X1 20d xLine novo e por encomenda. Boa opção de entrada na gama, com consumos baixos e equipamento generoso.', false
  )
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 3. EQUIPAMENTO (vehicle_features) DAS VIATURAS DE TESTE
-- ------------------------------------------------------------
DELETE FROM public.vehicle_features
WHERE vehicle_id IN (
  SELECT id FROM public.vehicles WHERE slug IN (
    'bmw-430d-xdrive-2022', 'bmw-x5-40d-2021', 'bmw-330d-2020', 'bmw-520d-2019',
    'bmw-x3-30d-2026', 'bmw-530d-xdrive-2026', 'bmw-x1-20d-2026'
  )
);

INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT v.id, f.label
FROM public.vehicles v
JOIN (VALUES
  ('bmw-430d-xdrive-2022', 'Jantes 20" M'),
  ('bmw-430d-xdrive-2022', 'Bancos desportivos aquecidos'),
  ('bmw-430d-xdrive-2022', 'Head-up display'),
  ('bmw-430d-xdrive-2022', 'Câmara 360º'),

  ('bmw-x5-40d-2021', 'Teto panorâmico'),
  ('bmw-x5-40d-2021', 'Bancos em pele ventilados'),
  ('bmw-x5-40d-2021', 'Suspensão pneumática'),
  ('bmw-x5-40d-2021', 'Assistência à condução Plus'),

  ('bmw-330d-2020', 'Navegação Professional'),
  ('bmw-330d-2020', 'Câmara traseira'),
  ('bmw-330d-2020', 'Sensores de estacionamento'),

  ('bmw-520d-2019', 'Estofos em pele'),
  ('bmw-520d-2019', 'Cruise control'),

  ('bmw-x3-30d-2026', 'Pack M Sport'),
  ('bmw-x3-30d-2026', 'Teto panorâmico'),
  ('bmw-x3-30d-2026', 'Bancos desportivos'),

  ('bmw-530d-xdrive-2026', 'M Sport Pro'),
  ('bmw-530d-xdrive-2026', 'Faróis laser'),
  ('bmw-530d-xdrive-2026', 'Suspensão adaptativa'),

  ('bmw-x1-20d-2026', 'xLine'),
  ('bmw-x1-20d-2026', 'Portão elétrico'),
  ('bmw-x1-20d-2026', 'Apple CarPlay')
) AS f(slug, label) ON f.slug = v.slug;

-- ------------------------------------------------------------
-- 4. CATÁLOGO DE EXTRAS (partilhado) — vehicle_extra_catalog
-- ------------------------------------------------------------
INSERT INTO public.vehicle_extra_catalog (name, description, price, position, is_active)
SELECT v.name, v.description, v.price, v.position, true
FROM (VALUES
  ('Jantes de liga leve', 'Escolhe o diâmetro e o desenho das jantes.', 0, 1),
  ('Pintura metalizada', 'Cores com pintura metalizada de fábrica.', 0, 2),
  ('Teto panorâmico', 'Teto panorâmico em vidro com cortina elétrica.', 1750, 3),
  ('Pack M Sport', 'Interior e exterior com acabamento M Sport.', 2300, 4),
  ('Travões M Sport', 'Discos e pinças M Sport de maiores dimensões.', 2900, 5),
  ('Bancos desportivos em pele', 'Bancos desportivos com regulação elétrica.', 1450, 6),
  ('Assistência à condução Plus', 'Cruise control adaptativo com centragem de faixa.', 1150, 7)
) AS v(name, description, price, position)
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_extra_catalog c WHERE c.name = v.name
);

-- ------------------------------------------------------------
-- 5. VARIANTES DE CADA EXTRA — vehicle_extra_variants
-- ------------------------------------------------------------
INSERT INTO public.vehicle_extra_variants (extra_id, name, price, position, is_active)
SELECT c.id, v.name, v.price, v.position, true
FROM (VALUES
  ('Jantes de liga leve', '19" M', 0, 1),
  ('Jantes de liga leve', '20" M', 1200, 2),
  ('Jantes de liga leve', '21" M', 2400, 3),

  ('Pintura metalizada', 'Branco Alpino', 0, 1),
  ('Pintura metalizada', 'Preto Safira', 950, 2),
  ('Pintura metalizada', 'Azul Portimão', 1100, 3),

  ('Pack M Sport', 'Interior', 0, 1),
  ('Pack M Sport', 'Interior + exterior', 1200, 2),

  ('Bancos desportivos em pele', 'Pele preta', 0, 1),
  ('Bancos desportivos em pele', 'Pele castanha', 450, 2)
) AS v(extra_name, name, price, position)
JOIN public.vehicle_extra_catalog c ON c.name = v.extra_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_extra_variants x
  WHERE x.extra_id = c.id AND x.name = v.name
);

-- ------------------------------------------------------------
-- 6. EXTRAS DISPONÍVEIS EM CADA VIATURA NOVA — vehicle_extras
-- ------------------------------------------------------------
-- O configurador lê esta tabela e junta as variantes do catálogo.
DELETE FROM public.vehicle_extras
WHERE vehicle_id IN (
  SELECT id FROM public.vehicles WHERE slug IN (
    'bmw-x3-30d-2026', 'bmw-530d-xdrive-2026', 'bmw-x1-20d-2026'
  )
);

INSERT INTO public.vehicle_extras (vehicle_id, catalog_extra_id, name, price)
SELECT v.id, c.id, c.name, c.price
FROM public.vehicles v
JOIN (VALUES
  ('bmw-x3-30d-2026', 'Jantes de liga leve'),
  ('bmw-x3-30d-2026', 'Pintura metalizada'),
  ('bmw-x3-30d-2026', 'Teto panorâmico'),
  ('bmw-x3-30d-2026', 'Travões M Sport'),

  ('bmw-530d-xdrive-2026', 'Jantes de liga leve'),
  ('bmw-530d-xdrive-2026', 'Pintura metalizada'),
  ('bmw-530d-xdrive-2026', 'Pack M Sport'),
  ('bmw-530d-xdrive-2026', 'Assistência à condução Plus'),

  ('bmw-x1-20d-2026', 'Pintura metalizada'),
  ('bmw-x1-20d-2026', 'Teto panorâmico'),
  ('bmw-x1-20d-2026', 'Bancos desportivos em pele')
) AS vx(slug, extra_name) ON vx.slug = v.slug
JOIN public.vehicle_extra_catalog c ON c.name = vx.extra_name;

-- ------------------------------------------------------------
-- 7. RESUMO
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM public.vehicles WHERE sale_type = 'used' AND slug LIKE 'bmw-%') AS usadas,
  (SELECT COUNT(*) FROM public.vehicles WHERE sale_type = 'new' AND slug LIKE 'bmw-%') AS novas,
  (SELECT COUNT(*) FROM public.vehicle_extra_catalog) AS extras_catalogo,
  (SELECT COUNT(*) FROM public.vehicle_extra_variants) AS variantes,
  (SELECT COUNT(*) FROM public.vehicle_extras) AS extras_por_viatura;
