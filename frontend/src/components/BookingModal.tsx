import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Clock, CheckCircle, AlertCircle, Train } from 'lucide-react'
import { confirmBooking, type SeatAvailability, type Station } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface Props {
  seat: SeatAvailability
  hold: { hold_id: string; expires_at: string; fare: any }
  fromStation: Station
  toStation: Station
  onClose: () => void
}

export default function BookingModal({ seat, hold, fromStation, toStation, onClose }: Props) {
  const navigate = useNavigate()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 min in seconds
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Countdown timer
  useEffect(() => {
    const expiresAt = new Date(hold.expires_at).getTime()
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        clearInterval(timerRef.current)
        alert('Your seat hold has expired. Please select a seat again.')
        onClose()
      }
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [hold.expires_at])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const timerColor = timeLeft < 60 ? 'text-red-400' : timeLeft < 120 ? 'text-amber-400' : 'text-green-400'

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Passenger name is required'); return }
    setLoading(true)
    setError('')
    try {
      const booking = await confirmBooking({
        hold_id:          hold.hold_id,
        passenger_name:   name.trim(),
        passenger_email:  email.trim(),
        start_station_id: fromStation.id,
        end_station_id:   toStation.id,
      })
      navigate(`/booking/${booking.id}`)
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.')
      setLoading(false)
    }
  }

  const fare = hold.fare

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Train size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm">Confirm Booking</h2>
              <p className="text-xs text-slate-500">Coach {seat.coach_number} · Seat {seat.seat_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Countdown */}
            <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${timerColor}`}>
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Fare Breakdown ─────────────────────────────────────────── */}
        <div className="p-5 bg-slate-800/50">
          <div className="flex items-center gap-2 text-sm mb-3">
            <span className="text-slate-300 font-medium">{fromStation.name}</span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-300 font-medium">{toStation.name}</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Segments traversed</span>
              <span className="text-slate-300">{fare?.stations_traversed}</span>
            </div>
            <div className="flex justify-between">
              <span>Base rate per segment</span>
              <span className="text-slate-300">LKR {fare?.base_rate_lkr?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{fare?.coach_type} multiplier</span>
              <span className="text-slate-300">{fare?.multiplier}×</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-sm">
              <span className="text-slate-200">Total Fare</span>
              <span className="text-brand-300">LKR {fare?.total_fare_lkr?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Form ───────────────────────────────────────────────────── */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Passenger Name <span className="text-red-400">*</span>
            </label>
            <input
              id="passenger-name"
              type="text"
              className="input-field text-sm"
              placeholder="e.g. Kamal Perera"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Email (optional)
            </label>
            <input
              id="passenger-email"
              type="email"
              className="input-field text-sm"
              placeholder="kamal@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 text-sm"
            >
              Cancel
            </button>
            <button
              id="confirm-booking-btn"
              type="submit"
              disabled={loading || timeLeft === 0}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
