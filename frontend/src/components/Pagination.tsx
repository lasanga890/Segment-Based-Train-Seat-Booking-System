import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  limit: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (total === 0) return null

  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) pages.push(i)
      }
      
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-white/5 text-sm text-slate-400">
      {/* Left: Row Limit & Count Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value))
              onPageChange(1)
            }}
            className="select-field py-1 px-2 text-xs w-20"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        <span className="text-xs">
          Showing <strong className="text-slate-200">{startItem}</strong> to{' '}
          <strong className="text-slate-200">{endItem}</strong> of{' '}
          <strong className="text-slate-200">{total}</strong> entries
        </span>
      </div>

      {/* Right: Page Navigation */}
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Previous
        </button>

        {getPageNumbers().map((p, idx) => (
          typeof p === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-brand-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-1 text-slate-500 text-xs">
              {p}
            </span>
          )
        ))}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs flex items-center gap-1"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
