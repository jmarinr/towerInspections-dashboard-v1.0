import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, ArrowRight } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'

function extractSiteInfo(submission) {
  const payload = submission.payload || {}
  const data = payload.data || payload
  const siteInfo = data.siteInfo || data.formData || {}
  return {
    siteName: siteInfo.nombreSitio || siteInfo.nombreSitio || '—',
    siteId: siteInfo.idSitio || '—',
    proveedor: siteInfo.proveedor || '—',
  }
}

function SubmissionCard({ submission }) {
  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const { siteName, siteId } = extractSiteInfo(submission)
  const updatedAt = submission.updated_at ? new Date(submission.updated_at).toLocaleString() : '—'
  const createdAt = submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '—'

  return (
    <Card className="p-4 hover:shadow-soft transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-primary text-sm truncate">{siteName}</div>
            <div className="text-[11px] text-primary/50 mt-0.5 truncate">
              {meta.shortLabel} · Sitio: <span className="font-bold">{siteId}</span>
            </div>
          </div>
        </div>
        <Badge tone="neutral" className="flex-shrink-0">
          {submission.app_version ? `v${submission.app_version}` : '—'}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-primary/50">
        <div>
          <span className="font-bold">Creado:</span> {createdAt}
        </div>
        <div>
          <span className="font-bold">Actualizado:</span> {updatedAt}
        </div>
        <div className="truncate">
          <span className="font-bold">Device:</span> {submission.device_id?.slice(0, 8)}…
        </div>
        <div>
          <span className="font-bold">Form:</span> {submission.form_code}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Link to={`/submissions/${submission.id}`}>
          <Button variant="outline">
            <Eye size={14} /> Ver detalle <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export default function Submissions() {
  const load = useSubmissionsStore((s) => s.load)
  const isLoading = useSubmissionsStore((s) => s.isLoading)
  const submissions = useSubmissionsStore((s) => s.submissions)
  const filterFormCode = useSubmissionsStore((s) => s.filterFormCode)
  const search = useSubmissionsStore((s) => s.search)
  const setFilter = useSubmissionsStore((s) => s.setFilter)
  const getFiltered = useSubmissionsStore((s) => s.getFiltered)
  const error = useSubmissionsStore((s) => s.error)

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => getFiltered(), [submissions, filterFormCode, search])

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-extrabold text-primary">Submissions</div>
            <div className="text-[11px] text-primary/50 mt-0.5">Todas las inspecciones enviadas por los inspectores</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <div className="absolute left-3.5 top-[38px] text-primary/40 pointer-events-none">
              <Search size={16} />
            </div>
            <Input
              label="Buscar"
              value={search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Sitio, ID, device…"
              className="pl-10"
            />
          </div>

          <Select
            label="Tipo de formulario"
            value={filterFormCode}
            onChange={(e) => setFilter({ filterFormCode: e.target.value })}
          >
            <option value="all">Todos los tipos</option>
            {Object.entries(FORM_TYPES).map(([code, meta]) => (
              <option key={code} value={code}>{meta.label}</option>
            ))}
          </Select>
        </div>

        <div className="mt-3 text-[11px] text-primary/50">
          Mostrando <span className="font-bold">{filtered.length}</span> de <span className="font-bold">{submissions.length}</span> submissions
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 border-danger/20 bg-danger-light">
          <div className="text-sm text-danger font-bold">{error}</div>
          <Button variant="outline" className="mt-2" onClick={() => load(true)}>Reintentar</Button>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} />
          <span className="ml-3 text-sm text-primary/60 font-bold">Cargando submissions…</span>
        </div>
      )}

      {/* List */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          title="Sin submissions"
          description={search || filterFormCode !== 'all' ? 'Prueba ajustando los filtros' : 'Aún no hay inspecciones registradas en Supabase'}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((s) => (
          <SubmissionCard key={s.id} submission={s} />
        ))}
      </div>
    </div>
  )
}
