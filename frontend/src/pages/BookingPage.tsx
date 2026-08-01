import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Train, ArrowRight, Download } from 'lucide-react'
import { getBooking, type Booking } from '../services/api'

export default function BookingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getBooking(id)
      .then(setBooking)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!booking) return null

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-md"
      >
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 12 }}
            className="w-20 h-20 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle size={40} className="text-green-400" />
          </motion.div>
        </div>

        <h1 className="text-2xl font-black text-white text-center mb-1">Booking Confirmed!</h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          Your seat has been reserved. Have a great journey!
        </p>

        {/* Ticket Card */}
        <div className="glass-card overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-brand-700 to-brand-600 p-5">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-3">
              <Train size={12} />
              <span>SL RAILWAYS · SCENIC BOOKING</span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-white font-black text-2xl">{booking.start_station_name?.split(' ')[0]}</p>
                <p className="text-white/70 text-xs">{booking.start_station_name}</p>
              </div>
              <ArrowRight size={20} className="text-white/50 flex-shrink-0" />
              <div>
                <p className="text-white font-black text-2xl">{booking.end_station_name?.split(' ')[0]}</p>
                <p className="text-white/70 text-xs">{booking.end_station_name}</p>
              </div>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="p-5 space-y-3">
            {[
              { label: 'Passenger', value: booking.passenger_name },
              { label: 'Coach', value: `Coach ${booking.coach_number}` },
              { label: 'Seat', value: `Seat ${booking.seat_number}` },
              { label: 'Fare Paid', value: `LKR ${booking.fare_lkr?.toFixed(2)}` },
              { label: 'Booking ID', value: booking.id?.slice(0, 8).toUpperCase() + '...' },
              { label: 'Status', value: booking.status },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{item.label}</span>
                <span className={`font-medium ${item.label === 'Status' ? 'text-green-400' : item.label === 'Fare Paid' ? 'text-brand-300' : 'text-slate-200'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Dashed Divider */}
          <div className="px-5">
            <div className="border-t-2 border-dashed border-white/10" />
          </div>

          {/* Actions */}
          <div className="p-5 flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex-1 text-sm"
            >
              Book Another
            </button>
            <button
              onClick={() => window.print()}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Save Ticket
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
