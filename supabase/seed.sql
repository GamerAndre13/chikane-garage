-- ============================================================
-- CHIKANE GARAGE — DADOS DE TESTE
-- Executar DEPOIS do setup.sql e das migrações 021 a 039 (a coluna sale_type
-- e as tabelas de extras/campanhas só existem nessas migrações).
-- As 10 usadas e as 5 novas adicionadas a seguir usam fotografias públicas
-- apenas para teste. O ficheiro todo é idempotente: pode ser executado outra
-- vez sem duplicar viaturas, equipamento, fotografias ou extras.
-- ============================================================

-- ============================================================
-- VIATURAS
-- ============================================================
INSERT INTO public.vehicles (
  slug, reference_code, brand, model, trim,
  registration_year, registration_month, status,
  engine, power_hp, torque_nm, transmission, drivetrain,
  fuel_type, combined_consumption, co2_emissions,
  exterior_color, interior_color, mileage_km,
  previous_owners, service_book, accident_history,
  origin, origin_country, coc_confirmed, isv_paid,
  price, financing_available, warranty_months, trade_in_accepted,
  cover_image_url, description, is_featured
) VALUES

('bmw-320d-msport-2021', 'CG-001', 'BMW', '320d', 'M Sport Shadow Line',
 2021, 3, 'available',
 '2.0d', 190, 400, 'automatic', 'rwd',
 'diesel', 4.8, 126,
 'Black Sapphire', 'Vernasca Black', 68400,
 1, 'full_dealer', false,
 'imported', 'DE', true, true,
 34900, true, 6, true,
 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
 'Importação directa Munique. Livro de revisões BMW completo. Estado impecável, sem acidentes.', true),

('bmw-420d-grancoupe-2020', 'CG-002', 'BMW', '420d', 'Gran Coupé M Sport',
 2020, 6, 'available',
 '2.0d', 190, 400, 'automatic', 'rwd',
 'diesel', 5.0, 132,
 'Mineral Grey', 'Alcantara Black', 72000,
 2, 'full', false,
 'imported', 'DE', true, true,
 32500, true, 6, true,
 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=800&q=80',
 'Coupé a 4 portas com motor diesel 190cv. Package M Sport completo.', true),

('bmw-530d-msport-2019', 'CG-003', 'BMW', '530d', 'M Sport Executive',
 2019, 9, 'available',
 '3.0d', 265, 620, 'automatic', 'rwd',
 'diesel', 5.6, 147,
 'Alpine White', 'Nappa Black', 85000,
 1, 'full_dealer', false,
 'imported', 'BE', true, true,
 38900, true, 6, true,
 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
 'O mais potente da gama 5 com 265cv. Pacote Executive completo.', true),

('bmw-330d-xdrive-2020', 'CG-004', 'BMW', '330d', 'xDrive M Sport',
 2020, 1, 'available',
 '3.0d', 265, 620, 'automatic', 'awd',
 'diesel', 5.4, 142,
 'Phytonic Blue', 'Vernasca Cognac', 54000,
 1, 'full_dealer', false,
 'imported', 'DE', true, true,
 42000, true, 12, true,
 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
 'Tração integral xDrive com 265cv. Interior Vernasca premium.', true),

('bmw-x5-30d-2021', 'CG-005', 'BMW', 'X5', 'xDrive30d M Sport',
 2021, 5, 'available',
 '3.0d', 286, 650, 'automatic', 'awd',
 'diesel', 6.2, 164,
 'Carbon Black', 'Vernasca Black', 45000,
 1, 'full_dealer', false,
 'imported', 'DE', true, true,
 58000, true, 12, true,
 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
 'SUV de luxo com 286cv. Suspensão pneumática. Equipamento completo.', false),

