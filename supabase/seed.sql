-- ============================================================
-- CHIKANE GARAGE — DADOS DE TESTE
-- ExecutaDepois do setup.sql
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
 'Berlina de luxo com motor diesel eficiente. Interior premium.', false);

-- ============================================================
-- EXTRAS DAS VIATURAS
-- ============================================================
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Teto panorâmico' FROM public.vehicles WHERE slug = 'bmw-530d-msport-2019';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Pack M Sport' FROM public.vehicles WHERE slug = 'bmw-530d-msport-2019';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Câmara 360°' FROM public.vehicles WHERE slug = 'bmw-530d-msport-2019';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Sistema Harman Kardon' FROM public.vehicles WHERE slug = 'bmw-530d-msport-2019';

INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Pack M Sport' FROM public.vehicles WHERE slug = 'bmw-320d-msport-2021';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Faróis LED' FROM public.vehicles WHERE slug = 'bmw-320d-msport-2021';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Aquecer Volante' FROM public.vehicles WHERE slug = 'bmw-320d-msport-2021';

INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Tração Integral xDrive' FROM public.vehicles WHERE slug = 'bmw-330d-xdrive-2020';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Suspensão Adaptativa' FROM public.vehicles WHERE slug = 'bmw-330d-xdrive-2020';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Interior Vernasca Cognac' FROM public.vehicles WHERE slug = 'bmw-330d-xdrive-2020';

INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Suspensão Pneumática' FROM public.vehicles WHERE slug = 'bmw-x5-30d-2021';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Pack M Sport' FROM public.vehicles WHERE slug = 'bmw-x5-30d-2021';
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT id, 'Head-Up Display' FROM public.vehicles WHERE slug = 'bmw-x5-30d-2021';

-- ============================================================
-- IMAGENS GALERIA
-- ============================================================
INSERT INTO public.vehicle_images (vehicle_id, url, position, alt_text)
SELECT id, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80', 0, 'BMW 320d M Sport - Vista frontal'
FROM public.vehicles WHERE slug = 'bmw-320d-msport-2021';

INSERT INTO public.vehicle_images (vehicle_id, url, position, alt_text)
SELECT id, 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=1200&q=80', 1, 'BMW 320d M Sport - Interior'
FROM public.vehicles WHERE slug = 'bmw-320d-msport-2021';

INSERT INTO public.vehicle_images (vehicle_id, url, position, alt_text)
SELECT id, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80', 2, 'BMW 320d M Sport - Traseira'
FROM public.vehicles WHERE slug = 'bmw-320d-msport-2021';


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
SELECT '✅ SEED COMPLETO!' AS resultado;
