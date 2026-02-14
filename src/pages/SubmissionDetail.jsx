import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Image as ImageIcon, MapPin, Calendar, Database, Smartphone, FileText, Clock, Globe } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import StructuredData from '../components/StructuredData'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload } from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'

function InfoChip({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-primary/8 p-3">
      <div className="text-[11px] text-primary/50 font-bold flex items-center gap-1.5">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="font-bold text-primary text-sm mt-1 break-words">{value || '—'}</div>
      {sub && <div className="text-[11px] text-primary/40 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function SubmissionDetail() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const loadDetail = useSubmissionsStore((s) => s.loadDetail)
  const clearDetail = useSubmissionsStore((s) => s.clearDetail)
  const submission = useSubmissionsStore((s) => s.activeSubmission)
  const assets = useSubmissionsStore((s) => s.activeAssets)
  const isLoading = useSubmissionsStore((s) => s.isLoadingDetail)

  const [photoOpen, setPhotoOpen] = useState(false)
  const [activePhoto, setActivePhoto] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    if (submissionId) loadDetail(submissionId)
    return () => clearDetail()
  }, [submissionId])

  const handleDownloadPdf = async () => {
    if (!submission) return
    setPdfLoading(true)
    try {
      await downloadSubmissionPdf(submission, assets)
    } catch (e) {
      console.error('PDF generation error:', e)
    }
    setPdfLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={28} />
        <span className="ml-3 text-sm text-primary/60 font-bold">Cargando detalle…</span>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <div className="font-extrabold text-primary">Submission no encontrada</div>
        <Link to="/submissions"><Button variant="outline" className="mt-4">Volver a Submissions</Button></Link>
      </div>
    )
  }

  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const site = extractSiteInfo(submission)
  const inspMeta = extractMeta(submission)
  const cleanPayload = getCleanPayload(submission)
  const photos = assets.filter((a) => a.public_url)

  const createdAt = submission.created_at ? new Date(submission.created_at) : null
  const updatedAt = submission.updated_at ? new Date(submission.updated_at) : null

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Top actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <Button variant="accent" onClick={handleDownloadPdf} disabled={pdfLoading}>
          <Download size={16} /> {pdfLoading ? 'Generando…' : 'Descargar PDF'}
        </Button>
      </div>

      {/* Header card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-primary/50 font-bold">{meta.label}</div>
              <div className="text-lg font-extrabold text-primary truncate">{site.nombreSitio}</div>
              <div className="text-xs text-primary/50 mt-0.5">
                Sitio: <span className="font-bold">{site.idSitio}</span>
                {site.proveedor !== '—' && <> · Proveedor: <span className="font-bold">{site.proveedor}</span></>}
              </div>
            </div>
          </div>
          <Badge tone="accent">{meta.shortLabel}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <InfoChip
            icon={MapPin}
            label="Sitio"
            value={site.nombreSitio}
            sub={site.tipoSitio || site.idSitio}
          />
          <InfoChip
            icon={Globe}
            label="Ubicación"
            value={inspMeta.lat ? `${Number(inspMeta.lat).toFixed(4)}, ${Number(inspMeta.lng).toFixed(4)}` : (site.coordenadas || '—')}
            sub={site.direccion || null}
          />
          <InfoChip
            icon={Calendar}
            label="Fecha inspección"
            value={inspMeta.date || (createdAt ? createdAt.toLocaleDateString() : '—')}
            sub={inspMeta.time ? `Hora: ${inspMeta.time}` : null}
          />
          <InfoChip
            icon={ImageIcon}
            label="Evidencia"
            value={`${photos.length} foto${photos.length !== 1 ? 's' : ''}`}
            sub={`App v${submission.app_version || '?'}`}
          />
        </div>

        {/* Secondary info row */}
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <InfoChip
            icon={Smartphone}
            label="Dispositivo"
            value={submission.device_id?.slice(0, 12) + '…'}
            sub={`Form: ${submission.form_code}`}
          />
          <InfoChip
            icon={Clock}
            label="Creado"
            value={createdAt ? createdAt.toLocaleDateString() : '—'}
            sub={createdAt ? createdAt.toLocaleTimeString() : null}
          />
          <InfoChip
            icon={Clock}
            label="Última actualización"
            value={updatedAt ? updatedAt.toLocaleDateString() : '—'}
            sub={updatedAt ? updatedAt.toLocaleTimeString() : null}
          />
          <InfoChip
            icon={Database}
            label="Versión"
            value={`App v${submission.app_version || '?'}`}
            sub={`Form v${submission.form_version || '?'}`}
          />
        </div>
      </Card>

      {/* Clean structured data */}
      {Object.keys(cleanPayload).length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-primary/70" />
            <div>
              <div className="text-sm font-extrabold text-primary">Datos de la inspección</div>
              <div className="text-[11px] text-primary/50">Información capturada por el inspector en campo</div>
            </div>
          </div>

          <div className="space-y-5">
            {Object.entries(cleanPayload).map(([sectionTitle, sectionData]) => (
              <div key={sectionTitle}>
                <div className="text-xs font-extrabold text-accent mb-2 uppercase tracking-wide">{sectionTitle}</div>
                <StructuredData data={sectionData} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Raw payload (collapsible, for debugging) */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none">
          <Card className="p-4 group-open:rounded-b-none hover:bg-primary/[0.02] transition-colors">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-primary/40" />
              <div className="text-xs font-bold text-primary/40">Payload completo (debug)</div>
              <span className="text-[10px] text-primary/30 ml-auto">Click para expandir</span>
            </div>
          </Card>
        </summary>
        <Card className="p-4 rounded-t-none border-t-0">
          <StructuredData data={submission.payload} />
        </Card>
      </details>

      {/* Photo gallery */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-primary/70" />
          <div>
            <div className="text-sm font-extrabold text-primary">Evidencia fotográfica</div>
            <div className="text-[11px] text-primary/50">
              {photos.length
                ? `${photos.length} foto${photos.length !== 1 ? 's' : ''} subida${photos.length !== 1 ? 's' : ''} al storage · Toca para ampliar`
                : 'Sin fotos subidas para esta submission'}
            </div>
          </div>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => {
              const parts = (p.asset_type || '').split(':')
              const label = parts.length >= 3 ? `${parts[1]} (${parts[2]})` : p.asset_type || 'Foto'
              return (
                <button
                  key={p.id}
                  onClick={() => { setActivePhoto({ ...p, label }); setPhotoOpen(true) }}
                  className="rounded-2xl overflow-hidden border border-primary/8 bg-white hover:shadow-soft transition-all active:scale-[0.98] text-left"
                >
                  <img src={p.public_url} alt={label} className="w-full h-32 object-cover bg-primary/5" loading="lazy" />
                  <div className="p-2.5">
                    <div className="text-[11px] font-bold text-primary truncate">{label}</div>
                    <div className="text-[10px] text-primary/40 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-primary/40">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
            <div className="text-sm font-bold">Sin fotos en storage</div>
            <div className="text-xs mt-1">Las fotos aparecerán aquí cuando el inspector las suba desde campo</div>
          </div>
        )}
      </Card>

      {/* Photo modal */}
      <Modal
        open={photoOpen}
        title={activePhoto ? `Foto · ${activePhoto.label}` : 'Foto'}
        onClose={() => setPhotoOpen(false)}
      >
        {activePhoto && (
          <div className="space-y-3">
            <img src={activePhoto.public_url} alt={activePhoto.label} className="w-full rounded-2xl border border-primary/10" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-primary/5 p-2.5">
                <div className="text-primary/50 font-bold text-[10px]">Tipo</div>
                <div className="text-primary font-bold mt-0.5">{activePhoto.asset_type}</div>
              </div>
              <div className="rounded-xl bg-primary/5 p-2.5">
                <div className="text-primary/50 font-bold text-[10px]">Fecha</div>
                <div className="text-primary font-bold mt-0.5">{new Date(activePhoto.created_at).toLocaleString()}</div>
              </div>
            </div>
            <a href={activePhoto.public_url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full">Abrir imagen original</Button>
            </a>
          </div>
        )}
      </Modal>
    </div>
  )
}