('bmw-218d-tourer-2022', 'CG-006', 'BMW', '218d', 'Active Tourer Sport Line',
 2022, 8, 'reserved',
 '2.0d', 150, 330, 'automatic', 'fwd',
 'diesel', 4.5, 118,
 'Coral White', 'Cloth Black', 32000,
 1, 'full_dealer', false,
 'national', 'PT', true, true,
 28500, true, 6, false,
 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=800&q=80',
 'Compacto familiar diesel. Perfeito para o dia a dia.', false),

('bmw-730d-2018', 'CG-007', 'BMW', '730d', 'Luxury Executive',
 2018, 4, 'sold',
 '3.0d', 265, 620, 'automatic', 'rwd',
 'diesel', 5.8, 152,
 'Black', 'Nappa White', 95000,
 2, 'full', false,
 'imported', 'NL', true, true,
 35000, false, 0, false,
 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
 'Berlina de luxo com motor diesel eficiente. Interior premium.', false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- VIATURAS DE TESTE ADICIONAIS (10 usadas + 5 novas)
-- ============================================================
-- Pedido do dono (2026-11-17): mais viaturas para testar filtros, fichas,
-- carrosséis e configurador. As fotografias são públicas (Wikimedia Commons)
-- e servem apenas para teste — substituir por fotografias reais antes de
-- publicar. Requer as migrações 021+ (coluna sale_type).
-- Idempotente: as viaturas usam ON CONFLICT (slug); o resto só insere o que
-- ainda não existe.
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
  cover_image_url, description, is_featured
) VALUES

-- ------------------------------------------------------------
-- 10 VIATURAS USADAS
-- ------------------------------------------------------------
('audi-rs3-2021', 'CG-101', 'Audi', 'RS3', 'quattro S tronic',
  2021, 6, 'available', 'used',
  '2.5 TFSI', 400, 500, 'automatic', 'awd',
  'Hatchback', 'gasolina', 8.9, 201,
  'Verde Kyalami', 'Pele preta', 42000,
  1, 'full_dealer', false,
  'imported', 'Alemanha', true, true,
  54900, true, 12, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Audi_RS3_8Y_Sedan_IMG_6030.jpg/1280px-Audi_RS3_8Y_Sedan_IMG_6030.jpg',
  'RS3 8Y com motor 2.5 TFSI de 400cv, caixa S tronic e tração quattro. Importada da Alemanha, revisões na marca.', false),

('mercedes-amg-a45-s-2020', 'CG-102', 'Mercedes-Benz', 'A 45 S 4MATIC+', 'AMG',
  2020, 9, 'available', 'used',
  '2.0 Turbo', 421, 500, 'automatic', 'awd',
  'Hatchback', 'gasolina', 9.4, 213,
  'Cinzento Mountain', 'Pele preta', 58000,
  2, 'full', false,
  'imported', 'Alemanha', true, true,
  47900, true, 6, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Mercedes-AMG_A_45_S_4MATIC%2B_%28W177%29_1X7A0310.jpg/1280px-Mercedes-AMG_A_45_S_4MATIC%2B_%28W177%29_1X7A0310.jpg',
  'AMG A 45 S com 421cv e 4MATIC+. Desportivo compacto com pack Performance e interior em pele.', false),

('porsche-911-carrera-4s-2019', 'CG-103', 'Porsche', '911 Carrera 4S', '992',
  2019, 7, 'available', 'used',
  '3.0 Turbo', 450, 530, 'automatic', 'awd',
  'Coupé', 'gasolina', 9.7, 220,
  'Branco Carrara', 'Pele preta', 61000,
  2, 'full_dealer', false,
  'imported', 'Alemanha', true, true,
  119900, false, 12, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/2020_Porsche_911_Carrera_4S_FOS21.jpg/1280px-2020_Porsche_911_Carrera_4S_FOS21.jpg',
  '911 Carrera 4S da geração 992, com tração integral e caixa PDK. Histórico completo na marca.', false),

