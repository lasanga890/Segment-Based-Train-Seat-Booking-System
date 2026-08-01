import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Train, MapPin, ArrowRight, ChevronDown } from 'lucide-react'
import { getStations, type Station } from '../services/api'

export default function HomePage() {
  const navigate = useNavigate()
  const [stations, setStations] = useState<Station[]>([])
  const [fromSeq, setFromSeq] = useState<string>('')
  const [toSeq, setToSeq] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getStations()
      .then(setStations)
      .catch(() => setError('Failed to load stations. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromSeq || !toSeq) return
    navigate(`/seats?from=${fromSeq}&to=${toSeq}`)
  }

  const validDestinations = stations.filter(s => s.sequence_order > parseInt(fromSeq || '0'))
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

              <form onSubmit={handleSearch} className="space-y-5">
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
                        <option value="">Select origin...</option>
                        {stations.slice(0, -1).map(s => (
                          <option key={s.id} value={s.sequence_order}>
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
                        <option value="">Select destination...</option>
                        {validDestinations.map(s => (
                          <option key={s.id} value={s.sequence_order}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
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

                <button
                  id="find-seats-btn"
                  type="submit"
                  disabled={!fromSeq || !toSeq}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Train size={18} />
                  Find Available Seats
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
