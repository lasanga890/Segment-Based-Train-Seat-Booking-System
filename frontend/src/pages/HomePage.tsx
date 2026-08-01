import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Train, MapPin, ArrowRight, ChevronDown, Calendar, Clock, Route, CheckCircle2 } from 'lucide-react'
import { getStations, getSchedules, type Station, type Schedule } from '../services/api'

export default function HomePage() {
  const navigate = useNavigate()
  const [stations, setStations] = useState<Station[]>([])
  const [fromSeq, setFromSeq] = useState<string>('')
  const [toSeq, setToSeq] = useState<string>('')
  const [travelDate, setTravelDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Schedules state
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('SECOND')
  const [isSearchingTrains, setIsSearchingTrains] = useState(false)

  useEffect(() => {
    getStations()
      .then(setStations)
      .catch(() => setError('Failed to load stations. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  // Auto-fetch available trains whenever From, To, and Date are set
  useEffect(() => {
    if (fromSeq && toSeq && travelDate) {
      const fromNum = parseInt(fromSeq)
      const toNum = parseInt(toSeq)
      const direction = fromNum < toNum ? 'UP' : 'DOWN'

      setIsSearchingTrains(true)
      setError('')
      getSchedules(travelDate, direction)
        .then(fetchedSchedules => {
          setSchedules(fetchedSchedules)
          if (fetchedSchedules.length > 0) {
            setSelectedScheduleId(fetchedSchedules[0].id)
          } else {
            setSelectedScheduleId('')
          }
        })
        .catch(() => setError('Failed to fetch available trains for this date.'))
        .finally(() => setIsSearchingTrains(false))
    } else {
      setSchedules([])
      setSelectedScheduleId('')
    }
  }, [fromSeq, toSeq, travelDate])

  const handleProceedBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedScheduleId || !fromSeq || !toSeq) return
    navigate(`/seats?schedule_id=${selectedScheduleId}&coach_class=${selectedClass}&from=${fromSeq}&to=${toSeq}`)
  }

  const validDestinations = stations.filter(s => s.sequence_order !== parseInt(fromSeq || '-1'))
  const selectedFrom = stations.find(s => s.sequence_order === parseInt(fromSeq))
  const selectedTo   = stations.find(s => s.sequence_order === parseInt(toSeq))
  const stationsCount = selectedFrom && selectedTo
    ? selectedTo.sequence_order - selectedFrom.sequence_order
    : null
  const distanceKM = selectedFrom && selectedTo
    ? (selectedTo.distance_km - selectedFrom.distance_km).toFixed(1)
    : null

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Train size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">SL Rail</h1>
              <p className="text-xs text-slate-400">Scenic Booking</p>
            </div>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Admin →
          </a>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 bg-brand-600/20 border border-brand-500/30 rounded-full px-4 py-1.5 text-brand-300 text-sm mb-6">
                <MapPin size={14} />
                <span>Colombo Fort → Badulla Scenic Line</span>
              </div>
              <h2 className="text-5xl font-black text-white mb-4 leading-tight">
                Book Your Seat,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">
                  Pay Your Distance
                </span>
              </h2>
              <p className="text-slate-400 text-lg max-w-lg mx-auto">
                Reserved seats resold between legs. You pay only for the journey you take —
                not the empty seat behind you.
              </p>
            </motion.div>

            {/* ── Search Form ──────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-8"
            >
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleProceedBooking} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* From */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      From Station
                    </label>
                    <div className="relative">
                      <select
                        id="from-station"
                        className="select-field pr-10"
                        value={fromSeq}
                        onChange={e => { setFromSeq(e.target.value); setToSeq('') }}
                        disabled={loading}
                      >
                        <option value="" className="text-slate-900 bg-white">Select origin...</option>
                        {stations.map(s => (
                          <option key={s.id} value={s.sequence_order} className="text-slate-900 bg-white">
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* To */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      To Station
                    </label>
                    <div className="relative">
                      <select
                        id="to-station"
                        className="select-field pr-10"
                        value={toSeq}
                        onChange={e => setToSeq(e.target.value)}
                        disabled={!fromSeq || loading}
                      >
                        <option value="" className="text-slate-900 bg-white">Select destination...</option>
                        {validDestinations.map(s => (
                          <option key={s.id} value={s.sequence_order} className="text-slate-900 bg-white">
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Travel Date
                  </label>
                  <div className="relative">
                    <input
                      id="travel-date"
                      type="date"
                      className="input-field pr-10 [color-scheme:dark]"
                      value={travelDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setTravelDate(e.target.value)}
                      required
                    />
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Journey preview */}
                {selectedFrom && selectedTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-brand-600/10 border border-brand-500/20 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-300 font-medium">{selectedFrom.name}</span>
                      <ArrowRight size={14} className="text-brand-400" />
                      <span className="text-slate-300 font-medium">{selectedTo.name}</span>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>{distanceKM} km</div>
                      <div>{stationsCount} segments</div>
                    </div>
                  </motion.div>
                )}

                {/* ── INLINE AVAILABLE TRAINS (Rendered under date field and above Proceed Booking) ── */}
                {fromSeq && toSeq && travelDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Available Trains on {travelDate}
                      </label>
                      {schedules.length > 0 && (
                        <span className="text-xs text-brand-400 font-medium">{schedules.length} train(s) found</span>
                      )}
                    </div>

                    {isSearchingTrains ? (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        Searching train schedules...
                      </div>
                    ) : schedules.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {schedules.map(s => {
                          const isSelected = selectedScheduleId === s.id
                          return (
                            <div
                              key={s.id}
                              onClick={() => setSelectedScheduleId(s.id)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-brand-600/20 border-brand-500 ring-1 ring-brand-500 shadow-lg'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                              }`}
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100 text-sm">{s.train_name}</span>
                                  <span className="text-[10px] bg-white/10 text-brand-300 px-1.5 py-0.5 rounded font-mono">
                                    #{s.train_number}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                  <span className="flex items-center gap-1 text-brand-300 font-semibold">
                                    <Clock size={13} className="text-brand-400" />
                                    {s.departure_time.slice(11, 16)}
                                  </span>
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <Route size={13} className="text-slate-400" />
                                    Main Route: {s.direction === 'UP' ? 'Colombo Fort ➔ Badulla' : 'Badulla ➔ Colombo Fort'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelected && <CheckCircle2 size={18} className="text-brand-400" />}
                                <input
                                  type="radio"
                                  name="inline_schedule_selection"
                                  checked={isSelected}
                                  onChange={() => setSelectedScheduleId(s.id)}
                                  className="accent-brand-500 w-4 h-4 cursor-pointer"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs text-amber-300">
                        No active trains scheduled for this route on {travelDate}.
                      </div>
                    )}

                    {/* Class Selector inline */}
                    {schedules.length > 0 && (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Travel Class</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['FIRST', 'SECOND', 'THIRD'].map(cls => (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => setSelectedClass(cls)}
                              className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                                selectedClass === cls
                                  ? 'bg-brand-600 text-white border-brand-400 shadow-md'
                                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {cls === 'FIRST' ? '1st Class' : cls === 'SECOND' ? '2nd Class' : '3rd Class'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Proceed Booking Button */}
                <button
                  id="find-seats-btn"
                  type="submit"
                  disabled={!fromSeq || !toSeq || !selectedScheduleId || isSearchingTrains}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
                >
                  <Train size={18} />
                  {isSearchingTrains ? 'Searching Trains...' : 'Proceed Booking'}
                </button>
              </form>
            </motion.div>

            {/* ── Route Strip ─────────────────────────────────────────── */}
            {!loading && stations.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 overflow-x-auto"
              >
                <div className="flex items-center gap-0 min-w-max mx-auto">
                  {stations.map((s, i) => (
                    <div key={s.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${
                          s.sequence_order === parseInt(fromSeq) ? 'bg-brand-400 w-3 h-3' :
                          s.sequence_order === parseInt(toSeq)   ? 'bg-cyan-400 w-3 h-3' :
                          'bg-slate-600'
                        }`} />
                        {(i === 0 || i === stations.length - 1 ||
                          s.sequence_order === parseInt(fromSeq) ||
                          s.sequence_order === parseInt(toSeq)) && (
                          <span className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">{s.code}</span>
                        )}
                      </div>
                      {i < stations.length - 1 && (
                        <div className={`h-px w-6 ${
                          parseInt(fromSeq) <= s.sequence_order && s.sequence_order < parseInt(toSeq)
                            ? 'bg-brand-500'
                            : 'bg-slate-700'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
