import { useState, useEffect } from 'react'
import { Plus, Pencil, MapPin, ToggleLeft, ToggleRight, X, Check, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'
import { useAdminStore } from '../../store/useAdminStore'

// ── Modal crear / editar región ───────────────────────────────────────────────
function RegionModal({ region, onSave, onClose }) {
  const [form, setForm] = useState({
    site_id: region?.site_id || '',
    name:    region?.name    || '',
    lat:     region?.lat     ?? '',
    lng:     region?.lng     ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const isNew = !region

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.site_id.trim()) { setError('El ID de sitio es obligatorio'); return }
    if (!form.name.trim())    { setError('El nombre del sitio es obligatorio'); return }
    setSaving(true); setError('')
    const payload = {
      site_id: form.site_id.trim().toUpperCase(),
      name:    form.name.trim(),
      lat:     form.lat !== '' ? parseFloat(form.lat) : null,
      lng:     form.lng !== '' ? parseFloat(form.lng) : null,
    }
    const { error: err } = isNew
      ? await supabase.from('regions').insert(payload)
      : await supabase.from('regions').update(payload).eq('id', region.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  const inputClass = `w-full px-3 py-2 text-[13px] rounded-lg th-bg-card th-text-p
    focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all`
  const labelClass = 'block text-[11px] font-semibold th-text-m uppercase tracking-wider mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl th-shadow"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: '#0284C718', color: '#0284C7' }}>
              <MapPin size={13} />
            </div>
            <h2 className="text-[15px] font-semibold th-text-p">
              {isNew ? 'Nueva región' : 'Editar región'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg th-text-m hover:th-text-p"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg text-[12px] font-medium"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>ID de Sitio <span style={{ color: '#dc2626' }}>*</span></label>
            <input className={inputClass} style={{ border: '1px solid var(--border)' }}
              value={form.site_id} onChange={e => f('site_id', e.target.value)}
              placeholder="Ej: PTI-PA-001" />
            <p className="mt-1 text-[11px] th-text-m">Se guardará en mayúsculas. Debe ser único.</p>
          </div>

          <div>
            <label className={labelClass}>Nombre del Sitio <span style={{ color: '#dc2626' }}>*</span></label>
            <input className={inputClass} style={{ border: '1px solid var(--border)' }}
              value={form.name} onChange={e => f('name', e.target.value)}
              placeholder="Ej: Torre Ciudad de Panamá Centro" />
          </div>

          <div>
            <label className={labelClass}>Coordenadas <span className="normal-case font-normal">(opcional — se agregará mapa próximamente)</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] th-text-m mb-1">Latitud</p>
                <input type="number" step="any" className={inputClass} style={{ border: '1px solid var(--border)' }}
                  value={form.lat} onChange={e => f('lat', e.target.value)}
                  placeholder="Ej: 8.9936" />
              </div>
              <div>
                <p className="text-[11px] th-text-m mb-1">Longitud</p>
                <input type="number" step="any" className={inputClass} style={{ border: '1px solid var(--border)' }}
                  value={form.lng} onChange={e => f('lng', e.target.value)}
                  placeholder="Ej: -79.5197" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4"
          style={{ borderTop: '1px solid var(--border-light)' }}>
          <button onClick={onClose}
            className="px-4 py-2 text-[13px] rounded-lg th-text-m th-bg-base hover:th-bg-card transition-colors"
            style={{ border: '1px solid var(--border)' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold rounded-lg text-white flex items-center gap-1.5 transition-opacity disabled:opacity-60"
            style={{ background: '#0284C7' }}>
            {saving ? <><Spinner size={13} />Guardando…</> : <><Check size={13} />{isNew ? 'Crear región' : 'Guardar'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Regions() {
  const regions        = useAdminStore(s => s.regions)
  const loading        = useAdminStore(s => s.regionsLoading)
  const loadRegions    = useAdminStore(s => s.loadRegions)
  const invalidateRegions = useAdminStore(s => s.invalidateRegions)
  const invalidateCompanies = useAdminStore(s => s.invalidateCompanies)

  const [modal,  setModal]  = useState(null) // null | 'new' | region-object
  const [search, setSearch] = useState('')

  useEffect(() => { loadRegions() }, [])

  const filtered = regions.filter(r =>
    r.site_id.toLowerCase().includes(search.toLowerCase()) ||
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (region) => {
    await supabase.from('regions').update({ active: !region.active }).eq('id', region.id)
    invalidateRegions()
    loadRegions(true)
  }

  const onSave = () => {
    setModal(null)
    invalidateRegions()
    invalidateCompanies() // companies tienen join con regions
    loadRegions(true)
  }

  const companyCount = (region) =>
    region.company_regions?.length || 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold th-text-p">Regiones</h1>
          <p className="text-[12px] th-text-m mt-0.5">
            {regions.length} sitio{regions.length !== 1 ? 's' : ''} registrado{regions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModal('new')}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 flex-shrink-0"
          style={{ background: '#0284C7' }}>
          <Plus size={14} /> Nueva región
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-xs">
        <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 th-text-m pointer-events-none" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por ID o nombre…"
          className="w-full h-9 pl-9 pr-3 text-[13px] th-bg-card th-text-p rounded-lg
            focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
          style={{ border: '1px solid var(--border)' }} />
      </div>

      {/* Tabla */}
      {loading && regions.length === 0 ? (
        <div className="flex justify-center py-16"><Spinner size={16} /></div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['ID Sitio', 'Nombre', 'Coordenadas', 'Empresas', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold th-text-m uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] th-text-m">
                    {search ? 'Sin resultados para tu búsqueda.' : 'Sin regiones registradas aún.'}
                  </td>
                </tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}
                  style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>

                  {/* ID Sitio */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: '#0284C714', color: '#0284C7' }}>
                      {r.site_id}
                    </span>
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-3 font-medium th-text-p max-w-[220px]">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="flex-shrink-0" style={{ color: '#0284C7' }} />
                      <span className="truncate">{r.name}</span>
                    </div>
                  </td>

                  {/* Coordenadas */}
                  <td className="px-4 py-3">
                    {r.lat && r.lng ? (
                      <span className="font-mono text-[11px] th-text-m">
                        {Number(r.lat).toFixed(5)}, {Number(r.lng).toFixed(5)}
                      </span>
                    ) : (
                      <span className="text-[11px] th-text-m italic">Sin coordenadas</span>
                    )}
                  </td>

                  {/* Empresas asociadas */}
                  <td className="px-4 py-3">
                    {companyCount(r) === 0 ? (
                      <span className="text-[11px] th-text-m italic">Sin empresa</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.company_regions.slice(0, 3).map(cr => (
                          <span key={cr.company_id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <Building2 size={9} />{cr.companies?.org_code || cr.companies?.name}
                          </span>
                        ))}
                        {companyCount(r) > 3 && (
                          <span className="text-[10px] th-text-m">+{companyCount(r) - 3}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(r)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors"
                      style={{ color: r.active ? '#16a34a' : 'var(--text-muted)' }}>
                      {r.active
                        ? <><ToggleRight size={16} />Activa</>
                        : <><ToggleLeft size={16} />Inactiva</>}
                    </button>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <button onClick={() => setModal(r)}
                      className="p-1.5 rounded-lg th-text-m hover:th-text-p transition-colors"
                      style={{ border: '1px solid var(--border)' }}
                      title="Editar">
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <RegionModal
          region={modal === 'new' ? null : modal}
          onSave={onSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
