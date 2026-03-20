-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Regions v2 — Rediseño completo (ejecutar completo de una vez)
-- Proyecto: kmdkiyrjmvxnmfdvsofq.supabase.co
-- ══════════════════════════════════════════════════════════════════════════════

-- ── PASO 1: Limpiar la versión anterior (creada en v1, sin datos reales) ──────

-- Quitar FK de submissions hacia regions antes de drop
ALTER TABLE submissions DROP COLUMN IF EXISTS region_id;

-- Eliminar policies y tablas de v1
DROP POLICY IF EXISTS "regions_admin_all"                  ON regions;
DROP POLICY IF EXISTS "regions_read_authenticated"         ON regions;
DROP POLICY IF EXISTS "company_regions_admin_all"          ON company_regions;
DROP POLICY IF EXISTS "company_regions_supervisor_read"    ON company_regions;
DROP TRIGGER IF EXISTS trg_regions_updated_at              ON regions;
DROP TABLE IF EXISTS company_regions;
DROP TABLE IF EXISTS regions;

-- ── PASO 2: Tabla regions — áreas geográficas ─────────────────────────────────
CREATE TABLE regions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regions_name_unique UNIQUE (name)
);

-- ── PASO 3: Tabla sites — sitios individuales dentro de una región ────────────
CREATE TABLE sites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id  uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  site_id    text NOT NULL,
  name       text NOT NULL,
  lat        float,
  lng        float,
  height_m   float,
  province   text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sites_site_id_unique UNIQUE (site_id)
);

-- ── PASO 4: Tabla company_regions — empresa ↔ región (muchos a muchos) ────────
CREATE TABLE company_regions (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  region_id  uuid NOT NULL REFERENCES regions(id)   ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, region_id)
);

-- ── PASO 5: Agregar site_id a submissions (nullable — sin romper existentes) ──
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS site_id    uuid REFERENCES sites(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS region_id  uuid REFERENCES regions(id) ON DELETE SET NULL;

-- ── PASO 6: Índices ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_region            ON sites(region_id);
CREATE INDEX IF NOT EXISTS idx_sites_site_id           ON sites(site_id);
CREATE INDEX IF NOT EXISTS idx_company_regions_company ON company_regions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_regions_region  ON company_regions(region_id);
CREATE INDEX IF NOT EXISTS idx_submissions_site        ON submissions(site_id);
CREATE INDEX IF NOT EXISTS idx_submissions_region      ON submissions(region_id);

-- ── PASO 7: Triggers updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_regions_updated_at ON regions;
CREATE TRIGGER trg_regions_updated_at
  BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_sites_updated_at ON sites;
CREATE TRIGGER trg_sites_updated_at
  BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── PASO 8: RLS ───────────────────────────────────────────────────────────────
ALTER TABLE regions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_regions ENABLE ROW LEVEL SECURITY;

-- regions: admin gestiona todo, supervisor y inspector solo lectura
CREATE POLICY "regions_admin_all" ON regions
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "regions_read" ON regions
  FOR SELECT USING (get_my_role() IN ('admin', 'supervisor', 'inspector'));

-- sites: admin gestiona todo
-- supervisor ve los de sus regiones
-- inspector ve los de las regiones de su empresa
CREATE POLICY "sites_admin_all" ON sites
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "sites_read_supervisor" ON sites
  FOR SELECT USING (
    get_my_role() IN ('supervisor', 'inspector')
    AND region_id IN (
      SELECT cr.region_id FROM company_regions cr
      WHERE cr.company_id = get_my_company_id()
    )
  );

-- company_regions: admin gestiona todo, supervisor lee las de su empresa
CREATE POLICY "company_regions_admin_all" ON company_regions
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "company_regions_read" ON company_regions
  FOR SELECT USING (
    get_my_role() IN ('supervisor', 'inspector')
    AND company_id = get_my_company_id()
  );

NOTIFY pgrst, 'reload schema';
