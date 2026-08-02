import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket,
  Calendar,
  Clock,
  Train as TrainIcon,
  Armchair,
  CheckCircle2,
  Ban,
  QrCode,
  AlertCircle,
  Inbox,
  Sparkles,
  ArrowRight,
  RefreshCw,
  DollarSign,
  FileText,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  getUserBookings,
  cancelUserBooking,
  getUserWaitlists,
  getUserRefundRequests,
  getUserRescheduleRequests,
  createRescheduleRequest,
  getStations,
  getPublicTrains,
  getSchedules,
  type UserBooking,
  type WaitlistItem,
  type Station,
  type AdminTrain,
  type Schedule,
} from '../services/api'
import Navbar from '../components/Navbar'
import DigitalBoardingPassModal from '../components/DigitalBoardingPassModal'

interface UserRefundItem {
  id: string
  booking_id: string
  requested_at: string
  refundable_amount: number
  status: string
  admin_note?: string
  decided_at?: string
  passenger_name: string
  fare_lkr: number
}

interface UserRescheduleItem {
  id: string
  booking_id: string
  requested_at: string
  status: string
  admin_note?: string
  decided_at?: string
  passenger_name: string
  departure_date?: string
  departure_time?: string
  new_start_name?: string
  new_end_name?: string
  new_departure_date?: string
  new_departure_time?: string
}

