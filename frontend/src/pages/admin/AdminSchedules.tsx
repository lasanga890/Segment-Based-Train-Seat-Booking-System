import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminListSchedules, adminCreateSchedule, adminToggleScheduleStatus, adminListTrains, AdminSchedule, AdminTrain } from '../../services/api'
import { Plus, X, Search, Clock, Ban, CheckCircle } from 'lucide-react'

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState<AdminSchedule[]>([])
  const [loading, setLoading] = useState(true)
  
  // filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dirFilter, setDirFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [toggleModalOpen, setToggleModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<AdminSchedule | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [trains, setTrains] = useState<AdminTrain[]>([])
  
  // form
  const [fTrain, setFTrain] = useState('')
  const [fStartDate, setFStartDate] = useState('')
  const [fEndDate, setFEndDate] = useState('')
  const [fTime, setFTime] = useState('')

  const loadSchedules = async () => {
    try {
      const data = await adminListSchedules({
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        ...(dirFilter !== 'ALL' ? { direction: dirFilter } : {})
      })
      setSchedules(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSchedules() }, [dateFrom, dateTo, dirFilter])

  const openCreate = async () => {
    try {
      const ts = await adminListTrains()
      setTrains(ts)
      if(ts.length > 0) setFTrain(ts[0].id)
      setFStartDate(new Date().toISOString().slice(0, 10))
      setFEndDate(new Date().toISOString().slice(0, 10))
      setFTime('')
      setModalOpen(true)
    } catch(e) { alert('Failed to load trains') }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminCreateSchedule({ train_id: fTrain, start_date: fStartDate, end_date: fEndDate, departure_time: fTime })
      setModalOpen(false)
      loadSchedules()
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to create schedule') }
  }

  const openToggleModal = (s: AdminSchedule) => {
    setSelectedSchedule(s)
    setCancelReason(s.cancel_reason || '')
    setToggleModalOpen(true)
  }

  const submitToggle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchedule) return
    try {
      // If currently active, we are cancelling (setting is_active = false) with reason
      // If currently cancelled, we are reactivating (setting is_active = true) without reason
      await adminToggleScheduleStatus(selectedSchedule.id, !selectedSchedule.is_active, cancelReason)
      setToggleModalOpen(false)
      loadSchedules()
    } catch (e) { alert('Failed to change status') }
  }

  const filtered = schedules.filter(s => s.train_name?.toLowerCase().includes(search.toLowerCase()) || s.train_number?.includes(search))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">Schedule Engine</h2>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create Schedule
        </button>
      </div>

      <div className="glass-card p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search train..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-400">From</span>
          <input type="date" className="input-field py-2" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-400">To</span>
          <input type="date" className="input-field py-2" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <select className="select-field py-2 w-32" value={dirFilter} onChange={e => setDirFilter(e.target.value)}>
          <option value="ALL">All Dir</option>
          <option value="UP">UP</option>
          <option value="DOWN">DOWN</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Train</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Dep. Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No schedules found</td></tr>
                ) : filtered.map((s, i) => (
                  <motion.tr
                    key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i*0.02, 0.2) }}
                    className={`border-b border-white/5 hover:bg-white/[0.02] ${!s.is_active ? 'opacity-50 line-through' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{s.train_name}</p>
                      <p className="text-xs text-slate-500">#{s.train_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.direction === 'UP' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {s.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.departure_date}</td>
                    <td className="px-4 py-3 text-brand-300 font-mono flex items-center gap-1">
                      <Clock size={12}/> {s.departure_time}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <span className="text-xs px-2 py-1 rounded-md font-medium bg-green-500/20 text-green-400">Active</span>
                      ) : (
                        <div>
                          <span className="text-xs px-2 py-1 rounded-md font-medium bg-slate-700 text-slate-400">Cancelled</span>
                          {s.cancel_reason && <p className="text-[10px] text-slate-500 mt-1 max-w-[120px] truncate" title={s.cancel_reason}>{s.cancel_reason}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <button onClick={() => openToggleModal(s)} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs">
                          <Ban size={14}/> Stop
                        </button>
                      ) : (
                        <button onClick={() => openToggleModal(s)} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs">
                          <CheckCircle size={14}/> Reactivate
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Create Schedule</h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Train</label>
                  <select required className="select-field" value={fTrain} onChange={e => setFTrain(e.target.value)}>
                    {trains.map(t => <option key={t.id} value={t.id}>{t.name} (#{t.train_number}) - {t.direction}</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                    <input required type="date" min={new Date().toISOString().slice(0, 10)} className="input-field" value={fStartDate} onChange={e => setFStartDate(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
                    <input required type="date" min={fStartDate || new Date().toISOString().slice(0, 10)} className="input-field" value={fEndDate} onChange={e => setFEndDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Departure Time</label>
                  <input required type="time" className="input-field" value={fTime} onChange={e => setFTime(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Create Schedule</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        
        {/* Toggle Status Modal */}
        {toggleModalOpen && selectedSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedSchedule.is_active ? 'Cancel Schedule' : 'Reactivate Schedule'}</h3>
                <button onClick={() => setToggleModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={submitToggle} className="space-y-4">
                <p className="text-sm text-slate-300">
                  Are you sure you want to {selectedSchedule.is_active ? 'cancel' : 'reactivate'} the schedule for <strong>{selectedSchedule.train_name}</strong> on <strong>{selectedSchedule.departure_date}</strong>?
                </p>
                {selectedSchedule.is_active && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Reason for Cancellation (Optional)</label>
                    <input type="text" placeholder="e.g., Track maintenance, Weather" className="input-field" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setToggleModalOpen(false)} className="btn-secondary">Close</button>
                  <button type="submit" className={selectedSchedule.is_active ? "btn-primary bg-red-600 hover:bg-red-500" : "btn-primary bg-emerald-600 hover:bg-emerald-500"}>
                    {selectedSchedule.is_active ? 'Confirm Cancel' : 'Confirm Reactivate'}
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
