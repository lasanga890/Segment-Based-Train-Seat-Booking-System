import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminListSchedulesPaginated, adminCreateSchedule, adminToggleScheduleStatus, adminListTrains, AdminSchedule, AdminTrain } from '../../services/api'
import { Plus, X, Search, Clock, Ban, CheckCircle, ChevronDown, ChevronRight, Layers, Calendar, RefreshCw } from 'lucide-react'
import Pagination from '../../components/Pagination'

interface ScheduleGroup {
  id: string
  type: 'single' | 'batch'
  batchId?: string
  trainName: string
  trainNumber: string
  direction: string
  departureTime: string
  startDate: string
  endDate: string
  totalCount: number
  activeCount: number
  cancelledCount: number
  schedules: AdminSchedule[]
}

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState<AdminSchedule[]>([])
  const [loading, setLoading] = useState(true)
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

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
  const [isSingleDay, setIsSingleDay] = useState(false)
  const [fStartDate, setFStartDate] = useState('')
  const [fEndDate, setFEndDate] = useState('')
  const [fTime, setFTime] = useState('')

  // expanded batch rows
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({})

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const res = await adminListSchedulesPaginated({
        page,
        limit,
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        ...(dirFilter !== 'ALL' ? { direction: dirFilter } : {})
      })
      setSchedules(res.data)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSchedules() }, [dateFrom, dateTo, dirFilter, page, limit])

  const openCreate = async () => {
    try {
      const ts = await adminListTrains()
      setTrains(ts)
      if(ts.length > 0) setFTrain(ts[0].id)
      const today = new Date().toISOString().slice(0, 10)
      setFStartDate(today)
      setFEndDate(today)
      setIsSingleDay(false)
      setFTime('')
      setModalOpen(true)
    } catch(e) { alert('Failed to load trains') }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const finalEndDate = isSingleDay ? fStartDate : fEndDate
      await adminCreateSchedule({ 
        train_id: fTrain, 
        start_date: fStartDate, 
        end_date: finalEndDate, 
        departure_time: fTime 
      })
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
      await adminToggleScheduleStatus(selectedSchedule.id, !selectedSchedule.is_active, cancelReason)
      setToggleModalOpen(false)
      loadSchedules()
    } catch (e) { alert('Failed to change status') }
  }

  const toggleBatchExpand = (batchId: string) => {
    setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }))
  }

  const filtered = useMemo(() => {
    return schedules.filter(s => s.train_name?.toLowerCase().includes(search.toLowerCase()) || s.train_number?.includes(search))
  }, [schedules, search])

  // Group schedules by batch_id
  const scheduleGroups = useMemo(() => {
    const batchMap = new Map<string, AdminSchedule[]>()
    const singleItems: AdminSchedule[] = []

    filtered.forEach(s => {
      if (s.batch_id) {
        if (!batchMap.has(s.batch_id)) {
          batchMap.set(s.batch_id, [])
        }
        batchMap.get(s.batch_id)!.push(s)
      } else {
        singleItems.push(s)
      }
    })

    const groups: ScheduleGroup[] = []

    // Add batch groups
    batchMap.forEach((batchSchedules, batchId) => {
      if (batchSchedules.length > 1) {
        // Sort by date ASC
        batchSchedules.sort((a, b) => a.departure_date.localeCompare(b.departure_date))
        const first = batchSchedules[0]
        const last = batchSchedules[batchSchedules.length - 1]
        const activeCount = batchSchedules.filter(s => s.is_active).length
        const cancelledCount = batchSchedules.length - activeCount

        groups.push({
          id: `batch-${batchId}`,
          type: 'batch',
          batchId,
          trainName: first.train_name,
          trainNumber: first.train_number,
          direction: first.direction,
          departureTime: first.departure_time,
          startDate: first.departure_date,
          endDate: last.departure_date,
          totalCount: batchSchedules.length,
          activeCount,
          cancelledCount,
          schedules: batchSchedules
        })
      } else {
        // Single schedule even if batch_id is present
        batchSchedules.forEach(s => singleItems.push(s))
      }
    })

    // Add single items
    singleItems.forEach(s => {
      groups.push({
        id: `single-${s.id}`,
        type: 'single',
        trainName: s.train_name,
        trainNumber: s.train_number,
        direction: s.direction,
        departureTime: s.departure_time,
        startDate: s.departure_date,
        endDate: s.departure_date,
        totalCount: 1,
        activeCount: s.is_active ? 1 : 0,
        cancelledCount: s.is_active ? 0 : 1,
        schedules: [s]
      })
    })

    // Sort groups by start date DESC
    groups.sort((a, b) => b.startDate.localeCompare(a.startDate))

    return groups
  }, [filtered])

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
          <div className="flex justify-end border-b border-white/5 px-3 py-2">
            <button onClick={loadSchedules} disabled={loading} aria-label="Refresh schedules" title="Refresh table data" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Train</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Date / Range</th>
                  <th className="px-4 py-3">Dep. Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduleGroups.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No schedules found</td></tr>
                ) : scheduleGroups.map((group, i) => {
                  if (group.type === 'batch' && group.batchId) {
                    const isExpanded = !!expandedBatches[group.batchId]
                    return (
                      <React.Fragment key={group.id}>
                        {/* Parent Batch Row */}
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i*0.02, 0.2) }}
                          onClick={() => toggleBatchExpand(group.batchId!)}
                          className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer bg-white/[0.01]"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={16} className="text-brand-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                              <div>
                                <p className="font-medium text-slate-200 flex items-center gap-1.5">
                                  {group.trainName}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-normal flex items-center gap-1">
                                    <Layers size={10} /> Bulk Schedule
                                  </span>
                                </p>
                                <p className="text-xs text-slate-500">#{group.trainNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${group.direction === 'UP' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                              {group.direction}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-slate-200">
                              <Calendar size={14} className="text-brand-400" />
                              <span>{group.startDate} <span className="text-slate-500">→</span> {group.endDate}</span>
                              <span className="text-xs text-slate-400 font-mono">({group.totalCount} days)</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-brand-300 font-mono flex items-center gap-1">
                            <Clock size={12}/> {group.departureTime}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 items-center">
                              {group.activeCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-green-500/20 text-green-400">
                                  {group.activeCount} Active
                                </span>
                              )}
                              {group.cancelledCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-red-500/20 text-red-400">
                                  {group.cancelledCount} Stopped
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={(e) => { e.stopPropagation(); toggleBatchExpand(group.batchId!) }} className="text-xs text-brand-400 hover:underline">
                              {isExpanded ? 'Hide Days' : 'View Days'}
                            </button>
                          </td>
                        </motion.tr>

                        {/* Child Sub-rows when Expanded */}
                        {isExpanded && group.schedules.map((s) => (
                          <tr key={s.id} className={`border-b border-white/5 bg-slate-900/60 ${!s.is_active ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-2.5 pl-10 text-xs text-slate-400">
                              ↳ Single Service Date
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-400">
                              -
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-200 font-medium">
                              {s.departure_date}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-brand-300 font-mono">
                              {s.departure_time}
                            </td>
                            <td className="px-4 py-2.5">
                              {s.is_active ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-green-500/20 text-green-400">Active</span>
                              ) : (
                                <div>
                                  <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-700 text-slate-400">Cancelled</span>
                                  {s.cancel_reason && <p className="text-[10px] text-slate-400 mt-0.5" title={s.cancel_reason}>{s.cancel_reason}</p>}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {s.is_active ? (
                                <button onClick={() => openToggleModal(s)} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs">
                                  <Ban size={12}/> Stop
                                </button>
                              ) : (
                                <button onClick={() => openToggleModal(s)} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs">
                                  <CheckCircle size={12}/> Reactivate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  } else {
                    // Single Schedule Row
                    const s = group.schedules[0]
                    return (
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
                    )
                  }
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      )}

      {/* Create Modal */}
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

                {/* Single Day Checkbox */}
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="singleDayCheck" 
                    checked={isSingleDay} 
                    onChange={e => setIsSingleDay(e.target.checked)} 
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500" 
                  />
                  <label htmlFor="singleDayCheck" className="text-sm text-slate-300 select-none cursor-pointer">
                    Single Day Schedule (One date only)
                  </label>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {isSingleDay ? 'Date' : 'Start Date'}
                    </label>
                    <input required type="date" min={new Date().toISOString().slice(0, 10)} className="input-field" value={fStartDate} onChange={e => setFStartDate(e.target.value)} />
                  </div>
                  {!isSingleDay && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
                      <input required type="date" min={fStartDate || new Date().toISOString().slice(0, 10)} className="input-field" value={fEndDate} onChange={e => setFEndDate(e.target.value)} />
                    </div>
                  )}
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
