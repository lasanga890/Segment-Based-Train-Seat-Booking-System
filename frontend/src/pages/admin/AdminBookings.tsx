import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminGetAllBookings, adminCancelBooking, adminGetTrains, Booking, AdminTrain } from '../../services/api'
import { Search, Copy, Ban, CheckCircle2, Inbox, Train } from 'lucide-react'

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-500/20 text-green-400',
  HOLD:      'bg-amber-500/20 text-amber-400',
  CANCELLED: 'bg-red-500/20 text-red-400 line-through',
}

const classColors: Record<string, string> = {
  FIRST:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  SECOND: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  THIRD:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [trains, setTrains]     = useState<AdminTrain[]>([])
  const [loading, setLoading]   = useState(true)
  
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState('ALL')
  const [trainF, setTrainF]   = useState('ALL')
  const [classF, setClassF]   = useState('ALL')
  const [dateF, setDateF]     = useState('')

  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    adminGetTrains()
      .then(setTrains)
      .catch(console.error)
  }, [])

  const loadBookings = async () => {
    try {
      const data = await adminGetAllBookings({
        ...(search ? { search } : {}),
        ...(statusF !== 'ALL' ? { status: statusF } : {}),
        ...(trainF !== 'ALL' ? { train_id: trainF } : {}),
        ...(classF !== 'ALL' ? { coach_class: classF } : {}),
        ...(dateF ? { date: dateF } : {})
      })
      setBookings(data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadBookings() }, [statusF, trainF, classF, dateF])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadBookings()
  }

  const handleClear = () => {
    setSearch('')
    setStatusF('ALL')
    setTrainF('ALL')
    setClassF('ALL')
    setDateF('')
    setTimeout(loadBookings, 0)
  }

  const handleCancel = async (b: Booking) => {
    if(confirm(`Are you sure you want to cancel booking #${b.id.substring(0,8)}? The seat will become immediately available.`)) {
      try {
        await adminCancelBooking(b.id)
        setToast('Booking successfully cancelled.')
        setTimeout(() => setToast(null), 3000)
        loadBookings()
      } catch (e) {
        alert('Failed to cancel')
      }
    }
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
  }

  return (
    <div>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border bg-green-500/10 border-green-500/20 text-green-400 z-50"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          Booking Management
          <span className="text-sm bg-brand-600 px-3 py-1 rounded-full">{bookings.length}</span>
        </h2>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search ID / Name / Email..." className="input-field pl-10 text-sm py-2.5" value={search} onChange={e => setSearch(e.target.value)} />
        </form>

        {/* Train Filter */}
        <select className="select-field py-2.5 text-sm w-44" value={trainF} onChange={e => setTrainF(e.target.value)}>
          <option value="ALL">All Trains</option>
          {trains.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} (#{t.train_number})
            </option>
          ))}
        </select>

        {/* Class Filter */}
        <select className="select-field py-2.5 text-sm w-36" value={classF} onChange={e => setClassF(e.target.value)}>
          <option value="ALL">All Classes</option>
          <option value="FIRST">First Class</option>
          <option value="SECOND">Second Class</option>
          <option value="THIRD">Third Class</option>
        </select>

        {/* Status Filter */}
        <select className="select-field py-2.5 text-sm w-36" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="HOLD">Hold</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Date Filter */}
        <input type="date" className="input-field py-2.5 text-sm w-36" value={dateF} onChange={e => setDateF(e.target.value)} />

        <button onClick={handleClear} className="btn-secondary py-2.5 text-sm">Clear</button>
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
                <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                  {['Booking ID', 'Passenger', 'Train & Class', 'Route', 'Coach/Seat', 'Fare', 'Status', 'Booked At', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center text-slate-500">
                        <Inbox size={32} className="mb-2 opacity-50" />
                        <p>No bookings found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((b, i) => (
                    <motion.tr
                      key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-300">{b.id.substring(0,8)}</span>
                          <button onClick={() => copyId(b.id)} className="text-slate-500 hover:text-white"><Copy size={12}/></button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-200">{b.passenger_name}</p>
                        <p className="text-xs text-slate-500">{b.passenger_email || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium mb-1">
                          <Train size={12} className="text-brand-400" />
                          <span>{b.train_name || 'Train'}</span>
                          {b.train_number && <span className="text-slate-500">#{b.train_number}</span>}
                        </div>
                        {b.coach_class && (
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-semibold ${classColors[b.coach_class] || 'bg-slate-700 text-slate-300'}`}>
                            {b.coach_class} CLASS
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        <span className="text-slate-300">{b.start_station_name}</span> <br/>
                        <span className="text-slate-500">to</span> <span className="text-slate-300">{b.end_station_name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        C{b.coach_number} <br/> S{b.seat_number}
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-300">
                        LKR {b.fare_lkr?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide ${statusColors[b.status] || 'bg-slate-700 text-slate-400'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {(b.status === 'CONFIRMED' || b.status === 'HOLD') && (
                          <button onClick={() => handleCancel(b)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded">
                            <Ban size={12}/> Cancel
                          </button>
                        )}
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
