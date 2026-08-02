import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket,
  Calendar,
  Clock,
  Train,
  Armchair,
  CheckCircle2,
  Ban,
  QrCode,
  AlertCircle,
  Inbox,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import {
  getUserBookings,
  cancelUserBooking,
  getUserWaitlists,
  type UserBooking,
  type WaitlistItem,
} from '../services/api'
import Navbar from '../components/Navbar'
import DigitalBoardingPassModal from '../components/DigitalBoardingPassModal'

export default function MyBookingsPage() {
  const [tab, setTab] = useState<'UPCOMING' | 'PAST' | 'WAITLIST' | 'CANCELLED'>('UPCOMING')
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [waitlists, setWaitlists] = useState<WaitlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPassBooking, setSelectedPassBooking] = useState<UserBooking | null>(null)
  const [cancelModalBooking, setCancelModalBooking] = useState<UserBooking | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bData, wData] = await Promise.all([getUserBookings(), getUserWaitlists()])
      setBookings(bData)
      setWaitlists(wData)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load journeys' })
    } finally {
      setLoading(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const upcomingBookings = bookings.filter((b) => b.status !== 'CANCELLED' && (b.departure_date >= todayStr || !b.departure_date))
  const pastBookings = bookings.filter((b) => b.status !== 'CANCELLED' && b.departure_date && b.departure_date < todayStr)
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED')

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Ticket size={32} className="text-brand-400" />
              My Journeys & Tickets
            </h1>
            <p className="text-sm text-slate-400 mt-1">View digital boarding passes, manage bookings & waitlists</p>
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
        <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 max-w-xl">
          <button
            onClick={() => setTab('UPCOMING')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              tab === 'UPCOMING' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setTab('PAST')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              tab === 'PAST' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Past ({pastBookings.length})
          </button>
          <button
            onClick={() => setTab('WAITLIST')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              tab === 'WAITLIST' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Waitlists ({waitlists.length})
          </button>
          <button
            onClick={() => setTab('CANCELLED')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              tab === 'CANCELLED' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cancelled ({cancelledBookings.length})
          </button>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* ── UPCOMING & PAST JOURNEYS ── */}
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
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => setSelectedPassBooking(b)}
                              className="btn-primary py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                            >
                              <QrCode size={15} /> Boarding Pass
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-6 w-full max-w-md border border-white/10"
              >
                <div className="flex items-center gap-3 text-red-400 mb-3">
                  <AlertCircle size={24} />
                  <h3 className="text-lg font-bold text-white">Cancel Booking?</h3>
                </div>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Are you sure you want to cancel booking for <strong>{cancelModalBooking.passenger_name}</strong> (Coach {cancelModalBooking.coach_number} · Seat {cancelModalBooking.seat_number})?
                  This segment interval <strong>[{cancelModalBooking.start_station_name} → {cancelModalBooking.end_station_name}]</strong> will be immediately released back to PostgreSQL inventory.
                </p>

                <div className="flex justify-end gap-3 mt-6">
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
      </main>
    </div>
  )
}
