import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Image as ImageIcon, MapPin, Calendar, Database, Smartphone, FileText } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import StructuredData from '../components/StructuredData'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'

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
  const payload = submission.payload || {}
  const data = payload.data || payload
  const siteInfo = data.siteInfo || data.formData || {}
  const siteName = siteInfo.nombreSitio || '—'
  const siteId = siteInfo.idSitio || '—'

  // Photos from assets table
  const photos = assets.filter((a) => a.public_url)

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
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-primary/50 font-bold">{meta.label}</div>
              <div className="text-lg font-extrabold text-primary truncate">{siteName}</div>
              <div className="text-xs text-primary/50 mt-0.5">Sitio: {siteId}</div>
            </div>
          </div>
          <Badge tone="accent">{submission.form_code}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-2xl border border-primary/8 p-3">
            <div className="text-[11px] text-primary/50 font-bold flex items-center gap-1.5"><MapPin size={12} /> Sitio</div>
            <div className="font-bold text-primary text-sm mt-1">{siteName}</div>
            <div className="text-[11px] text-primary/50">{siteId}</div>
          </div>
          <div className="rounded-2xl border border-primary/8 p-3">
            <div className="text-[11px] text-primary/50 font-bold flex items-center gap-1.5"><Smartphone size={12} /> Device</div>
            <div className="font-bold text-primary text-sm mt-1 truncate" title={submission.device_id}>{submission.device_id?.slice(0, 12)}…</div>
            <div className="text-[11px] text-primary/50">App v{submission.app_version || '?'}</div>
          </div>
          <div className="rounded-2xl border border-primary/8 p-3">
            <div className="text-[11px] text-primary/50 font-bold flex items-center gap-1.5"><Calendar size={12} /> Fechas</div>
            <div className="font-bold text-primary text-sm mt-1">{submission.updated_at ? new Date(submission.updated_at).toLocaleString() : '—'}</div>
            <div className="text-[11px] text-primary/50">Creado: {submission.created_at ? new Date(submission.created_at).toLocaleString() : '—'}</div>
          </div>
          <div className="rounded-2xl border border-primary/8 p-3">
            <div className="text-[11px] text-primary/50 font-bold flex items-center gap-1.5"><Database size={12} /> Datos</div>
            <div className="font-bold text-primary text-sm mt-1">{photos.length} fotos</div>
            <div className="text-[11px] text-primary/50">Form v{submission.form_version || '?'}</div>
          </div>
        </div>
      </Card>

      {/* Full payload */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-primary/70" />
          <div>
            <div className="text-sm font-extrabold text-primary">Datos completos</div>
            <div className="text-[11px] text-primary/50">Todos los campos capturados en el formulario</div>
          </div>
        </div>
        <StructuredData data={payload} />
      </Card>

      {/* Photo gallery */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-primary/70" />
          <div>
            <div className="text-sm font-extrabold text-primary">Evidencia fotográfica</div>
            <div className="text-[11px] text-primary/50">
              {photos.length ? `${photos.length} fotos subidas · Toca para ampliar` : 'Sin fotos subidas para esta submission'}
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActivePhoto(p); setPhotoOpen(true) }}
                className="rounded-2xl overflow-hidden border border-primary/8 bg-white hover:shadow-soft transition-all active:scale-[0.98]"
              >
                <img
                  src={p.public_url}
                  alt={p.asset_type || 'Foto'}
                  className="w-full h-28 object-cover"
                  loading="lazy"
                />
                <div className="p-2 text-left">
                  <div className="text-[11px] font-bold text-primary truncate">{p.asset_type || 'foto'}</div>
                  <div className="text-[10px] text-primary/40 truncate">{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Photo modal */}
      <Modal
        open={photoOpen}
        title={activePhoto ? `Foto · ${activePhoto.asset_type || ''}` : 'Foto'}
        onClose={() => setPhotoOpen(false)}
      >
        {activePhoto && (
          <div className="space-y-3">
            <img
              src={activePhoto.public_url}
              alt={activePhoto.asset_type || 'Foto'}
              className="w-full rounded-2xl border border-primary/10"
            />
            <div className="text-xs text-primary/60 space-y-1">
              <div><span className="font-bold">Tipo:</span> {activePhoto.asset_type}</div>
              <div><span className="font-bold">Bucket:</span> {activePhoto.bucket}</div>
              <div><span className="font-bold">Fecha:</span> {new Date(activePhoto.created_at).toLocaleString()}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
