-- =============================================================================
-- PTI Admin Panel — Migration: log triggers
-- Registra eventos en system_logs directamente desde la base de datos
-- NO depende de que el dashboard esté abierto
-- Ejecutar en el SQL Editor de Supabase
-- =============================================================================

-- ── 1. Habilitar Realtime en site_visits (si no está habilitado) ──────────────
ALTER PUBLICATION supabase_realtime ADD TABLE site_visits;

-- ── 2. Función genérica para insertar en system_logs ─────────────────────────
CREATE OR REPLACE FUNCTION log_system_event(
  p_event_type  text,
  p_message     text,
  p_severity    text DEFAULT 'info',
  p_user_id     uuid DEFAULT NULL,
  p_user_email  text DEFAULT NULL,
  p_user_role   text DEFAULT NULL,
  p_company_id  uuid DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO system_logs (
    event_type, message, severity,
    user_id, user_email, user_role,
    company_id, ip_address, metadata
  ) VALUES (
    p_event_type, p_message, p_severity,
    p_user_id, p_user_email, p_user_role,
    p_company_id, 'db-trigger', p_metadata
  );
EXCEPTION WHEN OTHERS THEN
  -- Nunca fallar silenciosamente para no romper el INSERT original
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Trigger: nueva submission recibida ─────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_log_submission_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_payload     jsonb;
  v_inner       jsonb;
  v_site_name   text;
  v_site_id     text;
  v_inspector   text;
  v_form_code   text;
  v_company_id  uuid;
  v_finalized   boolean;
BEGIN
  v_payload   := NEW.payload;
  v_inner     := COALESCE(v_payload->'payload', v_payload);
  v_form_code := COALESCE(NEW.form_code, 'desconocido');
  v_finalized := COALESCE(NEW.finalized, false);

  -- Extraer datos del sitio
  v_site_name := COALESCE(
    v_inner->'data'->'site'->>'nombreSitio',
    v_inner->'site'->>'nombreSitio',
    v_inner->'siteInfo'->>'nombreSitio',
    'Sin nombre'
  );
  v_site_id := COALESCE(
    v_inner->'data'->'site'->>'idSitio',
    v_inner->'site'->>'idSitio',
    NEW.device_id,
    ''
  );

  -- Extraer inspector
  v_inspector := COALESCE(
    v_inner->'submitted_by'->>'name',
    v_inner->'submittedBy'->>'name',
    v_inner->'submitted_by'->>'username',
    'Desconocido'
  );

  -- Obtener company_id desde org_code
  SELECT id INTO v_company_id FROM companies WHERE org_code = NEW.org_code LIMIT 1;

  PERFORM log_system_event(
    'submission.received',
    'Formulario recibido: ' || v_form_code || ' — ' || v_site_name ||
      CASE WHEN v_finalized THEN ' (finalizado)' ELSE ' (borrador)' END,
    'info',
    NEW.submitted_by_user_id,
    v_inspector,
    'inspector',
    v_company_id,
    jsonb_build_object(
      'submission_id', NEW.id,
      'form_code',     v_form_code,
      'site_name',     v_site_name,
      'site_id',       v_site_id,
      'org_code',      NEW.org_code,
      'inspector',     v_inspector,
      'finalized',     v_finalized,
      'source',        'db-trigger'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_submission_insert ON submissions;
CREATE TRIGGER trg_log_submission_insert
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_submission_insert();

-- ── 4. Trigger: submission finalizada (UPDATE finalized = true) ───────────────
CREATE OR REPLACE FUNCTION trigger_log_submission_finalized()
RETURNS TRIGGER AS $$
DECLARE
  v_payload   jsonb;
  v_inner     jsonb;
  v_site_name text;
  v_inspector text;
  v_company_id uuid;
BEGIN
  -- Solo loggear cuando cambia de no-finalizado a finalizado
  IF OLD.finalized = true OR NEW.finalized = false THEN
    RETURN NEW;
  END IF;

  v_payload   := NEW.payload;
  v_inner     := COALESCE(v_payload->'payload', v_payload);
  v_site_name := COALESCE(
    v_inner->'data'->'site'->>'nombreSitio',
    v_inner->'site'->>'nombreSitio',
    'Sin nombre'
  );
  v_inspector := COALESCE(
    v_inner->'submitted_by'->>'name',
    v_inner->'submittedBy'->>'name',
    'Desconocido'
  );

  SELECT id INTO v_company_id FROM companies WHERE org_code = NEW.org_code LIMIT 1;

  PERFORM log_system_event(
    'submission.finalized',
    'Formulario finalizado: ' || COALESCE(NEW.form_code,'') || ' — ' || v_site_name,
    'info',
    NEW.submitted_by_user_id,
    v_inspector,
    'inspector',
    v_company_id,
    jsonb_build_object(
      'submission_id', NEW.id,
      'form_code',     NEW.form_code,
      'site_name',     v_site_name,
      'org_code',      NEW.org_code,
      'source',        'db-trigger'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_submission_finalized ON submissions;
CREATE TRIGGER trg_log_submission_finalized
  AFTER UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_submission_finalized();

-- ── 5. Trigger: nueva visita recibida ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_log_visit_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE org_code = NEW.org_code LIMIT 1;

  PERFORM log_system_event(
    'visit.received',
    'Nueva visita recibida: Orden ' ||
      COALESCE(NEW.order_number::text, NEW.id::text) ||
      ' — Sitio ' || COALESCE(NEW.site_name, NEW.site_id, ''),
    'info',
    NULL,
    COALESCE(NEW.inspector_name, NEW.inspector_username),
    'inspector',
    v_company_id,
    jsonb_build_object(
      'visit_id',     NEW.id,
      'order_number', NEW.order_number,
      'site_id',      NEW.site_id,
      'site_name',    NEW.site_name,
      'org_code',     NEW.org_code,
      'inspector',    COALESCE(NEW.inspector_name, NEW.inspector_username),
      'source',       'db-trigger'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_visit_insert ON site_visits;
CREATE TRIGGER trg_log_visit_insert
  AFTER INSERT ON site_visits
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_visit_insert();

-- ── 6. Trigger: cambio de estado de visita ────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_log_visit_status()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_company_id FROM companies WHERE org_code = NEW.org_code LIMIT 1;

  PERFORM log_system_event(
    'visit.status_changed',
    'Visita ' || COALESCE(NEW.order_number::text, NEW.id::text) ||
      ': ' || COALESCE(OLD.status,'?') || ' → ' || COALESCE(NEW.status,'?'),
    'info',
    NULL,
    NULL,
    NULL,
    v_company_id,
    jsonb_build_object(
      'visit_id',     NEW.id,
      'order_number', NEW.order_number,
      'old_status',   OLD.status,
      'new_status',   NEW.status,
      'org_code',     NEW.org_code,
      'source',       'db-trigger'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_visit_status ON site_visits;
CREATE TRIGGER trg_log_visit_status
  AFTER UPDATE ON site_visits
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_visit_status();

-- ── 7. Verificar triggers creados ────────────────────────────────────────────
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_log_%'
ORDER BY event_object_table, event_manipulation;

NOTIFY pgrst, 'reload schema';
-- =============================================================================
-- Después de ejecutar este SQL, los logs de formularios y visitas
-- se registran en la base de datos automáticamente, sin importar
-- si el dashboard está abierto o no.
-- =============================================================================
