import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Train, ArrowRight, ArrowLeft, Info, ShoppingCart, X, Armchair, ChevronRight, CheckCircle2 } from 'lucide-react'
import {
  getSeatAvailability, getStations, holdManySeats, getScheduleCoaches,
  type SeatAvailability, type Station, type MultiHoldItem, type ScheduleCoach
} from '../services/api'
import BookingModal from '../components/BookingModal'

export default function SeatsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const scheduleId = searchParams.get('schedule_id')
  const fromSeq = fromParam !== null && fromParam !== '' ? parseInt(fromParam) : -1
  const toSeq   = toParam !== null && toParam !== '' ? parseInt(toParam) : -1

  // ─── Coach selection state ────────────────────────────────────────────────
  const [showCoachModal, setShowCoachModal] = useState(true)
  const [coaches, setCoaches] = useState<ScheduleCoach[]>([])
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [selectedCoach, setSelectedCoach] = useState<ScheduleCoach | null>(null)

  // ─── Seat map state ───────────────────────────────────────────────────────
  const [seats, setSeats]             = useState<SeatAvailability[]>([])
  const [stations, setStations]       = useState<Station[]>([])
  const [selectedSeats, setSelectedSeats] = useState<SeatAvailability[]>([])
  const [loading, setLoading]         = useState(false)
  const [holdLoading, setHoldLoading] = useState(false)
  const [holdResults, setHoldResults] = useState<MultiHoldItem[] | null>(null)

  const fromStation = stations.find(s => s.sequence_order === fromSeq)
  const toStation   = stations.find(s => s.sequence_order === toSeq)

  // Redirect if params are invalid
  useEffect(() => {
    if (fromSeq === -1 || toSeq === -1 || fromSeq === toSeq || !scheduleId) {
      navigate('/')
      return
    }
    // Load stations and coaches concurrently
    Promise.all([
      getStations().then(setStations),
      getScheduleCoaches(scheduleId)
        .then(data => {
          setCoaches(data)
          // If only one coach, auto-select it
          if (data.length === 1) {
            setSelectedCoach(data[0])
          }
        })
        .catch(console.error)
    ]).finally(() => setCoachesLoading(false))
  }, [fromSeq, toSeq, scheduleId, navigate])

  // Load seats whenever a coach is confirmed
  const loadSeats = (coach: ScheduleCoach) => {
    setLoading(true)
    setSeats([])
    setSelectedSeats([])
    getSeatAvailability(scheduleId!, coach.coach_class, Math.min(fromSeq, toSeq), Math.max(fromSeq, toSeq))
      .then(setSeats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const handleConfirmCoach = (coach: ScheduleCoach) => {
    setSelectedCoach(coach)
    setShowCoachModal(false)
    loadSeats(coach)
  }

  const refreshSeats = () => {
    if (selectedCoach) {
      loadSeats(selectedCoach)
    }
  }

  // Group seats by coach
  const seatsByCoach = seats.reduce<Record<number, SeatAvailability[]>>((acc, seat) => {
    if (!acc[seat.coach_number]) acc[seat.coach_number] = []
    acc[seat.coach_number].push(seat)
    return acc
  }, {})

  const availableCount = seats.filter(s => s.status === 'available' || s.status === 'partial').length
  const occupiedCount  = seats.filter(s => s.status === 'occupied').length

  const isSelected = (seat: SeatAvailability) =>
    selectedSeats.some(s => s.seat_id === seat.seat_id)

  const handleSeatClick = (seat: SeatAvailability) => {
    if (seat.status === 'occupied' || holdLoading) return
    setSelectedSeats(prev => {
      if (prev.some(s => s.seat_id === seat.seat_id)) {
        return prev.filter(s => s.seat_id !== seat.seat_id)
      } else {
        if (prev.length >= 6) {
          alert('You can select a maximum of 6 seats at once.')
          return prev
        }
        return [...prev, seat]
      }
    })
  }

  const handleProceedToCheckout = async () => {
    if (selectedSeats.length === 0 || holdLoading) return
    setHoldLoading(true)
    try {
      const results = await holdManySeats({
        schedule_id: scheduleId!,
        seat_ids: selectedSeats.map(s => s.seat_id),
        from_seq: Math.min(fromSeq, toSeq),
        to_seq: Math.max(fromSeq, toSeq),
      })
      setHoldResults(results)
    } catch (err: any) {
      alert(err.message || 'One or more seats are no longer available. Please reselect.')
      setSelectedSeats([])
      await refreshSeats()
    } finally {
      setHoldLoading(false)
    }
  }

  const handleModalClose = () => {
    setSelectedSeats([])
    setHoldResults(null)
    refreshSeats()
  }

  const classColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    FIRST:  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', dot: 'bg-purple-400' },
    SECOND: { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40',   dot: 'bg-blue-400'   },
    THIRD:  { bg: 'bg-emerald-500/20',text: 'text-emerald-300',border: 'border-emerald-500/40',dot: 'bg-emerald-400' },
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Train size={16} className="text-brand-400" />
              <span className="text-slate-400">{fromStation?.name}</span>
              <ArrowRight size={14} className="text-slate-600" />
              <span className="text-slate-400">{toStation?.name}</span>
              {selectedCoach && !showCoachModal && (
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold border ${classColors[selectedCoach.coach_class]?.bg || 'bg-white/10'} ${classColors[selectedCoach.coach_class]?.text || 'text-white'} ${classColors[selectedCoach.coach_class]?.border || 'border-white/20'}`}>
                  {selectedCoach.coach_class} CLASS · Coach {selectedCoach.coach_number}
                </span>
              )}
            </div>
          </div>
          {!showCoachModal && selectedCoach && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setShowCoachModal(true); setSeats([]); setSelectedSeats([]) }}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
              >
                <Armchair size={14} /> Change Coach
              </button>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-seat-available inline-block" />
                  Available ({availableCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-seat-partial inline-block" />
                  Partial
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-seat-occupied inline-block" />
                  Occupied ({occupiedCount})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Coach Selection Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCoachModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg glass-card overflow-hidden"
            >
              {/* Modal header */}
              <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-brand-600/10 to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Armchair size={20} className="text-brand-400" />
                      Select Coach
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose a coach class for your journey
                      <span className="text-brand-400 font-medium"> {fromStation?.name} → {toStation?.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Coach list */}
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {coachesLoading ? (
                  <div className="py-10 flex flex-col items-center gap-3 text-slate-500">
                    <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Loading available coaches...</p>
                  </div>
                ) : coaches.length === 0 ? (
                  <div className="py-10 text-center">
                    <Armchair size={36} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No coaches configured</p>
                    <p className="text-slate-500 text-sm mt-1">Admin needs to add coaches to this train.</p>
                  </div>
                ) : (
                  coaches.map(coach => {
                    const colors = classColors[coach.coach_class] || classColors.SECOND
                    const availableSeats = coach.total_seats - coach.booked_seats
                    const occupancyPct = Math.round((coach.booked_seats / coach.total_seats) * 100)
                    const isCoachSelected = selectedCoach?.id === coach.id

                    return (
                      <motion.div
                        key={coach.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedCoach(coach)}
                        className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                          isCoachSelected
                            ? `${colors.bg} ${colors.border} ring-2 ring-brand-500`
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                              <Armchair size={18} className={colors.text} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">
                                  {coach.label ? coach.label : `Coach ${coach.coach_number}`}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                                  {coach.coach_class} CLASS
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {coach.total_seats} total seats · {availableSeats} available
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Occupancy bar */}
                            <div className="text-right">
                              <p className={`text-xs font-bold ${occupancyPct > 80 ? 'text-red-400' : occupancyPct > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {availableSeats} free
                              </p>
                              <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${occupancyPct > 80 ? 'bg-red-500' : occupancyPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${occupancyPct}%` }}
                                />
                              </div>
                            </div>
                            {isCoachSelected ? (
                              <CheckCircle2 size={20} className="text-brand-400" />
                            ) : (
                              <ChevronRight size={20} className="text-slate-600" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>

              {/* Confirm button */}
              {coaches.length > 0 && (
                <div className="p-5 border-t border-white/10 bg-white/[0.02]">
                  <button
                    onClick={() => selectedCoach && handleConfirmCoach(selectedCoach)}
                    disabled={!selectedCoach}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                  >
                    {selectedCoach ? (
                      <>
                        <Armchair size={18} />
                        View Seats in {selectedCoach.label || `Coach ${selectedCoach.coach_number}`} ({selectedCoach.coach_class} CLASS)
                      </>
                    ) : (
                      'Select a Coach to Continue'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-36">
        {/* ── Info Banner ─────────────────────────────────────────────── */}
        {!showCoachModal && selectedCoach && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
            <Info size={16} className="text-brand-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-300">
              <strong className="text-brand-300">Click seats to select them</strong> — you can pick up to 6 seats.
              {' '}<strong className="text-amber-300">Amber (partial)</strong> seats are booked on other legs but free for your journey{' '}
              <strong className="text-white">{fromStation?.name} → {toStation?.name}</strong>.
            </p>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !showCoachModal && (
          /* ── Coach Map ────────────────────────────────────────────── */
          <div className="space-y-6">
            {Object.entries(seatsByCoach).map(([coachNum, coachSeats]) => (
              <motion.div
                key={coachNum}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                {/* Coach Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-slate-200">Coach {coachNum}</h3>
                    <p className="text-xs text-slate-500">
                      {coachSeats[0].coach_type === 'RESERVED' ? '🔒 Reserved' : '🚶 Unreserved'}
                      {' · '}{coachSeats.length} seats
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    coachSeats[0].coach_type === 'RESERVED'
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {coachSeats[0].coach_type}
                  </span>
                </div>

                {/* Seat Grid */}
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))' }}>
                  {coachSeats.map(seat => {
                    const selected = isSelected(seat)
                    return (
                      <motion.button
                        key={seat.seat_id}
                        id={`seat-${coachNum}-${seat.seat_number}`}
                        whileHover={seat.status !== 'occupied' ? { scale: 1.12 } : {}}
                        whileTap={seat.status !== 'occupied' ? { scale: 0.95 } : {}}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'occupied' || holdLoading}
                        className={`
                          w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold
                          border-2 transition-all duration-150 select-none
                          ${selected
                            ? 'bg-seat-selected border-seat-selected text-white ring-2 ring-seat-selected/50 ring-offset-2 ring-offset-slate-950 scale-105'
                            : seat.status === 'available'
                              ? 'bg-seat-available/15 border-seat-available text-seat-available hover:bg-seat-available hover:text-white cursor-pointer'
                              : seat.status === 'partial'
                                ? 'bg-seat-partial/15 border-seat-partial text-seat-partial hover:bg-seat-partial hover:text-white cursor-pointer'
                                : 'bg-seat-occupied/10 border-seat-occupied/30 text-seat-occupied/50 cursor-not-allowed'
                          }
                        `}
                        title={`Seat ${seat.seat_number} — ${selected ? 'Selected' : seat.status}`}
                      >
                        {seat.seat_number}
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            ))}
            {!loading && Object.keys(seatsByCoach).length === 0 && !showCoachModal && (
              <div className="text-center py-16 text-slate-500">
                <Armchair size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-lg font-medium text-slate-400">No seats found</p>
                <p className="text-sm mt-1">This coach has no seats configured.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating Selection Bar ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSeats.length > 0 && !holdResults && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4"
          >
            <div className="bg-slate-900 border border-brand-500/40 rounded-2xl p-4 shadow-2xl shadow-brand-900/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{selectedSeats.length} Seat{selectedSeats.length > 1 ? 's' : ''} Selected</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSeats.map(s => (
                      <span
                        key={s.seat_id}
                        className="inline-flex items-center gap-1 text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full"
                      >
                        C{s.coach_number}·S{s.seat_number}
                        <button
                          onClick={() => setSelectedSeats(prev => prev.filter(p => p.seat_id !== s.seat_id))}
                          className="hover:text-white ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleProceedToCheckout}
                disabled={holdLoading}
                className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 flex-shrink-0"
              >
                {holdLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Book Now'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Booking Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {holdResults && holdResults.length > 0 && (
          <BookingModal
            seats={selectedSeats}
            holds={holdResults}
            fromStation={fromStation!}
            toStation={toStation!}
            onClose={handleModalClose}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
