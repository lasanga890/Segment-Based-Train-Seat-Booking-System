import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Armchair,
  Calendar,
  MapPin,
  Train as TrainIcon,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  CreditCard,
  Mail,
  X,
  ShoppingCart,
} from 'lucide-react'
import {
  getStations,
  adminListSchedules,
  getScheduleCoaches,
  getSeatAvailability,
  holdManySeats,
  confirmBooking,
  type Station,
  type AdminSchedule,
  type ScheduleCoach,
  type SeatAvailability,
} from '../../services/api'
import TrainCoachSeatMap from '../../components/TrainCoachSeatMap'

export default function AdminSeatBooking() {
  const [stations, setStations] = useState<Station[]>([])
  const [schedules, setSchedules] = useState<AdminSchedule[]>([])
  const [coaches, setCoaches] = useState<ScheduleCoach[]>([])
  const [seats, setSeats] = useState<SeatAvailability[]>([])

  // Selections
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [startStationId, setStartStationId] = useState('')
  const [endStationId, setEndStationId] = useState('')
  const [selectedCoach, setSelectedCoach] = useState<ScheduleCoach | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<SeatAvailability[]>([])

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [passengerName, setPassengerName] = useState('')
  const [phone, setPhone] = useState('')
  const [nicPassport, setNicPassport] = useState('')
  const [email, setEmail] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [stData, schData] = await Promise.all([getStations(), adminListSchedules()])
      stData.sort((a, b) => a.sequence_order - b.sequence_order)
      setStations(stData)
      setSchedules(schData || [])

      if (stData.length >= 2) {
        setStartStationId(stData[0].id)
        setEndStationId(stData[stData.length - 1].id)
      }
      if (schData && schData.length > 0) {
        setSelectedScheduleId(schData[0].id)
      }
    } catch (e: any) {
      setToast({ msg: 'Failed to load initial schedules and stations', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Load coaches when schedule changes
  useEffect(() => {
    if (selectedScheduleId) {
      getScheduleCoaches(selectedScheduleId)
        .then((data) => {
          setCoaches(data || [])
          if (data && data.length > 0) {
            setSelectedCoach(data[0])
          }
        })
        .catch(() => setCoaches([]))
    }
  }, [selectedScheduleId])

  // Load seat availability when schedule, start, end, or coach changes
  useEffect(() => {
    if (selectedScheduleId && startStationId && endStationId && selectedCoach) {
      const startSt = stations.find((s) => s.id === startStationId)
      const endSt = stations.find((s) => s.id === endStationId)

      if (startSt && endSt && startSt.id !== endSt.id) {
        const startSeq = Math.min(startSt.sequence_order, endSt.sequence_order)
        const endSeq = Math.max(startSt.sequence_order, endSt.sequence_order)

        setLoading(true)
        setSelectedSeats([])
        getSeatAvailability(selectedScheduleId, selectedCoach.coach_class, startSeq, endSeq)
          .then((data) => setSeats(data || []))
          .catch(() => setSeats([]))
          .finally(() => setLoading(false))
      }
    }
  }, [selectedScheduleId, startStationId, endStationId, selectedCoach, stations])

  const handleSeatClick = (seat: SeatAvailability) => {
    if (selectedSeats.some((s) => s.seat_id === seat.seat_id)) {
      setSelectedSeats(selectedSeats.filter((s) => s.seat_id !== seat.seat_id))
    } else {
      setSelectedSeats([...selectedSeats, seat])
    }
  }

  const handleOpenBookingModal = () => {
    if (selectedSeats.length === 0) return
    setShowBookingModal(true)
  }

  const handleConfirmCustomerBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedScheduleId || !startStationId || !endStationId || selectedSeats.length === 0) return

    setBookingLoading(true)
    try {
      // 1. Hold seats
      const holdItems = selectedSeats.map((s) => ({
        schedule_id: selectedScheduleId,
        seat_id: s.seat_id,
        start_station_id: startStationId,
        end_station_id: endStationId,
      }))

      const holdRes = await holdManySeats(holdItems)
      const successHolds = holdRes.filter((h) => h.success)

      if (successHolds.length === 0) {
        throw new Error('Could not hold selected seats. They might be booked already.')
      }

      // 2. Confirm booking for customer
      let confirmedCount = 0
      for (const item of successHolds) {
        await confirmBooking({
          hold_id: item.hold_id,
          passenger_name: passengerName,
          passenger_phone: phone,
          passenger_nic: nicPassport,
        })
        confirmedCount++
      }

      setToast({
        msg: `Successfully booked ${confirmedCount} seat(s) for customer ${passengerName}!`,
        type: 'success',
      })

      setShowBookingModal(false)
      setSelectedSeats([])
      setPassengerName('')
      setPhone('')
      setNicPassport('')
      setEmail('')

      // Reload seat availability
      const startSt = stations.find((s) => s.id === startStationId)
      const endSt = stations.find((s) => s.id === endStationId)
      if (startSt && endSt && selectedCoach) {
        getSeatAvailability(
          selectedScheduleId,
          selectedCoach.coach_class,
          Math.min(startSt.sequence_order, endSt.sequence_order),
          Math.max(startSt.sequence_order, endSt.sequence_order)
        ).then(setSeats)
      }
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to book seats for customer', type: 'error' })
    } finally {
      setBookingLoading(false)
    }
  }

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId)

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            } z-50`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Armchair className="text-brand-400" size={26} /> Seat Map & Customer Booking
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Inspect real-time coach seats and book tickets directly for passengers</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Schedule Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Schedule</label>
            <select
              className="select-field text-xs"
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.train_name} (#{s.train_number}) - {s.departure_date} at {s.departure_time}
                </option>
              ))}
            </select>
          </div>

          {/* Origin Station */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Origin Station</label>
            <select
              className="select-field text-xs"
              value={startStationId}
              onChange={(e) => setStartStationId(e.target.value)}
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sequence_order}. {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Station */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Station</label>
            <select
              className="select-field text-xs"
              value={endStationId}
              onChange={(e) => setEndStationId(e.target.value)}
            >
              {stations.filter((s) => s.id !== startStationId).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sequence_order}. {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Coach Picker Pills */}
        {coaches.length > 0 && (
          <div className="pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-slate-400 font-medium shrink-0">Select Coach:</span>
            {coaches.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCoach(c)}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCoach?.id === c.id
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-slate-900 text-slate-300 border border-white/10 hover:border-brand-500/40'
                }`}
              >
                Coach {c.coach_number} ({c.coach_class})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Seat Map View & Action Bar */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : selectedCoach ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">
                Coach {selectedCoach.coach_number} ({selectedCoach.coach_class} CLASS)
              </p>
              <p className="text-xs text-slate-400">
                {selectedSeats.length} seat(s) selected
              </p>
            </div>

            <button
              onClick={handleOpenBookingModal}
              disabled={selectedSeats.length === 0}
              className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 disabled:opacity-40"
            >
              <ShoppingCart size={15} /> Book Seats for Customer ({selectedSeats.length})
            </button>
          </div>

          <TrainCoachSeatMap
            seats={seats}
            coachClass={selectedCoach.coach_class}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
          />
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-slate-500">
          <Armchair size={36} className="mx-auto mb-2 opacity-40" />
          <p>Please select a schedule and coach to view seat availability</p>
        </div>
      )}

      {/* ── Customer Booking Modal ── */}
      <AnimatePresence>
        {showBookingModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) setShowBookingModal(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="text-brand-400" size={20} /> Book for Customer
                </h3>
                <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs mb-4 space-y-1">
                <p className="text-slate-400">
                  Seats Selected: <strong className="text-brand-300 font-mono">{selectedSeats.map((s) => s.seat_number).join(', ')}</strong>
                </p>
                <p className="text-slate-400">
                  Coach: <strong className="text-white">Coach {selectedCoach?.coach_number} ({selectedCoach?.coach_class})</strong>
                </p>
              </div>

              <form onSubmit={handleConfirmCustomerBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Passenger Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    placeholder="e.g. Kamal Perera"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    className="input-field text-sm"
                    placeholder="+94 77 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">NIC / Passport Number</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="e.g. 199012345678"
                    value={nicPassport}
                    onChange={(e) => setNicPassport(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading || !passengerName.trim()}
                    className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5"
                  >
                    {bookingLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Confirm & Create Customer Booking'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
