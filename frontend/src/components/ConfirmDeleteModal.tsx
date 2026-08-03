import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  confirmVariant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-card p-6 w-full max-w-sm border border-white/10 shadow-2xl relative text-slate-100"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                confirmVariant === 'danger' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-base font-bold text-white">{title}</h3>
            </div>
            <button
              disabled={loading}
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            {message}
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="btn-secondary text-xs px-4 py-2 flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`text-xs px-4 py-2 font-bold rounded-xl flex-1 flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                confirmVariant === 'danger'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 size={14} />
                  {confirmText}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
