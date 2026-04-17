import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination component
 * Props:
 *   currentPage  — 1-based current page
 *   totalItems   — total number of items
 *   pageSize     — items per page (default 25)
 *   onPageChange — (page: number) => void
 */
export default function Pagination({ currentPage, totalItems, pageSize = 25, onPageChange }) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null

  const from = (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, totalItems)

  // Build page numbers with ellipsis
  const pages = []
  const delta = 1 // pages shown around current
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i)
    } else if (
      i === currentPage - delta - 1 ||
      i === currentPage + delta + 1
    ) {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between px-1 pt-1">
      {/* Info */}
      <span className="text-[12px] th-text-m tabular-nums">
        {from}–{to} de {totalItems}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border th-border
            th-bg-card th-text-m hover:text-sky-600 hover:border-sky-400 transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-inherit disabled:hover:border-inherit"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-[12px] th-text-m select-none">…</span>
            : <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`h-8 w-8 flex items-center justify-center rounded-lg text-[12px] font-semibold border transition-colors
                  ${p === currentPage
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'th-bg-card th-text-s th-border hover:text-sky-600 hover:border-sky-400'
                  }`}
              >
                {p}
              </button>
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border th-border
            th-bg-card th-text-m hover:text-sky-600 hover:border-sky-400 transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-inherit disabled:hover:border-inherit"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