('bmw-m3-competition-2021', 'CG-104', 'BMW', 'M3 Competition', 'G80',
  2021, 5, 'available', 'used',
  '3.0 Turbo', 510, 650, 'automatic', 'rwd',
  'Sedan', 'gasolina', 10.1, 229,
  'Cinzento Skyscraper', 'Pele preta', 39000,
  1, 'full_dealer', false,
  'imported', 'Alemanha', true, true,
  74900, true, 12, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/BMW_M3_Competition_%28G80%29_IMG_4041.jpg/1280px-BMW_M3_Competition_%28G80%29_IMG_4041.jpg',
  'M3 Competition G80 com 510cv, caixa M Steptronic e diferenciação M. Um dono, sempre na marca.', true),

('bmw-m4-competition-2020', 'CG-105', 'BMW', 'M4 Competition', 'G82',
  2020, 3, 'available', 'used',
  '3.0 Turbo', 510, 650, 'automatic', 'rwd',
  'Coupé', 'gasolina', 10.0, 227,
  'Azul São Paulo', 'Pele preta', 44000,
  1, 'full_dealer', false,
  'imported', 'Alemanha', true, true,
  69900, true, 12, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2021_BMW_M4_Competition_Automatic_3.0_Front.jpg/1280px-2021_BMW_M4_Competition_Automatic_3.0_Front.jpg',
  'M4 Competition G82 com 510cv e pack M Carbon exterior. Interior em pele e faróis Laser.', false),

('bmw-840d-gran-coupe-2019', 'CG-106', 'BMW', '840d xDrive', 'Gran Coupé',
  2019, 10, 'sold', 'used',
  '3.0d', 320, 680, 'automatic', 'awd',
  'Coupé', 'diesel', 6.9, 181,
  'Preto Safira', 'Pele branca', 78000,
  2, 'full', false,
  'imported', 'Alemanha', true, true,
  62900, true, 6, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg/1280px-2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg',
  'Série 8 Gran Coupé com motor 3.0d de 320cv e xDrive. Vendida — visível durante 7 dias.', false),

('bmw-118d-2022', 'CG-107', 'BMW', '118d', 'Sport Line',
  2022, 4, 'available', 'used',
  '2.0d', 150, 360, 'automatic', 'rwd',
  'Hatchback', 'diesel', 4.6, 120,
  'Branco Alpino', 'Pele preta', 21000,
  1, 'full_dealer', false,
  'national', 'Portugal', true, true,
  26900, true, 6, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/2019_BMW_118i_SE_1.5_Front.jpg/1280px-2019_BMW_118i_SE_1.5_Front.jpg',
  'Série 1 F40 118d, nacional, com poucos quilómetros e revisões completas na marca.', false),

('bmw-320e-2021', 'CG-108', 'BMW', '320e', 'M Sport',
  2021, 9, 'reserved', 'used',
  '2.0 PHEV', 204, 350, 'automatic', 'rwd',
  'Sedan', 'híbrido', 1.9, 43,
  'Cinzento Grafite', 'Pele castanha', 52000,
  1, 'full_dealer', false,
  'national', 'Portugal', true, true,
  39900, true, 12, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/2019_BMW_318d_SE_Automatic_2.0_Front.jpg/1280px-2019_BMW_318d_SE_Automatic_2.0_Front.jpg',
  '320e híbrida plug-in com pack M Sport. Reservada — serve para testar o estado e a expiração da reserva.', false),

('bmw-m2-2023', 'CG-109', 'BMW', 'M2', 'G87',
  2023, 2, 'available', 'used',
  '3.0 Turbo', 460, 550, 'automatic', 'rwd',
  'Coupé', 'gasolina', 10.2, 231,
  'Azul Zandvoort', 'Pele preta', 18000,
  1, 'full_dealer', false,
  'imported', 'Alemanha', true, true,
  79900, true, 24, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/BMW_G87_M2_1X7A1838.jpg/1280px-BMW_G87_M2_1X7A1838.jpg',
  'M2 G87 com 460cv e caixa M Steptronic. Quase nova, com garantia de 24 meses.', false),

