/**
 * DamageReport.jsx
 * Reporte de Daños por Sitio.
 * Comentario de auditoría: globo indicador + tooltip en hover + modal de edición al click.
 */

import { useState, useRef, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Clock, DollarSign, LayoutList, AlertOctagon, MessageSquare, Plus } from 'lucide-react'
import Badge      from '../../components/ui/Badge'
import Card       from '../../components/ui/Card'
import Select     from '../../components/ui/Select'
import Spinner    from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import Modal      from '../../components/ui/Modal'

// ── KPI cards ─────────────────────────────────────────────────────────────────
function KpiPrimary({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl p-5 border th-shadow flex flex-col gap-3"
      style={{ background: 'var(--stat-accent-bg)', borderColor: 'transparent' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.15)' }}>
        <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--stat-accent-text)' }} />
      </div>
      <div>
        <div className="text-[28px] font-bold leading-none tabular-nums"
          style={{ color: 'var(--stat-accent-text)' }}>{value}</div>
        <div className="text-[12px] font-medium mt-1"
          style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</div>
      </div>
    </div>
  )
}

function KpiAccent({ icon: Icon, label, value, borderColor, valueColor }) {
  return (
    <div className="rounded-2xl p-4 th-shadow flex items-center gap-3 border-l-4"
      style={{ background: 'var(--bg-card)', borderColor, borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
      <Icon size={18} strokeWidth={1.8} style={{ color: borderColor, flexShrink: 0 }} />
      <div>
        <div className="text-[22px] font-bold leading-none tabular-nums" style={{ color: valueColor }}>{value}</div>
        <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  )
}

// ── Status dropdown pill ──────────────────────────────────────────────────────
const STATUS_STYLES = {
  pendiente: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  cotizado:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  reparado:  { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
}
const STATUS_LABELS = { pendiente: 'Pendiente', cotizado: 'Cotizado', reparado: 'Reparado' }

function StatusPill({ value, onChange }) {
  const s = STATUS_STYLES[value] || STATUS_STYLES.pendiente
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[11px] font-semibold rounded-full px-2.5 py-1 border outline-none cursor-pointer"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      <option value="pendiente">Pendiente</option>
      <option value="cotizado">Cotizado</option>
      <option value="reparado">Reparado</option>
    </select>
  )
}

// ── Comment cell — globo indicador + tooltip + modal ──────────────────────────
function CommentCell({ damageKey, submissionId, comment, onSave }) {
  const [hover,    setHover]    = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft,    setDraft]    = useState(comment || '')
  const hasComment = comment && comment.trim() !== ''

  const openModal = () => {
    setDraft(comment || '')
    setModalOpen(true)
  }

  const handleSave = () => {
    onSave(damageKey, submissionId, draft)
    setModalOpen(false)
  }

  const handleKeyDown = e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setModalOpen(false)
  }

  return (
    <>
      <div className="relative flex justify-center">
        <button
          onClick={openModal}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-all"
          style={{
            background:  hasComment ? 'rgba(2,132,199,0.10)' : 'var(--bg-base)',
            border:      `1px solid ${hasComment ? 'rgba(2,132,199,0.25)' : 'var(--border)'}`,
            color:       hasComment ? '#0284C7' : 'var(--text-muted)',
          }}
          title={hasComment ? 'Ver / editar comentario' : 'Agregar comentario'}>
          {hasComment
            ? <MessageSquare size={13} strokeWidth={2} />
            : <Plus size={13} strokeWidth={2} />}

          {/* Globo indicador */}
          {hasComment && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: '#0284C7', border: '1.5px solid var(--bg-card)' }} />
          )}
        </button>

        {/* Tooltip en hover */}
        {hover && hasComment && (
          <div
            className="absolute bottom-full mb-2 left-1/2 z-30 rounded-xl px-3 py-2 text-[11px] leading-relaxed pointer-events-none"
            style={{
              transform: 'translateX(-50%)',
              background: 'var(--ink, #0F1F33)',
              color: '#fff',
              maxWidth: 240,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}>
            {comment}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
              style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--ink, #0F1F33)' }} />
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {modalOpen && (
        <Modal
          title={hasComment ? 'Editar comentario de auditoría' : 'Agregar comentario de auditoría'}
          onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe aquí el comentario de auditoría…"
              rows={5}
              className="w-full text-[13px] rounded-xl px-3 py-2.5 outline-none resize-none transition-all"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
              }}
              onFocus={e => e.target.style.borderColor = '#0284C7'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                ⌘ + Enter para guardar
              </span>
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all th-text-m"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  Cancelar
                </button>
                <button onClick={handleSave}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
                  style={{ background: '#0284C7', boxShadow: '0 2px 8px rgba(2,132,199,0.25)' }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

const Dash = () => <span style={{ color: 'var(--text-muted)' }}>—</span>

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DamageReport({ hookData }) {
  const {
    paginatedItems,
    totalDamages, totalPending, totalRepaired, totalQuoted, totalRegular, totalMalo,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    updateStatus, updateComment,
    isLoading, error,
  } = hookData

  const from = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, totalFiltered)

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner size={16} /></div>

  if (error) return (
    <div className="rounded-2xl border px-6 py-8 text-center th-bg-card" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[13px] th-text-m">Error al cargar datos: {error}</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiPrimary  icon={AlertTriangle} label="Total Daños"  value={totalDamages} />
        <KpiAccent   icon={Clock}         label="Pendientes"   value={totalPending}  borderColor="#f59e0b" valueColor="#b45309" />
        <KpiAccent   icon={CheckCircle}   label="Reparados"    value={totalRepaired} borderColor="#10b981" valueColor="#065f46" />
        <KpiAccent   icon={DollarSign}    label="Cotizados"    value={totalQuoted}   borderColor="#0284C7" valueColor="#075985" />
        <KpiAccent   icon={AlertTriangle} label="Regular"      value={totalRegular}  borderColor="#f97316" valueColor="#c2410c" />
        <KpiAccent   icon={AlertOctagon}  label="Malo"         value={totalMalo}     borderColor="#ef4444" valueColor="#b91c1c" />
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.site} onChange={e => setFilter('site', e.target.value)}>
              <option value="">Todos los Sitios</option>
              {filterOptions.sites.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.category} onChange={e => setFilter('category', e.target.value)}>
              <option value="">Todas las Categorías</option>
              {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">Todos los Estados</option>
              {filterOptions.statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
          </div>
          <div className="whitespace-nowrap text-[12px] th-text-m font-medium px-1 flex-shrink-0">
            Mostrando <span className="font-bold th-text-p mx-1">
              {totalFiltered === 0 ? 0 : `${from}–${to}`}
            </span> de <span className="font-bold th-text-p mx-1">{totalFiltered}</span> daños
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto">
          {paginatedItems.length === 0 ? (
            <EmptyState icon={LayoutList} title="Sin daños registrados"
              description="No hay daños que coincidan con los filtros seleccionados." />
          ) : (
            <table className="w-full border-collapse text-[12px]" style={{ minWidth: 820 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                  {[
                    ['ID Sitio','left'], ['Formulario Origen','left'],
                    ['Descripción del Daño','left'], ['Categoría','left'],
                    ['Estado','left'], ['Nota','center'],
                  ].map(([h, align]) => (
                    <th key={h}
                      className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: align }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, idx) => (
                  <tr key={item.damageKey || idx}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    {/* ID Sitio */}
                    <td className="px-4 py-3 font-mono font-semibold text-[12px] whitespace-nowrap"
                      style={{ color: 'var(--accent)' }}>
                      {item.idSitio || '—'}
                    </td>

                    {/* Formulario origen */}
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] th-text-p">
                      {item.formLabel || '—'}
                    </td>

                    {/* Descripción */}
                    <td className="px-4 py-3 th-text-p" style={{ maxWidth: 240, wordBreak: 'break-word' }}>
                      {item.description || <Dash />}
                    </td>

                    {/* Categoría */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.category === 'Malo'
                        ? <Badge tone="danger">Malo</Badge>
                        : <Badge tone="warning">Regular</Badge>}
                    </td>

                    {/* Estado — dropdown pill */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusPill
                        value={item.status || 'pendiente'}
                        onChange={val => updateStatus(item.damageKey, item.submissionId, val)}
                      />
                    </td>

                    {/* Nota auditoría — globo + tooltip + modal */}
                    <td className="px-4 py-3 text-center">
                      <CommentCell
                        damageKey={item.damageKey}
                        submissionId={item.submissionId}
                        comment={item.auditComment}
                        onSave={updateComment}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalFiltered > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-2 text-[12px] th-text-m">
              <span>Filas por página:</span>
              {[10, 25, 50].map(size => (
                <button key={size} onClick={() => setPageSize(size)}
                  className="h-7 px-2.5 rounded-lg text-[12px] font-semibold border transition-colors"
                  style={{
                    background:  pageSize === size ? 'var(--accent)' : 'var(--bg-card)',
                    color:       pageSize === size ? '#fff' : 'var(--text-secondary)',
                    borderColor: pageSize === size ? 'var(--accent)' : 'var(--border)',
                  }}>
                  {size}
                </button>
              ))}
            </div>
            <Pagination currentPage={currentPage} totalItems={totalFiltered}
              pageSize={pageSize} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
