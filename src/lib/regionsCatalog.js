import { create } from 'zustand'
import { supabase } from './supabaseClient'

/**
 * regionsCatalog.js — SINGLE SOURCE OF TRUTH para nombres de región.
 *
 * REGLA (no romper jamás):
 *   `order_number` es OPACO. NUNCA se parsea para deducir nada.
 *     · región  → usar `region_id` (UUID) + este catalog para el nombre
 *     · año/mes  → usar `started_at`
 *     · empresa  → usar `org_code`
 *     · sitio    → usar `site_id`
 *
 * El catalog se carga con un simple `select('id, name, internal')`. La RLS de
 * la tabla `regions` decide qué filas devuelve según el rol/scope del usuario.
 * NO se filtra en cliente. La RLS está alineada con la de `site_visits` y
 * `submissions`: toda región que aparezca en una fila visible está en el catalog.
 *
 * Estados de resolución de nombre:
 *   region_id = null / región eliminada → '—'
 *   catalog aún no cargado              → '…'
 *   (nunca fallback a parseo de order_number)
 */
export const useRegionsCatalog = create((set, get) => ({
  byId:    new Map(),   // Map<uuid, { id, name, internal }>
  list:    [],          // [{ id, name, internal }] ordenado por name (solo lo que devuelve la RLS)
  loaded:  false,
  loading: false,
  error:   null,

  load: async (force = false) => {
    if (get().loading) return
    if (!force && get().loaded) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, internal')
        .order('name')
      if (error) { set({ loading: false, error: error.message }); return }
      const list = data || []
      const byId = new Map(list.map(r => [r.id, r]))
      set({ byId, list, loaded: true, loading: false, error: null })
    } catch (e) {
      set({ loading: false, error: e?.message || 'Error al cargar regiones' })
    }
  },

  invalidate: () => set({ loaded: false }),
}))

/**
 * Resolver de nombre NO reactivo (seguro fuera de render, p. ej. en builders).
 * En componentes/hooks que deban refrescar al cargar el catalog, suscribirse a
 * `useRegionsCatalog(s => s.byId)` y usar `makeRegionNameResolver(byId, loaded)`.
 */
export function getRegionName(regionId) {
  if (regionId == null) return '—'
  const { byId, loaded } = useRegionsCatalog.getState()
  if (!loaded) return '…'
  const r = byId.get(regionId)
  return r ? r.name : '—'
}

/** Crea un resolver reactivo a partir del Map suscrito en un componente/hook. */
export function makeRegionNameResolver(byId, loaded) {
  return (regionId) => {
    if (regionId == null) return '—'
    if (!loaded) return '…'
    const r = byId.get(regionId)
    return r ? r.name : '—'
  }
}