('bmw-z4-m40i-2021', 'CG-110', 'BMW', 'Z4 M40i', 'Roadster',
  2021, 7, 'available', 'used',
  '3.0 Turbo', 340, 500, 'automatic', 'rwd',
  'Roadster', 'gasolina', 8.1, 185,
  'Vermelho São Francisco', 'Pele preta', 27000,
  1, 'full_dealer', false,
  'imported', 'Alemanha', true, true,
  57900, true, 12, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/2019_BMW_Z4_M40i_Front.jpg/1280px-2019_BMW_Z4_M40i_Front.jpg',
  'Z4 M40i Roadster com capota elétrica, 340cv e caixa Steptronic. Estilo desportivo e poucos quilómetros.', false),

-- ------------------------------------------------------------
-- 5 VIATURAS NOVAS POR ENCOMENDA
-- ------------------------------------------------------------
('bmw-i5-edrive40-2026', 'CG-N11', 'BMW', 'i5 eDrive40', 'M Sport',
  2026, 1, 'available', 'new',
  'Elétrico', 340, 430, 'automatic', 'rwd',
  'Sedan', 'elétrico', 16.8, 0,
  'Cinzento Brooklyn', 'Pele preta', 0,
  0, 'full_dealer', false,
  'imported', 'Alemanha', true, false,
  84900, true, 24, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/BMW_G60_520i_1X7A2443.jpg/1280px-BMW_G60_520i_1X7A2443.jpg',
  'i5 eDrive40 por encomenda, 340cv e autonomia alargada. Configura os extras e gera a tua proposta.', false),

('bmw-ix3-2026', 'CG-N12', 'BMW', 'iX3 50 xDrive', 'M Sport Pro',
  2026, 1, 'available', 'new',
  'Elétrico', 469, 645, 'automatic', 'awd',
  'SUV', 'elétrico', 18.5, 0,
  'Azul Frozen', 'Pele preta', 0,
  0, 'full_dealer', false,
  'imported', 'Alemanha', true, false,
  69900, true, 24, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/BMW_iX3_50_xDrive_M_Sportpaket_Pro_%28NA5%29_%E2%80%93_f_17052026.jpg/1280px-BMW_iX3_50_xDrive_M_Sportpaket_Pro_%28NA5%29_%E2%80%93_f_17052026.jpg',
  'SUV elétrico iX3 50 xDrive com 469cv. Por encomenda, com carregamento rápido e equipamento M Sport Pro.', false),

('bmw-m240i-2026', 'CG-N13', 'BMW', 'M240i xDrive', 'Coupé',
  2026, 1, 'available', 'new',
  '3.0 Turbo', 374, 500, 'automatic', 'awd',
  'Coupé', 'gasolina', 8.9, 202,
  'Roxo Tordilho', 'Pele preta', 0,
  0, 'full_dealer', false,
  'imported', 'Alemanha', true, false,
  72900, true, 24, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BMW_G42_1X7A0370.jpg/1280px-BMW_G42_1X7A0370.jpg',
  'M240i xDrive Coupé com 374cv e tração integral. Novo por encomenda, pronto a configurar.', false),

('bmw-x5-50e-2026', 'CG-N14', 'BMW', 'X5 50e', 'M Sport',
  2026, 1, 'available', 'new',
  '3.0 PHEV', 489, 700, 'automatic', 'awd',
  'SUV', 'híbrido', 1.2, 27,
  'Verde Manhattan', 'Pele castanha', 0,
  0, 'full_dealer', false,
  'imported', 'Alemanha', true, false,
  109900, true, 24, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/BMW_G05_45e_IMG_3714.jpg/1280px-BMW_G05_45e_IMG_3714.jpg',
  'X5 50e híbrida plug-in com 489cv. SUV de luxo por encomenda com pacote M Sport.', false),

