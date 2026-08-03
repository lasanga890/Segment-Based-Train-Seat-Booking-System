import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Search,
  DollarSign,
  Calendar,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import {
  adminGetRefundRequests,
  adminApproveRefundRequest,
  adminRejectRefundRequest,
  adminGetRescheduleRequests,
  adminApproveRescheduleRequest,
  adminRejectRescheduleRequest,
} from '../../services/api'

interface RefundReq {
  id: string
  booking_id: string
  user_id: string
  requested_at: string
  refundable_amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  admin_note?: string
  decided_at?: string
  passenger_name: string
  fare_lkr: number
  departure_date?: string
  departure_time?: string
}

interface RescheduleReq {
  id: string
  booking_id: string
  user_id: string
  requested_at: string
  new_schedule_id?: string
  new_start_station_id?: string
  new_end_station_id?: string
  new_seat_id?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
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

export default function AdminRequests() {
  const [activeTab, setActiveTab] = useState<'RESCHEDULE' | 'REFUND'>('RESCHEDULE')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [search, setSearch] = useState('')

  const [rescheduleList, setRescheduleList] = useState<RescheduleReq[]>([])
  const [refundList, setRefundList] = useState<RefundReq[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Decision Modal State (Approve or Reject with Admin Note)
  const [actionModal, setActionModal] = useState<{
    type: 'RESCHEDULE' | 'REFUND'
    action: 'APPROVE' | 'REJECT'
    id: string
    passenger: string
  } | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const [resData, refData] = await Promise.all([
        adminGetRescheduleRequests(),
        adminGetRefundRequests(),
      ])
      setRescheduleList(resData || [])
      setRefundList(refData || [])
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to load passenger requests', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Filter Reschedules
  const filteredReschedules = rescheduleList.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
    const matchesSearch =
      !search ||
      r.passenger_name.toLowerCase().includes(search.toLowerCase()) ||
      r.booking_id.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Filter Refunds
  const filteredRefunds = refundList.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
    const matchesSearch =
      !search ||
      r.passenger_name.toLowerCase().includes(search.toLowerCase()) ||
      r.booking_id.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const pendingRescheduleCount = rescheduleList.filter((r) => r.status === 'PENDING').length
  const pendingRefundCount = refundList.filter((r) => r.status === 'PENDING').length

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionModal) return
    setSubmitting(true)
    try {
      if (actionModal.type === 'RESCHEDULE') {
        if (actionModal.action === 'APPROVE') {
          await adminApproveRescheduleRequest(actionModal.id, adminNote)
          setToast({ msg: 'Reschedule request approved!', type: 'success' })
        } else {
          await adminRejectRescheduleRequest(actionModal.id, adminNote)
          setToast({ msg: 'Reschedule request rejected.', type: 'success' })
        }
      } else {
        if (actionModal.action === 'APPROVE') {
          await adminApproveRefundRequest(actionModal.id, adminNote)
          setToast({ msg: 'Refund request approved & booking cancelled!', type: 'success' })
        } else {
          await adminRejectRefundRequest(actionModal.id, adminNote)
          setToast({ msg: 'Refund request rejected.', type: 'success' })
        }
      }
      setActionModal(null)
      setAdminNote('')
      loadRequests()
    } catch (err: any) {
      setToast({ msg: err.message || 'Action failed', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Inbox className="text-brand-400" size={26} /> Passenger Requests
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Manage passenger reschedule & refund applications in structured tables</p>
        </div>
      </div>

      {/* Main Sub-Tabs & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('RESCHEDULE')}
            className={`flex-1 sm:flex-initial py-2.5 px-5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2.5 ${
              activeTab === 'RESCHEDULE' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={15} />
            Reschedule Requests
            {pendingRescheduleCount > 0 && (
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                {pendingRescheduleCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('REFUND')}
            className={`flex-1 sm:flex-initial py-2.5 px-5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2.5 ${
              activeTab === 'REFUND' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign size={15} />
            Refund Requests
            {pendingRefundCount > 0 && (
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                {pendingRefundCount}
              </span>
            )}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              className="input-field text-xs pl-9 py-2"
              placeholder="Search Passenger / Booking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select-field text-xs py-2 w-32"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Content Table Views */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'RESCHEDULE' ? (
        /* ── TABLE 1: RESCHEDULE REQUESTS ── */
        <div className="glass-card overflow-hidden border border-white/10 rounded-2xl">
          <div className="flex justify-end border-b border-white/5 px-3 py-2">
            <button
              onClick={loadRequests}
              disabled={loading}
              aria-label="Refresh passenger requests"
              title="Refresh table data"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  {['Req ID', 'Passenger', 'Booking ID', 'Original Schedule', 'Requested Route & Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReschedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No reschedule requests found
                    </td>
                  </tr>
                ) : (
                  filteredReschedules.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{r.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{r.passenger_name}</td>
                      <td className="px-4 py-3 text-brand-300 font-mono text-xs">#{r.booking_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {r.departure_date || 'Scheduled'} {r.departure_time && `at ${r.departure_time}`}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-300 font-semibold">
                        {r.new_start_name && r.new_end_name
                          ? `${r.new_start_name} → ${r.new_end_name}`
                          : 'Route Change'}
                        {r.new_departure_date && (
                          <span className="text-slate-300 block text-[11px] font-normal">
                            Date: {r.new_departure_date}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-block ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setActionModal({
                                  type: 'RESCHEDULE',
                                  action: 'APPROVE',
                                  id: r.id,
                                  passenger: r.passenger_name,
                                })
                              }
                              aria-label={`Approve ${r.passenger_name}'s reschedule request`}
                              title="Approve request"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() =>
                                setActionModal({
                                  type: 'RESCHEDULE',
                                  action: 'REJECT',
                                  id: r.id,
                                  passenger: r.passenger_name,
                                })
                              }
                              aria-label={`Reject ${r.passenger_name}'s reschedule request`}
                              title="Reject request"
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-lg transition-colors"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">Decided</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── TABLE 2: REFUND REQUESTS ── */
        <div className="glass-card overflow-hidden border border-white/10 rounded-2xl">
          <div className="flex justify-end border-b border-white/5 px-3 py-2">
            <button
              onClick={loadRequests}
              disabled={loading}
              aria-label="Refresh passenger requests"
              title="Refresh table data"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  {['Req ID', 'Passenger', 'Booking ID', 'Original Fare', 'Refundable (LKR)', 'Departure Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No refund requests found
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{r.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{r.passenger_name}</td>
                      <td className="px-4 py-3 text-brand-300 font-mono text-xs">#{r.booking_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">LKR {r.fare_lkr?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-emerald-400 font-mono font-bold text-xs">LKR {r.refundable_amount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{r.departure_date || 'Scheduled'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-block ${
                            r.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setActionModal({
                                  type: 'REFUND',
                                  action: 'APPROVE',
                                  id: r.id,
                                  passenger: r.passenger_name,
                                })
                              }
                              aria-label={`Approve ${r.passenger_name}'s refund request`}
                              title="Approve request"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() =>
                                setActionModal({
                                  type: 'REFUND',
                                  action: 'REJECT',
                                  id: r.id,
                                  passenger: r.passenger_name,
                                })
                              }
                              aria-label={`Reject ${r.passenger_name}'s refund request`}
                              title="Reject request"
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-lg transition-colors"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">Decided</span>
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

      {/* ── Action Decision Modal (Approve / Reject with Admin Note) ── */}
      <AnimatePresence>
        {actionModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) setActionModal(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <h3 className="text-lg font-bold text-white">
                  {actionModal.action === 'APPROVE' ? 'Approve' : 'Reject'}{' '}
                  {actionModal.type === 'RESCHEDULE' ? 'Reschedule Request' : 'Refund Request'}
                </h3>
                <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Passenger: <strong>{actionModal.passenger}</strong>
              </p>

              <form onSubmit={handleDecisionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Admin Decision Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="input-field text-sm w-full p-2.5"
                    placeholder="Provide a note or reason for the passenger..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                      actionModal.action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                    }`}
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      `Confirm ${actionModal.action === 'APPROVE' ? 'Approval' : 'Rejection'}`
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
