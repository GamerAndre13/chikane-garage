-- ============================================================================
--  RASCUNHO - VIATURAS GENERICAS (CARROS E MOTOS) E VARIAS LOJAS
--  **NAO CORRER** - ver `docs/COMPATIBILIDADE_STANDS.md`
-- ============================================================================
--  Objetivo: a mesma base de dados servir um stand de CARROS (Chikane) e um
--  stand de MOTOS (ex.: Benimoto), sem alterar a estrutura quando o cliente
--  muda - so muda o que esta guardado (tipos, categorias, marcas, lojas) e
--  a parte visual.
--
--  Como aplicar: copiar para o fim do `supabase/setup.sql`, correr a mao no
--  SQL Editor do Supabase, apagar este ficheiro.
--
--  Depende (so para o trigger): do rascunho `ETAPA_1_LOJA.sql` secao 21.
--  Sintaxe validada com o parser real do PostgreSQL.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Tipos de veiculo (sao DADOS, nao codigo: acrescenta-se no backoffice)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT DEFAULT '',        -- para agrupar na montra (ex.: 'Motos')
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.vehicle_types (slug, name, group_name, position) VALUES
  ('carro', 'Carro', 'Automoveis', 1),
  ('moto', 'Moto', 'Motos', 2),
  ('scooter', 'Scooter', 'Motos', 3),
  ('moto4', 'Moto4 / Quad', 'Todo-o-terreno', 4),
  ('atv', 'ATV', 'Todo-o-terreno', 5),
  ('side_by_side', 'Side-by-Side', 'Todo-o-terreno', 6),
  ('jet_ski', 'Jet Ski / Mota de agua', 'Agua', 7),
  ('ebike', 'eBike', 'Bicicletas', 8),
  ('golf', 'Golf e manutencao', 'Outros', 9),
  ('outro', 'Outro', 'Outros', 10)
ON CONFLICT (slug) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. Viaturas: tipo de veiculo e campos que faltavam
-- ----------------------------------------------------------------------------
-- O default 'carro' garante que as viaturas ja existentes (Chikane) continuam
-- validas sem tocar em dados.
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'carro';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS engine_cc INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS license_category TEXT;   -- A1, A2, A, AM, B...
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS usage_hours INT;         -- jet ski, golf...
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'used';      -- new | used
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'stock';     -- stock | on_order
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS brand_warranty_months INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS delivery_estimate_days INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS config_summary TEXT DEFAULT '';

-- A lista de tipos vive na tabela; a viatura so aponta para o slug.
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_fkey;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_vehicle_type_fkey
  FOREIGN KEY (vehicle_type) REFERENCES public.vehicle_types(slug) ON UPDATE CASCADE;

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_condition_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_condition_check
  CHECK (condition IN ('new', 'used'));

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_sale_type_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_sale_type_check
  CHECK (sale_type IN ('stock', 'on_order'));

-- "diesel" como valor por omissao so fazia sentido para carros.
ALTER TABLE public.vehicles ALTER COLUMN fuel_type SET DEFAULT '';

-- Notas (nao muda a base de dados):
--   * `transmission` (manual/automatic) serve carros, motos e scooters.
--   * `drivetrain` pode ficar a nulo (jet ski, quad sem tracao definida).
--   * `body_style` e texto livre: "Trail", "Naked", "Scooter", "SUV", "Citadino".
--   * `engine` (texto) e `engine_cc` (numero) coexistem: "689cc" e 689.

CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON public.vehicles(condition);
CREATE INDEX IF NOT EXISTS idx_vehicles_sale_type ON public.vehicles(sale_type);


-- ----------------------------------------------------------------------------
-- 3. Varias lojas / localizacoes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address_line TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT 'PT',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  maps_url TEXT DEFAULT '',
  opening_hours TEXT DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_position ON public.locations(position);


-- ----------------------------------------------------------------------------
-- 4. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_types_select_public" ON public.vehicle_types;
CREATE POLICY "vehicle_types_select_public" ON public.vehicle_types FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "vehicle_types_admin_all" ON public.vehicle_types;
CREATE POLICY "vehicle_types_admin_all" ON public.vehicle_types FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "locations_select_public" ON public.locations;
CREATE POLICY "locations_select_public" ON public.locations FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "locations_admin_all" ON public.locations;
CREATE POLICY "locations_admin_all" ON public.locations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT ON public.vehicle_types, public.locations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_types, public.locations TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. Exemplos (comentados - os dados reais entram no backoffice)
-- ----------------------------------------------------------------------------
-- Lojas da Chikane:
-- INSERT INTO public.locations (slug, name, address_line, postal_code, city, phone, email, opening_hours, is_primary, position)
-- VALUES ('sede', 'Chikane Garage', '...', '...', '...', '...', '...', 'Seg-Sex 9h-19h', true, 1)
-- ON CONFLICT (slug) DO NOTHING;
--
-- Lojas da Benimoto:
-- INSERT INTO public.locations (slug, name, address_line, postal_code, city, phone, email, opening_hours, is_primary, position)
-- VALUES
--   ('benedita', 'Benimoto - Benedita', 'Estrada Nacional 1, Km 84', '2475-016', 'Benedita', '+351 262 920 054', 'geral@benimoto.pt', 'Seg-Sex 9h-13h e 14h30-19h; Sab 9h-13h', true, 1),
--   ('caldas', 'Benimoto - Caldas da Rainha', 'R. Infante D. Henrique 13', '2500-852', 'Caldas da Rainha', '+351 262 380 903', 'geral.cr@benimoto.pt', 'Seg-Sex 9h-13h e 14h30-19h; Sab 9h-13h', false, 2)
-- ON CONFLICT (slug) DO NOTHING;
--
-- Tipos que um stand de carros mostra (exemplo): so 'carro'.
-- Tipos que um stand de motos mostra: moto, scooter, moto4, atv, side_by_side,
-- jet_ski, ebike, golf. Isso resolve-se na montra (dados), nao na estrutura.

-- ----------------------------------------------------------------------------
--  FIM DO RASCUNHO
-- ----------------------------------------------------------------------------
