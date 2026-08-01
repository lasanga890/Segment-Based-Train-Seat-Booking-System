import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Train, ArrowRight, Home, Printer, MapPin, User, Mail, Hash, Armchair, BadgeCheck, Clock } from 'lucide-react'
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
      // Fallback: fetch single booking from backend
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
  const departureTime = primary.departure_time ? primary.departure_time.slice(0, 5) : null

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md my-8">
        {/* Success Header Animation */}
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
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-black text-white">Booking Confirmed!</h1>
          <p className="text-slate-400 text-sm mt-1">
            {bookings.length > 1 ? `${bookings.length} seats reserved` : 'Your seat is reserved'} — ready to board! 🚂
          </p>
        </motion.div>

        {/* ── Clean E-Ticket Receipt Card ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-slate-900"
        >
          {/* Header Banner: Train Name & Train Time */}
          <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-6 text-white">
            <div className="flex items-center justify-between text-xs text-white/80 font-medium mb-3">
              <div className="flex items-center gap-1.5 uppercase tracking-wider">
                <Train size={14} />
                <span>{primary.train_name || 'SL Railways'} {primary.train_number ? `(#${primary.train_number})` : ''}</span>
              </div>
              <span className="inline-flex items-center gap-1 bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">
                ✓ PAID
              </span>
            </div>

            {/* Train Departure Time */}
            {departureTime && (
              <div className="flex items-center gap-1.5 text-xs text-brand-200 mb-4 bg-black/20 w-fit px-2.5 py-1 rounded-md border border-white/10 font-semibold">
                <Clock size={13} className="text-brand-300" />
                <span>Departure Time: {departureTime}</span>
              </div>
            )}

            {/* Route: Start & End Station */}
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-white/70 text-[10px] uppercase tracking-wider font-semibold">Start Station</p>
                <p className="text-white font-black text-xl leading-tight">{primary.start_station_name}</p>
              </div>
              <div className="flex flex-col items-center px-2">
                <ArrowRight size={20} className="text-white/60" />
              </div>
              <div className="text-right">
                <p className="text-white/70 text-[10px] uppercase tracking-wider font-semibold">End Station</p>
                <p className="text-white font-black text-xl leading-tight">{primary.end_station_name}</p>
              </div>
            </div>
          </div>

          {/* Ticket Perforation Divider */}
          <div className="relative flex items-center bg-slate-900">
            <div className="absolute -left-3 w-6 h-6 rounded-full bg-slate-950 border-r border-white/10" />
            <div className="flex-1 border-t-2 border-dashed border-white/15 mx-4" />
            <div className="absolute -right-3 w-6 h-6 rounded-full bg-slate-950 border-l border-white/10" />
          </div>

          {/* Receipt Body */}
          <div className="p-6 space-y-5">
            {/* 🪑 PROMINENT SEAT NUMBER(S) SECTION */}
            <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Armchair size={14} className="text-brand-400" />
                Your Confirmed Seat Number(s)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {bookings.map(b => (
                  <div
                    key={b.id}
                    className="bg-brand-600/30 border border-brand-400/50 rounded-lg px-3.5 py-2 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-md bg-brand-500/30 flex items-center justify-center text-brand-300">
                      <Armchair size={16} />
                    </div>
                    <div>
                      <p className="text-white font-black text-base leading-none">
                        Coach {b.coach_number} · Seat #{b.seat_number}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5 font-mono">
                        LKR {b.fare_lkr?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Passenger & Ref Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <User size={15} className="text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Passenger</p>
                  <p className="text-white text-sm font-bold">{primary.passenger_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Hash size={15} className="text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Booking Ref</p>
                  <p className="text-white text-sm font-mono font-bold">{bookingRef}</p>
                </div>
              </div>
            </div>

            {primary.passenger_email && (
              <div className="flex items-start gap-2.5 pt-1">
                <Mail size={15} className="text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Email</p>
                  <p className="text-slate-200 text-xs font-medium">{primary.passenger_email}</p>
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-2" />

            {/* Total Fare & Payment Status */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium">Total Amount Paid</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <BadgeCheck size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Payment Complete</span>
                </div>
              </div>
              <span className="text-white font-black text-2xl">LKR {totalFare.toFixed(2)}</span>
            </div>
          </div>

          {/* Ticket Perforation Bottom */}
          <div className="relative flex items-center bg-slate-900">
            <div className="absolute -left-3 w-6 h-6 rounded-full bg-slate-950 border-r border-white/10" />
            <div className="flex-1 border-t-2 border-dashed border-white/15 mx-4" />
            <div className="absolute -right-3 w-6 h-6 rounded-full bg-slate-950 border-l border-white/10" />
          </div>

          {/* Actions */}
          <div className="p-6 pt-4 flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2 py-3"
            >
              <Home size={16} />
              Book Another
            </button>
            <button
              onClick={() => window.print()}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 py-3"
            >
              <Printer size={16} />
              Print Ticket
            </button>
          </div>
        </motion.div>

        {/* Footnote */}
        <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1.5">
          <MapPin size={13} className="text-brand-400" /> Please present this ticket to the train inspector on request.
        </p>
      </div>
    </div>
  )
}
