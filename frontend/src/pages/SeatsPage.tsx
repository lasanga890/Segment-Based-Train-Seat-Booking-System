import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Train, ArrowRight, ArrowLeft, Info } from 'lucide-react'
import { getSeatAvailability, getStations, holdSeat, type SeatAvailability, type Station } from '../services/api'
import BookingModal from '../components/BookingModal'

export default function SeatsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromSeq = parseInt(searchParams.get('from') || '0')
  const toSeq   = parseInt(searchParams.get('to')   || '0')

  const [seats, setSeats]           = useState<SeatAvailability[]>([])
  const [stations, setStations]     = useState<Station[]>([])
  const [selectedSeat, setSelectedSeat] = useState<SeatAvailability | null>(null)
  const [loading, setLoading]       = useState(true)
  const [holdLoading, setHoldLoading] = useState(false)
  const [holdResult, setHoldResult] = useState<{ hold_id: string; expires_at: string; fare: any } | null>(null)

  const fromStation = stations.find(s => s.sequence_order === fromSeq)
  const toStation   = stations.find(s => s.sequence_order === toSeq)

  useEffect(() => {
    if (!fromSeq || !toSeq || fromSeq >= toSeq) {
      navigate('/')
      return
    }
    Promise.all([
      getSeatAvailability(fromSeq, toSeq),
      getStations(),
    ]).then(([seatsData, stationsData]) => {
      setSeats(seatsData)
      setStations(stationsData)
    }).finally(() => setLoading(false))
  }, [fromSeq, toSeq])

  // Group seats by coach
  const seatsByCoach = seats.reduce<Record<number, SeatAvailability[]>>((acc, seat) => {
    if (!acc[seat.coach_number]) acc[seat.coach_number] = []
    acc[seat.coach_number].push(seat)
    return acc
  }, {})

  const availableCount = seats.filter(s => s.status === 'available' || s.status === 'partial').length
  const occupiedCount  = seats.filter(s => s.status === 'occupied').length

  const handleSeatClick = async (seat: SeatAvailability) => {
    if (seat.status === 'occupied' || holdLoading) return
    setSelectedSeat(seat)
    setHoldLoading(true)
    try {
      const result = await holdSeat({ seat_id: seat.seat_id, from_seq: fromSeq, to_seq: toSeq })
      setHoldResult(result)
    } catch (err: any) {
      alert(err.message || 'Seat is no longer available')
      setSelectedSeat(null)
      // Refresh availability
      getSeatAvailability(fromSeq, toSeq).then(setSeats)
    } finally {
      setHoldLoading(false)
    }
  }

  const handleModalClose = () => {
    setSelectedSeat(null)
    setHoldResult(null)
    // Refresh seat map
    getSeatAvailability(fromSeq, toSeq).then(setSeats)
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
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
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
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Info Banner ─────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start gap-3 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
          <Info size={16} className="text-brand-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300">
            <strong className="text-brand-300">Partial seats</strong> (amber) are occupied on other legs but
            free for your journey <strong className="text-white">{fromStation?.name} → {toStation?.name}</strong>.
            You can still book them — this is segment-based pricing at work.
          </p>
        </div>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
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
                  {coachSeats.map(seat => (
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
                        ${seat.seat_id === selectedSeat?.seat_id
                          ? 'bg-seat-selected border-seat-selected text-white ring-2 ring-seat-selected/50 ring-offset-2 ring-offset-slate-950'
                          : seat.status === 'available'
                            ? 'bg-seat-available/15 border-seat-available text-seat-available hover:bg-seat-available hover:text-white cursor-pointer'
                            : seat.status === 'partial'
                              ? 'bg-seat-partial/15 border-seat-partial text-seat-partial hover:bg-seat-partial hover:text-white cursor-pointer'
                              : 'bg-seat-occupied/10 border-seat-occupied/30 text-seat-occupied/50 cursor-not-allowed'
                        }
                      `}
                      title={`Seat ${seat.seat_number} — ${seat.status}`}
                    >
                      {seat.seat_number}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Booking Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSeat && holdResult && (
          <BookingModal
            seat={selectedSeat}
            hold={holdResult}
            fromStation={fromStation!}
            toStation={toStation!}
            onClose={handleModalClose}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
