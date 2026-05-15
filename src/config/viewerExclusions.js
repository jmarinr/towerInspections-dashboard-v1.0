// ══════════════════════════════════════════════════════════════════════════════
// Lista negra de org_codes que el rol `viewer` global NO debe ver.
// v4.13.0 — centralizada en un único archivo para evitar replicación.
//
// Notas:
//   • Solo aplica al rol `viewer` cuando opera en modo `scope = 'global'`.
//   • Un viewer `scope = 'scoped'` siempre se restringe a su propia empresa
//     a nivel de RLS, así que esta lista es irrelevante para esos usuarios.
//   • Cualquier supervisor/admin global ve todo, incluso estos org_codes.
//   • Para agregar/quitar empresas de la lista, editar solo este archivo y
//     hacer deploy del frontend (no requiere cambios en BD).
// ══════════════════════════════════════════════════════════════════════════════
export const VIEWER_EXCLUDED_ORG_CODES = Object.freeze(['HK'])
