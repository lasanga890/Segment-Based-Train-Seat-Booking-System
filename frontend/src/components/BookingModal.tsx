import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Clock, CheckCircle, AlertCircle, Train, Armchair } from 'lucide-react'
import { confirmBooking, releaseHold, type SeatAvailability, type Station, type MultiHoldItem } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface Props {
  seats: SeatAvailability[]
  holds: MultiHoldItem[]
  fromStation: Station
  toStation: Station
  onClose: () => void
}

export default function BookingModal({ seats, holds, fromStation, toStation, onClose }: Props) {
  const navigate = useNavigate()
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [timeLeft, setTimeLeft] = useState(300)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Use the earliest expiry across all holds for the countdown
  const earliestExpiry = holds.reduce((min, h) => {
    const t = new Date(h.expires_at).getTime()
    return t < min ? t : min
  }, new Date(holds[0].expires_at).getTime())

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((earliestExpiry - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        clearInterval(timerRef.current)
        alert('Your seat hold has expired. Please select seats again.')
        onClose()
      }
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [earliestExpiry])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const timerColor = timeLeft < 60 ? 'text-red-400' : timeLeft < 120 ? 'text-amber-400' : 'text-green-400'

  const totalFare = holds.reduce((sum, h) => sum + (h.fare?.total_fare_lkr || 0), 0)

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Passenger name is required'); return }
    setLoading(true)
    setError('')
    try {
      // Confirm all holds — each becomes a separate booking row per seat
      const bookingPromises = holds.map(h =>
        confirmBooking({
          hold_id:          h.hold_id,
          passenger_name:   name.trim(),
          passenger_email:  email.trim(),
          start_station_id: fromStation.id,
          end_station_id:   toStation.id,
        })
      )
      const bookings = await Promise.all(bookingPromises)
      // Navigate to confirmation page with first booking ID (all share same passenger)
      navigate(`/booking/${bookings[0].id}`, {
        state: { allBookings: bookings }
      })
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.')
      setLoading(false)
    }
  }

  const handleClose = async () => {
    // Release all holds when user cancels
    await Promise.allSettled(holds.map(h => releaseHold(h.hold_id)))
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Train size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm">Confirm Booking</h2>
              <p className="text-xs text-slate-500">{holds.length} seat{holds.length > 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${timerColor}`}>
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
            <button onClick={handleClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Route & Seats ───────────────────────────────────────── */}
          <div className="p-5 bg-slate-800/50">
            <div className="flex items-center gap-2 text-sm mb-4">
              <span className="text-slate-300 font-medium">{fromStation.name}</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300 font-medium">{toStation.name}</span>
            </div>

            {/* Selected Seats Summary */}
            <div className="flex flex-wrap gap-2 mb-4">
              {seats.map(s => (
                <div
                  key={s.seat_id}
                  className="flex items-center gap-1.5 bg-brand-500/20 border border-brand-500/30 rounded-lg px-2.5 py-1.5 text-xs text-brand-300"
                >
                  <Armchair size={12} />
                  <span className="font-semibold">Coach {s.coach_number} · Seat {s.seat_number}</span>
                </div>
              ))}
            </div>

            {/* Fare per seat breakdown */}
            <div className="space-y-2">
              {holds.map((h, i) => {
                const seat = seats[i]
                return (
                  <div key={h.hold_id} className="flex justify-between items-center text-xs text-slate-400">
                    <span>C{seat?.coach_number}·S{seat?.seat_number} fare</span>
                    <span className="text-slate-300">LKR {h.fare?.total_fare_lkr?.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-white/10 mt-3 pt-3 flex justify-between font-semibold text-sm">
              <span className="text-slate-200">Total Fare ({holds.length} seat{holds.length > 1 ? 's' : ''})</span>
              <span className="text-brand-300">LKR {totalFare.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Form ───────────────────────────────────────────────── */}
          <form id="confirm-form" onSubmit={handleConfirm} className="p-5 space-y-4">
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
          </form>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="p-5 border-t border-white/5 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary flex-1 text-sm"
          >
            Cancel
          </button>
          <button
            id="confirm-booking-btn"
            type="submit"
            form="confirm-form"
            disabled={loading || timeLeft === 0}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} />
                Confirm {holds.length > 1 ? `${holds.length} Bookings` : 'Booking'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