export default function MyBookingsPage() {
  const [tab, setTab] = useState<'UPCOMING' | 'PAST' | 'WAITLIST' | 'CANCELLED' | 'REQUESTS'>('UPCOMING')
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [waitlists, setWaitlists] = useState<WaitlistItem[]>([])
  const [refundReqs, setRefundReqs] = useState<UserRefundItem[]>([])
  const [rescheduleReqs, setRescheduleReqs] = useState<UserRescheduleItem[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [trains, setTrains] = useState<AdminTrain[]>([])

  const [loading, setLoading] = useState(true)
  const [selectedPassBooking, setSelectedPassBooking] = useState<UserBooking | null>(null)
  const [cancelModalBooking, setCancelModalBooking] = useState<UserBooking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // 2-Step Reschedule Modal State
  const [rescheduleBooking, setRescheduleBooking] = useState<UserBooking | null>(null)
  const [rescheduleStep, setRescheduleStep] = useState<1 | 2>(1)
  const [newStartId, setNewStartId] = useState('')
  const [newEndId, setNewEndId] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTrainId, setNewTrainId] = useState('')
  const [newScheduleId, setNewScheduleId] = useState('')
  const [availableSchedules, setAvailableSchedules] = useState<Schedule[]>([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [submittingReschedule, setSubmittingReschedule] = useState(false)

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bData, wData, refData, resData, sData, tData] = await Promise.all([
        getUserBookings(),
        getUserWaitlists(),
        getUserRefundRequests(),
        getUserRescheduleRequests(),
        getStations(),
        getPublicTrains().catch(() => []),
      ])
      setBookings(bData)
      setWaitlists(wData)
      setRefundReqs(refData || [])
      setRescheduleReqs(resData || [])
      setStations(sData || [])
      setTrains(tData || [])
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load journeys' })
    } finally {
      setLoading(false)
    }
  }

  const upcomingBookings = bookings.filter((b) => b.status !== 'CANCELLED' && (b.departure_date >= todayStr || !b.departure_date))
  const pastBookings = bookings.filter((b) => b.status !== 'CANCELLED' && b.departure_date && b.departure_date < todayStr)
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED')

  const openRescheduleModal = (b: UserBooking) => {
    setRescheduleBooking(b)
    setRescheduleStep(1)
    setNewStartId(b.start_station_id || '')
    setNewEndId(b.end_station_id || '')
    setNewDate(b.departure_date || todayStr)
    setNewTrainId(b.train_id || '')
    setNewScheduleId(b.schedule_id || '')
  }

  const getStationSeq = (id: string) => stations.find((s) => s.id === id)?.sequence_order || 0
  const getStationName = (id: string) => stations.find((s) => s.id === id)?.name || id

  // Load schedules dynamically when in Step 2 and newDate changes
  useEffect(() => {
    if (rescheduleStep === 2 && newDate && newStartId && newEndId) {
      const startSeq = getStationSeq(newStartId)
      const endSeq = getStationSeq(newEndId)
      const dir: 'UP' | 'DOWN' = startSeq <= endSeq ? 'UP' : 'DOWN'

      setLoadingSchedules(true)
      getSchedules(newDate, dir)
        .then((scheds) => {
          setAvailableSchedules(scheds || [])
          if (scheds && scheds.length > 0) {
            setNewScheduleId(scheds[0].id)
          } else {
            setNewScheduleId('')
          }
        })
        .catch(() => setAvailableSchedules([]))
        .finally(() => setLoadingSchedules(false))
    }
  }, [rescheduleStep, newDate, newStartId, newEndId])

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return
    setCancelling(true)
    try {
      const res = await cancelUserBooking(cancelModalBooking.id)
      setMsg({ type: 'success', text: res.message || 'Booking cancelled successfully. Seat segment released!' })
      setCancelModalBooking(null)
      loadData()
      setTimeout(() => setMsg(null), 4000)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to cancel booking' })
    } finally {
      setCancelling(false)
    }
  }

  const handleGoToStep2 = () => {
    if (newStartId && newEndId) {
      setRescheduleStep(2)
    }
  }

  const handleFinalRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleBooking) return

    setSubmittingReschedule(true)
    try {
      await createRescheduleRequest(rescheduleBooking.id, {
        new_start_station_id: newStartId,
        new_end_station_id: newEndId,
        new_schedule_id: newScheduleId || undefined,
      })
      setMsg({ type: 'success', text: 'Reschedule request submitted successfully for admin review!' })
      setRescheduleBooking(null)
      loadData()
      setTimeout(() => setMsg(null), 4000)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to submit reschedule request' })
    } finally {
      setSubmittingReschedule(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Ticket size={32} className="text-brand-400" />
              My Journeys & Requests
            </h1>
            <p className="text-sm text-slate-400 mt-1">View digital boarding passes, manage bookings, waitlists & application requests</p>
          </div>
        </div>

        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
              msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{msg.text}</span>
          </motion.div>
        )}

        {/* Tabs Bar */}
        <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 max-w-2xl overflow-x-auto">
          <button
            onClick={() => setTab('UPCOMING')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 ${
              tab === 'UPCOMING' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setTab('PAST')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 ${
              tab === 'PAST' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Past ({pastBookings.length})
          </button>
          <button
            onClick={() => setTab('WAITLIST')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 ${
              tab === 'WAITLIST' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Waitlists ({waitlists.length})
          </button>
          <button
            onClick={() => setTab('CANCELLED')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 ${
              tab === 'CANCELLED' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cancelled ({cancelledBookings.length})
          </button>
          <button
            onClick={() => setTab('REQUESTS')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 ${
              tab === 'REQUESTS' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Requests ({refundReqs.length + rescheduleReqs.length})
          </button>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* ── UPCOMING & PAST & CANCELLED JOURNEYS ── */}
            {(tab === 'UPCOMING' || tab === 'PAST' || tab === 'CANCELLED') && (
              <div className="space-y-4">
                {((tab === 'UPCOMING' ? upcomingBookings : tab === 'PAST' ? pastBookings : cancelledBookings).length === 0) ? (
                  <div className="glass-card p-12 text-center text-slate-500 flex flex-col items-center">
                    <Inbox size={36} className="mb-3 opacity-40" />
                    <p>No journeys found in this section</p>
                  </div>
                ) : (
                  (tab === 'UPCOMING' ? upcomingBookings : tab === 'PAST' ? pastBookings : cancelledBookings).map((b) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-5 border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2.5 py-0.5 rounded-md text-xs font-bold">
                            {b.train_name || 'Train'} #{b.train_number || 'SL-101'}
                          </span>
                          <span className="text-xs text-slate-400 border-l border-white/10 pl-2">
                            {b.coach_class} CLASS
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-base font-bold text-white">
                          <span>{b.start_station_name}</span>
                          <ArrowRight size={16} className="text-slate-500" />
                          <span>{b.end_station_name}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                          <div className="flex items-center gap-1">
                            <Calendar size={13} className="text-slate-500" />
                            <span>{b.departure_date || b.created_at?.split('T')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-500" />
                            <span>{b.departure_time || 'Scheduled'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-300 font-bold">
                            <Armchair size={13} className="text-brand-400" />
                            <span>Coach {b.coach_number} · Seat {b.seat_number}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className="text-right sm:mr-3">
                          <p className="text-xs text-slate-500 font-mono">Fare</p>
                          <p className="text-base font-black text-brand-300">LKR {b.fare_lkr?.toFixed(2)}</p>
                        </div>

                        {b.status === 'CONFIRMED' && (
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => setSelectedPassBooking(b)}
                              className="btn-primary py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                            >
                              <QrCode size={15} /> Boarding Pass
                            </button>

                            <button
                              onClick={() => openRescheduleModal(b)}
                              className="bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors flex-1 sm:flex-initial"
                            >
                              <RefreshCw size={14} /> Reschedule
                            </button>

                            <button
                              onClick={() => setCancelModalBooking(b)}
                              className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors flex-1 sm:flex-initial"
                            >
                              <Ban size={14} /> Cancel
                            </button>
                          </div>
                        )}

                        {b.status === 'CANCELLED' && (
                          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
                            CANCELLED
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ── WAITLIST TAB ── */}
            {tab === 'WAITLIST' && (
              <div className="space-y-4">
                {waitlists.length === 0 ? (
                  <div className="glass-card p-12 text-center text-slate-500 flex flex-col items-center">
                    <Inbox size={36} className="mb-3 opacity-40" />
                    <p>You have no active waitlist entries</p>
                  </div>
                ) : (
                  waitlists.map((w) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-5 border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2.5 py-0.5 rounded-md text-xs font-bold">
                            {w.train_name} #{w.train_number}
                          </span>
                          <span className="text-xs text-slate-400 border-l border-white/10 pl-2">
                            {w.coach_class} CLASS
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-base font-bold text-white">
                          <span>{w.start_station_name}</span>
                          <ArrowRight size={16} className="text-slate-500" />
                          <span>{w.end_station_name}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-slate-500" /> {w.departure_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-500" /> {w.departure_time}
                          </span>
                        </div>
                      </div>

                      <div>
                        {w.status === 'PROMOTED' ? (
                          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 animate-pulse">
                            <Sparkles size={16} /> Seat Promoted! Check Seats
                          </div>
                        ) : (
                          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <Clock size={14} /> Waiting for Seat Opening
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ── MY REQUESTS TAB (RESCHEDULE & REFUND TRACKING) ── */}
            {tab === 'REQUESTS' && (
              <div className="space-y-6">
                {refundReqs.length === 0 && rescheduleReqs.length === 0 ? (
                  <div className="glass-card p-12 text-center text-slate-500 flex flex-col items-center">
                    <FileText size={36} className="mb-3 opacity-40" />
                    <p>No reschedule or refund requests submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Reschedule Applications */}
                    {rescheduleReqs.map((r) => (
                      <div
                        key={r.id}
                        className="glass-card p-5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                              <RefreshCw size={12} /> Reschedule Request
                            </span>
                            <span className="text-xs font-mono text-slate-400">Booking #{r.booking_id.slice(0, 8)}</span>
                          </div>

                          <p className="text-sm font-bold text-white">
                            Requested Change:{' '}
                            <span className="text-brand-300">
                              {r.new_start_name && r.new_end_name ? `${r.new_start_name} → ${r.new_end_name}` : 'Schedule Update'}
                            </span>
                            {r.new_departure_date && (
                              <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                                Date: {r.new_departure_date} {r.new_departure_time && `at ${r.new_departure_time}`}
                              </span>
                            )}
                          </p>

                          {r.admin_note && (
                            <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-white/5">
                              Admin Note: "{r.admin_note}"
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-xl ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}

                    {/* Refund Applications */}
                    {refundReqs.map((r) => (
                      <div
                        key={r.id}
                        className="glass-card p-5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                              <DollarSign size={12} /> Refund Application
                            </span>
                            <span className="text-xs font-mono text-slate-400">Booking #{r.booking_id.slice(0, 8)}</span>
                          </div>

                          <p className="text-sm font-bold text-white">
                            Refundable Amount:{' '}
                            <span className="text-emerald-400 font-mono font-black">LKR {r.refundable_amount?.toFixed(2)}</span>
                          </p>

                          {r.admin_note && (
                            <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-white/5">
                              Admin Note: "{r.admin_note}"
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-xl ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Boarding Pass Modal */}
        <AnimatePresence>
          {selectedPassBooking && (
            <DigitalBoardingPassModal
              booking={selectedPassBooking}
              onClose={() => setSelectedPassBooking(null)}
            />
          )}
        </AnimatePresence>

        {/* Cancel Confirmation Modal */}
        <AnimatePresence>
          {cancelModalBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl"
              >
                <div className="flex items-center gap-3 text-red-400 mb-3">
                  <AlertCircle size={24} />
                  <h3 className="text-lg font-bold text-white">Cancel Booking?</h3>
                </div>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Are you sure you want to cancel booking for <strong>{cancelModalBooking.passenger_name}</strong> (Coach {cancelModalBooking.coach_number} · Seat {cancelModalBooking.seat_number})?
                  This segment interval <strong>[{cancelModalBooking.start_station_name} → {cancelModalBooking.end_station_name}]</strong> will be immediately released back to PostgreSQL inventory. If canceled 24h prior, a refund request will be automatically filed!
                </p>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCancelModalBooking(null)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Keep Booking
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    {cancelling ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Yes, Cancel Ticket'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── 2-STEP RESCHEDULE REQUEST MODAL ── */}
        <AnimatePresence>
          {rescheduleBooking && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
              onClick={(e) => { if (e.target === e.currentTarget) setRescheduleBooking(null) }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl relative"
              >
                {/* Modal Header with Progress Step Indicator */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="text-amber-400" size={20} />
                    <div>
                      <h3 className="text-lg font-bold text-white">Reschedule Booking</h3>
                      <p className="text-[11px] text-amber-400 font-semibold">Step {rescheduleStep} of 2</p>
                    </div>
                  </div>
                  <button onClick={() => setRescheduleBooking(null)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                {rescheduleStep === 1 ? (
                  /* ── STEP 1: STATION PAIR SELECTION ── */
                  <div className="space-y-4">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs">
                      <span className="text-slate-500 font-semibold block uppercase text-[10px]">Current Booking</span>
                      <p className="font-bold text-slate-200 mt-0.5">
                        {rescheduleBooking.passenger_name} ({rescheduleBooking.start_station_name} → {rescheduleBooking.end_station_name})
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">New Origin Station</label>
                      <select
                        className="select-field text-xs"
                        value={newStartId}
                        onChange={(e) => setNewStartId(e.target.value)}
                      >
                        <option value="">Select Origin Station</option>
                        {stations.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">New Destination Station</label>
                      <select
                        className="select-field text-xs"
                        value={newEndId}
                        onChange={(e) => setNewEndId(e.target.value)}
                      >
                        <option value="">Select Destination Station</option>
                        {stations.filter((s) => s.id !== newStartId).map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                      <button
                        type="button"
                        onClick={() => setRescheduleBooking(null)}
                        className="btn-secondary text-xs px-4 py-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleGoToStep2}
                        disabled={!newStartId || !newEndId}
                        className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5"
                      >
                        Next: Select Train & Date <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── STEP 2: TRAIN NAME & TRAVEL DATE SELECTION (FORM SUBMIT) ── */
                  <form onSubmit={handleFinalRescheduleSubmit} className="space-y-4">
                    <div className="bg-brand-500/10 p-3 rounded-xl border border-brand-500/20 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-brand-400 font-semibold block uppercase">Selected Route</span>
                        <span className="font-bold text-white">{getStationName(newStartId)} → {getStationName(newEndId)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRescheduleStep(1)}
                        className="text-[11px] text-brand-300 underline font-semibold"
                      >
                        Change Stations
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        New Travel Date <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        min={todayStr}
                        required
                        className="input-field text-xs"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Select Train Schedule / Express Line
                      </label>
                      {loadingSchedules ? (
                        <div className="py-2 text-xs text-slate-400 flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                          Loading available train schedules...
                        </div>
                      ) : availableSchedules.length > 0 ? (
                        <select
                          className="select-field text-xs"
                          value={newScheduleId}
                          onChange={(e) => setNewScheduleId(e.target.value)}
                        >
                          {availableSchedules.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.train_name} (#{s.train_number}) - Departure: {s.departure_time} ({s.departure_date})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-2">
                          <select
                            className="select-field text-xs"
                            value={newTrainId}
                            onChange={(e) => setNewTrainId(e.target.value)}
                          >
                            <option value="">-- Select Preferred Express Line --</option>
                            {trains.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} (#{t.train_number}) - {t.direction}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-amber-400/90 italic">
                            No pre-created schedule found for this exact date. Select express train line above to send request to admin!
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between gap-3 pt-4 border-t border-white/10 mt-6">
                      <button
                        type="button"
                        onClick={() => setRescheduleStep(1)}
                        className="btn-secondary text-xs px-3 py-2 flex items-center gap-1"
                      >
                        <ChevronLeft size={14} /> Back
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReschedule}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        {submittingReschedule ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Submit Reschedule Request'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