('bmw-420i-2026', 'CG-N15', 'BMW', '420i', 'M Sport',
  2026, 1, 'available', 'new',
  '2.0 Turbo', 184, 300, 'automatic', 'rwd',
  'Coupé', 'gasolina', 7.1, 161,
  'Azul Portimão', 'Pele preta', 0,
  0, 'full_dealer', false,
  'imported', 'Alemanha', true, false,
  58900, true, 24, true,
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/2021_BMW_420i_M_Sport_Automatic_2.0.jpg/1280px-2021_BMW_420i_M_Sport_Automatic_2.0.jpg',
  'Série 4 Coupé 420i por encomenda com pack M Sport. Entrada na gama com configuração completa.', false)

ON CONFLICT (slug) DO NOTHING;

-- A 840d foi vendida há 2 dias (teste da janela de 7 dias) e a 320e está
-- reservada com expiração daqui a 4 dias (teste de expire_reservations).
UPDATE public.vehicles
SET sold_at = NOW() - INTERVAL '2 days'
WHERE slug = 'bmw-840d-gran-coupe-2019' AND sold_at IS NULL;

UPDATE public.vehicles
SET reserved_until = NOW() + INTERVAL '4 days'
WHERE slug = 'bmw-320e-2021' AND status = 'reserved' AND reserved_until IS NULL;

-- Equipamento das viaturas de teste
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT v.id, f.label
FROM (VALUES
  ('audi-rs3-2021', 'Tração quattro'),
  ('audi-rs3-2021', 'Bancos desportivos'),
  ('audi-rs3-2021', 'Virtual Cockpit'),
  ('mercedes-amg-a45-s-2020', 'Pack Performance'),
  ('mercedes-amg-a45-s-2020', 'Bancos AMG'),
  ('porsche-911-carrera-4s-2019', 'PDK'),
  ('porsche-911-carrera-4s-2019', 'Tração integral'),
  ('bmw-m3-competition-2021', 'Pack M Carbon'),
  ('bmw-m3-competition-2021', 'Head-up display'),
  ('bmw-m3-competition-2021', 'Câmara 360º'),
  ('bmw-m4-competition-2020', 'Faróis Laser'),
  ('bmw-m4-competition-2020', 'Pack M Carbon'),
  ('bmw-840d-gran-coupe-2019', 'Teto panorâmico'),
  ('bmw-840d-gran-coupe-2019', 'Bancos em pele'),
  ('bmw-118d-2022', 'Faróis LED'),
  ('bmw-118d-2022', 'Apple CarPlay'),
  ('bmw-320e-2021', 'Carregamento plug-in'),
  ('bmw-320e-2021', 'Pack M Sport'),
  ('bmw-m2-2023', 'Diferencial M'),
  ('bmw-m2-2023', 'Bancos desportivos'),
  ('bmw-z4-m40i-2021', 'Capota elétrica'),
  ('bmw-z4-m40i-2021', 'Head-up display'),
  ('bmw-i5-edrive40-2026', 'Pack M Sport'),
  ('bmw-i5-edrive40-2026', 'Bancos aquecidos'),
  ('bmw-ix3-2026', 'M Sport Pro'),
  ('bmw-ix3-2026', 'Teto panorâmico'),
  ('bmw-m240i-2026', 'Tração integral xDrive'),
  ('bmw-m240i-2026', 'Bancos desportivos'),
  ('bmw-x5-50e-2026', 'Suspensão pneumática'),
  ('bmw-x5-50e-2026', 'Câmara 360º'),
  ('bmw-420i-2026', 'Pack M Sport'),
  ('bmw-420i-2026', 'Navegação')
) AS f(slug, label)
JOIN public.vehicles v ON v.slug = f.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_features x
  WHERE x.vehicle_id = v.id AND x.label = f.label
);

