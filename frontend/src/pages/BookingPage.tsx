import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Home } from 'lucide-react'
import { getBooking, type Booking } from '../services/api'
import ThermalReceipt from '../components/ThermalReceipt'

export default function BookingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // All bookings passed via router state (multi-seat), or fall back to single fetch
  const stateBookings: Booking[] | undefined = (location.state as any)?.allBookings

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    if (stateBookings && stateBookings.length > 0) {
      setBookings(stateBookings)
      setLoading(false)
    } else {
      // Fallback: fetch single booking from backend (restricted to logged-in users)
      getBooking(id)
        .then(b => setBookings([b]))
        .catch(() => {
          alert('Viewing booking details is restricted to logged-in users. Please log in to view.')
          navigate('/login')
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (bookings.length === 0) return null

  const primary = bookings[0]

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 no-print" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none no-print" />

      <div className="relative z-10 w-full max-w-md my-6 space-y-4">
        {/* Success Header Animation */}
        <motion.div
          className="flex justify-center mb-3 no-print"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-emerald-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-4 no-print"
        >
          <h1 className="text-2xl font-black text-white">Booking Confirmed!</h1>
          <p className="text-slate-400 text-xs mt-1">
            Official Thermal Printer Ticket Receipt Generated
          </p>
        </motion.div>

        {/* ── 80mm POS Thermal Printer Receipt ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ThermalReceipt booking={primary} allBookings={bookings} />
        </motion.div>

        <div className="flex justify-center pt-2 no-print">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 underline font-bold"
          >
            <Home size={14} /> Back to Search / Book Another
          </button>
        </div>
      </div>
    </div>
  )
}
