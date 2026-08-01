import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Train, ArrowRight, Home, Printer, MapPin, User, Mail, Hash, Armchair, BadgeCheck } from 'lucide-react'
import { getBooking, type Booking } from '../services/api'

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
      // Fallback: fetch single booking
      getBooking(id)
        .then(b => setBookings([b]))
        .catch(() => navigate('/'))
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
  const totalFare = bookings.reduce((sum, b) => sum + (b.fare_lkr || 0), 0)
  const bookingRef = primary.id?.slice(0, 8).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Success animation */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            {/* Ping ring */}
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-7"
        >
          <h1 className="text-2xl font-black text-white">Booking Confirmed!</h1>
          <p className="text-slate-400 text-sm mt-1">
            {bookings.length > 1 ? `${bookings.length} seats reserved` : 'Your seat is reserved'} — have a great journey 🚂
          </p>
        </motion.div>

        {/* ── Receipt Card ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40"
        >
          {/* Receipt Header — gradient banner */}
          <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-6 py-5">
            <div className="flex items-center gap-2 text-white/60 text-xs mb-4 font-medium tracking-widest uppercase">
              <Train size={12} />
              <span>SL Railways · E-Ticket</span>
            </div>

            {/* Route */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">From</p>
                <p className="text-white font-black text-xl leading-none">{primary.start_station_name}</p>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRight size={20} className="text-white/40" />
                <div className="h-px w-12 bg-white/20 mt-1" />
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">To</p>
                <p className="text-white font-black text-xl leading-none">{primary.end_station_name}</p>
              </div>
            </div>
          </div>

          {/* Ticket perforation */}
          <div className="relative flex items-center bg-slate-900">
            <div className="absolute -left-3 w-6 h-6 rounded-full bg-slate-950" />
            <div className="flex-1 border-t-2 border-dashed border-white/10 mx-4" />
            <div className="absolute -right-3 w-6 h-6 rounded-full bg-slate-950" />
          </div>

          {/* Receipt Body */}
          <div className="bg-slate-900 px-6 py-5 space-y-4">

            {/* Passenger info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User size={14} className="text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Passenger</p>
                  <p className="text-white text-sm font-semibold">{primary.passenger_name}</p>
                </div>
              </div>
              {primary.passenger_email && (
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-brand-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Email</p>
                    <p className="text-white text-sm font-semibold truncate">{primary.passenger_email}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/5" />

            {/* Seats */}
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wide font-semibold mb-3">
                <Armchair size={12} />
                <span>Reserved Seats ({bookings.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {bookings.map((b, i) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/30 rounded-lg px-3 py-2"
                  >
                    <Armchair size={13} className="text-brand-400" />
                    <div>
                      <p className="text-brand-300 font-bold text-sm leading-none">
                        Coach {b.coach_number} · Seat {b.seat_number}
                      </p>
                      <p className="text-brand-400/70 text-[10px] mt-0.5">LKR {b.fare_lkr?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5" />

            {/* Meta row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Hash size={14} className="text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Booking Ref</p>
                  <p className="text-white text-sm font-mono font-bold">{bookingRef}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BadgeCheck size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Status</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ✓ PAID
                  </span>
                </div>
              </div>
            </div>

            {/* Total fare */}
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between">
              <span className="text-slate-400 text-sm font-medium">Total Fare Paid</span>
              <span className="text-white font-black text-xl">LKR {totalFare.toFixed(2)}</span>
            </div>
          </div>

          {/* Ticket perforation bottom */}
          <div className="relative flex items-center bg-slate-900">
            <div className="absolute -left-3 w-6 h-6 rounded-full bg-slate-950" />
            <div className="flex-1 border-t-2 border-dashed border-white/10 mx-4" />
            <div className="absolute -right-3 w-6 h-6 rounded-full bg-slate-950" />
          </div>

          {/* Actions */}
          <div className="bg-slate-900 px-6 pb-6 pt-4 flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
            >
              <Home size={15} />
              Home
            </button>
            <button
              onClick={() => window.print()}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
            >
              <Printer size={15} />
              Print Ticket
            </button>
          </div>
        </motion.div>

        {/* Tip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-slate-600 mt-4 flex items-center justify-center gap-1"
        >
          <MapPin size={12} /> Show this ticket to the conductor on board.
        </motion.p>
      </div>
    </div>
  )
}
