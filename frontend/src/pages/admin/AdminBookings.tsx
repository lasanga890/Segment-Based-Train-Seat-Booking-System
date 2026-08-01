import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getAllBookings, type Booking } from '../../services/api'

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-500/20 text-green-400',
  HOLD:      'bg-amber-500/20 text-amber-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    getAllBookings('admin-token')
      .then(setBookings)
      .finally(() => setLoading(false))
  }, [])

  const filtered = bookings.filter(b =>
    b.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.start_station_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.end_station_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">All Bookings</h2>
        <input
          type="search"
          placeholder="Search by passenger or station..."
          className="input-field text-sm w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {['Passenger', 'Route', 'Coach / Seat', 'Fare (LKR)', 'Status', 'Booked At'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, i) => (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-200">{b.passenger_name}</p>
                        <p className="text-xs text-slate-500">{b.passenger_email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {b.start_station_name} → {b.end_station_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        C{b.coach_number} · S{b.seat_number}
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-300">
                        {b.fare_lkr?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] || 'bg-slate-700 text-slate-400'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : '-'}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
