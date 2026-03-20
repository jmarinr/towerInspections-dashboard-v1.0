-- ── MIGRATION: Regions (Camino B Fase 1) ─────────────────────────────────────
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla regions (catálogo maestro de sitios)
CREATE TABLE IF NOT EXISTS regions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    text NOT NULL,
  name       text NOT NULL,
  lat        float,
  lng        float,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regions_site_id_unique UNIQUE (site_id)
);

-- 2. Tabla junction empresa ↔ región (muchos a muchos)
CREATE TABLE IF NOT EXISTS company_regions (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  region_id  uuid NOT NULL REFERENCES regions(id)   ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, region_id)
);

-- 3. Agregar region_id a submissions (nullable — formularios existentes no se rompen)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id) ON DELETE SET NULL;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_company_regions_company ON company_regions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_regions_region  ON company_regions(region_id);
CREATE INDEX IF NOT EXISTS idx_submissions_region       ON submissions(region_id);

-- 5. Trigger updated_at para regions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_regions_updated_at ON regions;
CREATE TRIGGER trg_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS
ALTER TABLE regions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_regions ENABLE ROW LEVEL SECURITY;

-- regions: admin puede todo, supervisor y demás solo lectura
CREATE POLICY "regions_admin_all" ON regions
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "regions_read_authenticated" ON regions
  FOR SELECT USING (get_my_role() IN ('admin', 'supervisor'));

-- company_regions: admin puede todo, supervisor solo ve las de su empresa
CREATE POLICY "company_regions_admin_all" ON company_regions
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "company_regions_supervisor_read" ON company_regions
  FOR SELECT USING (
    get_my_role() = 'supervisor'
    AND company_id = get_my_company_id()
  );

NOTIFY pgrst, 'reload schema';
