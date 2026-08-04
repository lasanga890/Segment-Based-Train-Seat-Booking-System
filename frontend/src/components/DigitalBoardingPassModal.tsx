import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { type UserBooking } from '../services/api'
import ThermalReceipt from './ThermalReceipt'

interface Props {
  booking: UserBooking
  onClose: () => void
}

export default function DigitalBoardingPassModal({ booking, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl relative my-auto"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 no-print">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Thermal Printer E-Ticket Receipt
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <ThermalReceipt booking={booking} onClose={onClose} />
      </motion.div>
    </motion.div>
  )
}