-- Galeria de fotografias (a capa é sempre a primeira imagem)
INSERT INTO public.vehicle_images (vehicle_id, url, position, alt_text)
SELECT v.id, img.url, img.position, img.alt
FROM (VALUES
  ('audi-rs3-2021', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Audi_RS3_8Y_Sedan_IMG_6030.jpg/1280px-Audi_RS3_8Y_Sedan_IMG_6030.jpg', 'Audi RS3 — vista frontal'),
  ('mercedes-amg-a45-s-2020', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Mercedes-AMG_A_45_S_4MATIC%2B_%28W177%29_1X7A0310.jpg/1280px-Mercedes-AMG_A_45_S_4MATIC%2B_%28W177%29_1X7A0310.jpg', 'Mercedes-AMG A 45 S — vista frontal'),
  ('porsche-911-carrera-4s-2019', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/2020_Porsche_911_Carrera_4S_FOS21.jpg/1280px-2020_Porsche_911_Carrera_4S_FOS21.jpg', 'Porsche 911 Carrera 4S — vista frontal'),

  ('bmw-m3-competition-2021', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/BMW_M3_Competition_%28G80%29_IMG_4041.jpg/1280px-BMW_M3_Competition_%28G80%29_IMG_4041.jpg', 'BMW M3 Competition — vista frontal'),
  ('bmw-m3-competition-2021', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg', 'BMW M3 Competition — interior'),
  ('bmw-m3-competition-2021', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg', 'BMW M3 Competition — bancos'),
  ('bmw-m4-competition-2020', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2021_BMW_M4_Competition_Automatic_3.0_Front.jpg/1280px-2021_BMW_M4_Competition_Automatic_3.0_Front.jpg', 'BMW M4 Competition — vista frontal'),
  ('bmw-m4-competition-2020', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg', 'BMW M4 Competition — interior'),
  ('bmw-m4-competition-2020', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg', 'BMW M4 Competition — bancos'),
  ('bmw-840d-gran-coupe-2019', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg/1280px-2019_BMW_840d_xDrive_Automatic_3.0_Front.jpg', 'BMW 840d — vista frontal'),
  ('bmw-840d-gran-coupe-2019', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg', 'BMW 840d — interior'),
  ('bmw-840d-gran-coupe-2019', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg', 'BMW 840d — bancos'),
  ('bmw-118d-2022', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/2019_BMW_118i_SE_1.5_Front.jpg/1280px-2019_BMW_118i_SE_1.5_Front.jpg', 'BMW 118d — vista frontal'),
  ('bmw-118d-2022', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg', 'BMW 118d — interior'),
  ('bmw-118d-2022', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg', 'BMW 118d — bancos'),
  ('bmw-320e-2021', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/2019_BMW_318d_SE_Automatic_2.0_Front.jpg/1280px-2019_BMW_318d_SE_Automatic_2.0_Front.jpg', 'BMW 320e — vista frontal'),
  ('bmw-320e-2021', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg', 'BMW 320e — interior'),
  ('bmw-320e-2021', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg', 'BMW 320e — bancos'),
  ('bmw-m2-2023', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/BMW_G87_M2_1X7A1838.jpg/1280px-BMW_G87_M2_1X7A1838.jpg', 'BMW M2 — vista frontal'),
  ('bmw-m2-2023', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg', 'BMW M2 — interior'),
  ('bmw-m2-2023', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg', 'BMW M2 — bancos'),
  ('bmw-z4-m40i-2021', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/2019_BMW_Z4_M40i_Front.jpg/1280px-2019_BMW_Z4_M40i_Front.jpg', 'BMW Z4 M40i — vista frontal'),
  ('bmw-z4-m40i-2021', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg', 'BMW Z4 M40i — interior'),
  ('bmw-z4-m40i-2021', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg', 'BMW Z4 M40i — bancos'),

  ('bmw-i5-edrive40-2026', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/BMW_G60_520i_1X7A2443.jpg/1280px-BMW_G60_520i_1X7A2443.jpg', 'BMW i5 — vista frontal'),
  ('bmw-i5-edrive40-2026', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg', 'BMW i5 — interior'),
  ('bmw-i5-edrive40-2026', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg', 'BMW i5 — bancos'),
  ('bmw-ix3-2026', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/BMW_iX3_50_xDrive_M_Sportpaket_Pro_%28NA5%29_%E2%80%93_f_17052026.jpg/1280px-BMW_iX3_50_xDrive_M_Sportpaket_Pro_%28NA5%29_%E2%80%93_f_17052026.jpg', 'BMW iX3 — vista frontal'),
  ('bmw-ix3-2026', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg', 'BMW iX3 — interior'),
  ('bmw-ix3-2026', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg', 'BMW iX3 — bancos'),
  ('bmw-m240i-2026', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BMW_G42_1X7A0370.jpg/1280px-BMW_G42_1X7A0370.jpg', 'BMW M240i — vista frontal'),
  ('bmw-m240i-2026', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%286%29.jpg', 'BMW M240i — interior'),
  ('bmw-m240i-2026', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%285%29.jpg', 'BMW M240i — bancos'),
  ('bmw-x5-50e-2026', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/BMW_G05_45e_IMG_3714.jpg/1280px-BMW_G05_45e_IMG_3714.jpg', 'BMW X5 50e — vista frontal'),
  ('bmw-x5-50e-2026', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%287%29.jpg', 'BMW X5 50e — interior'),
  ('bmw-x5-50e-2026', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%281%29.jpg', 'BMW X5 50e — bancos'),
  ('bmw-420i-2026', 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/2021_BMW_420i_M_Sport_Automatic_2.0.jpg/1280px-2021_BMW_420i_M_Sport_Automatic_2.0.jpg', 'BMW 420i — vista frontal'),
  ('bmw-420i-2026', 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%288%29.jpg', 'BMW 420i — interior'),
  ('bmw-420i-2026', 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg/1280px-BMW_G20_LCI_Sensatec_Perforated_Cognac_%282%29.jpg', 'BMW 420i — bancos')
) AS img(slug, position, url, alt)
JOIN public.vehicles v ON v.slug = img.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_images i
  WHERE i.vehicle_id = v.id AND i.url = img.url
);

-- Extras disponíveis no configurador das viaturas novas (o catálogo de extras
-- vem da migração 023; se não existir, esta inserção não faz nada).
INSERT INTO public.vehicle_extras (vehicle_id, catalog_extra_id, name, price)
SELECT v.id, c.id, c.name, c.price
FROM (VALUES
  ('bmw-i5-edrive40-2026', 'Jantes de liga leve'),
  ('bmw-i5-edrive40-2026', 'Pintura metalizada'),
  ('bmw-i5-edrive40-2026', 'Teto panorâmico'),
  ('bmw-i5-edrive40-2026', 'Assistência à condução Plus'),
  ('bmw-ix3-2026', 'Jantes de liga leve'),
  ('bmw-ix3-2026', 'Pintura metalizada'),
  ('bmw-ix3-2026', 'Teto panorâmico'),
  ('bmw-ix3-2026', 'Pack M Sport'),
  ('bmw-m240i-2026', 'Jantes de liga leve'),
  ('bmw-m240i-2026', 'Pintura metalizada'),
  ('bmw-m240i-2026', 'Travões M Sport'),
  ('bmw-m240i-2026', 'Bancos desportivos em pele'),
  ('bmw-x5-50e-2026', 'Jantes de liga leve'),
  ('bmw-x5-50e-2026', 'Pintura metalizada'),
  ('bmw-x5-50e-2026', 'Pack M Sport'),
  ('bmw-x5-50e-2026', 'Assistência à condução Plus'),
  ('bmw-420i-2026', 'Jantes de liga leve'),
  ('bmw-420i-2026', 'Pintura metalizada'),
  ('bmw-420i-2026', 'Teto panorâmico'),
  ('bmw-420i-2026', 'Bancos desportivos em pele')
) AS vx(slug, extra_name)
JOIN public.vehicles v ON v.slug = vx.slug
JOIN public.vehicle_extra_catalog c ON c.name = vx.extra_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_extras e
  WHERE e.vehicle_id = v.id AND e.catalog_extra_id = c.id
);

-- ============================================================
-- EXTRAS DAS VIATURAS (idempotente)
-- ============================================================
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT v.id, f.label
FROM (VALUES
  ('bmw-530d-msport-2019', 'Teto panorâmico'),
  ('bmw-530d-msport-2019', 'Pack M Sport'),
  ('bmw-530d-msport-2019', 'Câmara 360°'),
  ('bmw-530d-msport-2019', 'Sistema Harman Kardon'),
  ('bmw-320d-msport-2021', 'Pack M Sport'),
  ('bmw-320d-msport-2021', 'Faróis LED'),
  ('bmw-320d-msport-2021', 'Aquecer Volante'),
  ('bmw-330d-xdrive-2020', 'Tração Integral xDrive'),
  ('bmw-330d-xdrive-2020', 'Suspensão Adaptativa'),
  ('bmw-330d-xdrive-2020', 'Interior Vernasca Cognac'),
  ('bmw-x5-30d-2021', 'Suspensão Pneumática'),
  ('bmw-x5-30d-2021', 'Pack M Sport'),
  ('bmw-x5-30d-2021', 'Head-Up Display')
) AS f(slug, label)
JOIN public.vehicles v ON v.slug = f.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_features x
  WHERE x.vehicle_id = v.id AND x.label = f.label
);

-- ============================================================
-- IMAGENS GALERIA (idempotente)
-- ============================================================
INSERT INTO public.vehicle_images (vehicle_id, url, position, alt_text)
SELECT v.id, img.url, img.position, img.alt
FROM (VALUES
  ('bmw-320d-msport-2021', 0, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80', 'BMW 320d M Sport - Vista frontal'),
  ('bmw-320d-msport-2021', 1, 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=1200&q=80', 'BMW 320d M Sport - Interior'),
  ('bmw-320d-msport-2021', 2, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80', 'BMW 320d M Sport - Traseira')
) AS img(slug, position, url, alt)
JOIN public.vehicles v ON v.slug = img.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_images i
  WHERE i.vehicle_id = v.id AND i.url = img.url
);


-- ============================================================
-- CONTEÚDO CMS
-- ============================================================
INSERT INTO public.site_content (section_key, title, body) VALUES
  ('hero.tagline', 'Frase de destaque (hero)', 'Seleção rigorosa · Garantia garantida'),
  ('hero.slogan', 'Slogan (hero)', 'Precision. Perfected. Passion.'),
  ('hero.intro', 'Introdução do hero', 'Uma garagem privada de performance. Cada unidade escolhida à mão, inspecionada ao detalhe e entregue com garantia Chikane — para quem vive a estrada com paixão.'),
  ('garage.title', 'A Garagem', 'Compramos cada viatura como se fosse para a nossa própria coleção: histórico verificado, mecânica e estética inspecionadas ao detalhe, sempre com a garantia Chikane. Fala connosco para confirmar a disponibilidade e as condições.'),
  ('newsletter.title', 'As viaturas saem antes de chegarem ao site', 'Regista-te para novidades.')
ON CONFLICT (section_key) DO NOTHING;

-- ============================================================
-- SETTINGS
-- ============================================================
INSERT INTO public.site_settings (phone, email, address, location, social_instagram, social_whatsapp)
VALUES ('+351 912 000 000', 'garage@chikane.pt', 'Porto, Portugal', 'Porto, Portugal', 'https://instagram.com/chikanegarage', 'https://wa.me/351912000000')
ON CONFLICT DO NOTHING;

-- ============================================================
SELECT
  (SELECT COUNT(*) FROM public.vehicles WHERE sale_type = 'used') AS usadas,
  (SELECT COUNT(*) FROM public.vehicles WHERE sale_type = 'new') AS novas,
  (SELECT COUNT(*) FROM public.vehicle_images) AS fotografias,
  '✅ SEED COMPLETO!' AS resultado;
