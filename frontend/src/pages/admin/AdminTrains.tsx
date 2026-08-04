import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminListTrains, adminCreateTrain, adminDeleteTrain, adminListTrainCoaches, adminAddCoach, adminUpdateCoach, adminRemoveCoach, AdminTrain, AdminCoach } from '../../services/api'
import { Plus, X, ChevronDown, ChevronRight, Edit2, Trash2, Armchair, Eye, EyeOff, RefreshCw } from 'lucide-react'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal'

export default function AdminTrains() {
  const [trains, setTrains] = useState<AdminTrain[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTrain, setExpandedTrain] = useState<string | null>(null)
  
  // Confirm Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'TRAIN' | 'COACH'
    id: string
    title: string
    message: string
    trainIdForReload?: string
  } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      if (deleteTarget.type === 'TRAIN') {
        await adminDeleteTrain(deleteTarget.id)
        loadTrains()
      } else if (deleteTarget.type === 'COACH') {
        await adminRemoveCoach(deleteTarget.id)
        if (deleteTarget.trainIdForReload) {
          setExpandedTrain(null)
          setTimeout(() => setExpandedTrain(deleteTarget.trainIdForReload!), 50)
        }
      }
      setDeleteTarget(null)
    } catch (e) {
      alert('Failed to delete target')
    } finally {
      setDeleteLoading(false)
    }
  }
  
  // Train Modal
  const [trainModal, setTrainModal] = useState(false)
  const [trainNo, setTrainNo] = useState('')
  const [trainName, setTrainName] = useState('')
  const [trainDir, setTrainDir] = useState<'UP'|'DOWN'>('UP')

  // Coach Modal (Moved to root level for top-level backdrop blur overlay)
  const [coachModal, setCoachModal] = useState(false)
  const [activeTrainForCoach, setActiveTrainForCoach] = useState<AdminTrain | null>(null)
  const [editCoach, setEditCoach] = useState<AdminCoach | null>(null)
  
  // Coach Form State
  const [cNum, setCNum] = useState('')
  const [cType, setCType] = useState<'RESERVED'|'UNRESERVED'>('RESERVED')
  const [cClass, setCClass] = useState('SECOND')
  const [cSeats, setCSeats] = useState('40')
  const [cLabel, setCLabel] = useState('')

  const loadTrains = async () => {
    try {
      const data = await adminListTrains()
      setTrains(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadTrains() }, [])

  const handleCreateTrain = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminCreateTrain({ train_number: trainNo, name: trainName, direction: trainDir })
      setTrainModal(false)
      loadTrains()
    } catch (e) {
      alert('Failed to create train')
    }
  }

  const promptDeleteTrain = (t: AdminTrain) => {
    setDeleteTarget({
      type: 'TRAIN',
      id: t.id,
      title: 'Delete Train',
      message: `Are you sure you want to delete train #${t.train_number} (${t.name}) and all its coaches? This action cannot be undone.`,
    })
  }

  const promptRemoveCoach = (coachId: string, coachNo: number, trainId: string) => {
    setDeleteTarget({
      type: 'COACH',
      id: coachId,
      title: 'Remove Coach',
      message: `Are you sure you want to remove Coach #${coachNo}? All seat configuration for this coach will be permanently deleted.`,
      trainIdForReload: trainId,
    })
  }

  const openAddCoach = (train: AdminTrain) => {
    setActiveTrainForCoach(train)
    setEditCoach(null)
    setCNum('')
    setCType('RESERVED')
    setCClass('SECOND')
    setCSeats('40')
    setCLabel('')
    setCoachModal(true)
  }

  const openEditCoach = (train: AdminTrain, coach: AdminCoach) => {
    setActiveTrainForCoach(train)
    setEditCoach(coach)
    setCNum(String(coach.coach_number))
    setCType(coach.coach_type)
    setCClass(coach.coach_class)
    setCSeats(String(coach.total_seats))
    setCLabel(coach.label || '')
    setCoachModal(true)
  }

  const handleSaveCoach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTrainForCoach) return
    try {
      if (editCoach) {
        await adminUpdateCoach(editCoach.id, {
          coach_number: Number(cNum),
          coach_type: cType,
          coach_class: cClass,
          label: cLabel
        })
      } else {
        await adminAddCoach(activeTrainForCoach.id, {
          coach_number: Number(cNum),
          coach_type: cType,
          coach_class: cClass,
          total_seats: Number(cSeats),
          label: cLabel
        })
      }
      setCoachModal(false)
      // Force reload coaches by keeping expanded
      setExpandedTrain(null)
      setTimeout(() => setExpandedTrain(activeTrainForCoach.id), 50)
    } catch (e) {
      alert('Failed to save coach')
    }
  }

  return (
    <div>
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || 'Confirm Deletion'}
        message={deleteTarget?.message || ''}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">Train & Coach Configurator</h2>
        <button onClick={() => { setTrainNo(''); setTrainName(''); setTrainModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Train
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {trains.map(t => (
            <TrainCard
              key={t.id}
              train={t}
              expanded={expandedTrain === t.id}
              onToggle={() => setExpandedTrain(expandedTrain === t.id ? null : t.id)}
              onDelete={() => promptDeleteTrain(t)}
              onAddCoach={() => openAddCoach(t)}
              onEditCoach={(c) => openEditCoach(t, c)}
              onPromptRemoveCoach={(coachId, coachNo) => promptRemoveCoach(coachId, coachNo, t.id)}
            />
          ))}
          {trains.length === 0 && <p className="text-slate-500 text-center py-8">No trains configured.</p>}
        </div>
      )}

      {/* Top-Level Train Modal Overlay */}
      <AnimatePresence>
        {trainModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Add Train</h3>
                <button onClick={() => setTrainModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateTrain} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Train Number</label>
                  <input required type="text" className="input-field" value={trainNo} onChange={e => setTrainNo(e.target.value)} placeholder="e.g. 1015" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Train Name</label>
                  <input required type="text" className="input-field" value={trainName} onChange={e => setTrainName(e.target.value)} placeholder="e.g. Udarata Menike" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Direction</label>
                  <select className="select-field" value={trainDir} onChange={e => setTrainDir(e.target.value as 'UP'|'DOWN')}>
                    <option value="UP" className="text-slate-900 bg-white">UP (Colombo ➔ Badulla)</option>
                    <option value="DOWN" className="text-slate-900 bg-white">DOWN (Badulla ➔ Colombo)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setTrainModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Create Train</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top-Level Coach Modal Overlay */}
      <AnimatePresence>
        {coachModal && activeTrainForCoach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{editCoach ? 'Edit Coach' : `Add Coach to ${activeTrainForCoach.name}`}</h3>
                <button onClick={() => setCoachModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveCoach} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Coach Number</label>
                    <input required type="number" className="input-field" value={cNum} onChange={e => setCNum(e.target.value)} placeholder="1" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Label (e.g. A, B, C)</label>
                    <input type="text" className="input-field" value={cLabel} onChange={e => setCLabel(e.target.value)} placeholder="Coach A" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Class</label>
                    <select className="select-field" value={cClass} onChange={e => setCClass(e.target.value)}>
                      <option value="FIRST" className="text-slate-900 bg-white">First Class</option>
                      <option value="SECOND" className="text-slate-900 bg-white">Second Class</option>
                      <option value="THIRD" className="text-slate-900 bg-white">Third Class</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                    <select className="select-field" value={cType} onChange={e => setCType(e.target.value as any)}>
                      <option value="RESERVED" className="text-slate-900 bg-white">Reserved</option>
                      <option value="UNRESERVED" className="text-slate-900 bg-white">Unreserved</option>
                    </select>
                  </div>
                </div>
                {!editCoach && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Total Seats Capacity</label>
                    <input required type="number" className="input-field" value={cSeats} onChange={e => setCSeats(e.target.value)} placeholder="40" />
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setCoachModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">{editCoach ? 'Save Changes' : 'Add Coach'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrainCard({
  train,
  expanded,
  onToggle,
  onDelete,
  onAddCoach,
  onEditCoach,
  onPromptRemoveCoach
}: {
  train: AdminTrain
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onAddCoach: () => void
  onEditCoach: (coach: AdminCoach) => void
  onPromptRemoveCoach: (coachId: string, coachNo: number) => void
}) {
  const [coaches, setCoaches] = useState<AdminCoach[]>([])
  const [loading, setLoading] = useState(false)
  const [viewSeatsCoachId, setViewSeatsCoachId] = useState<string | null>(null)

  const loadCoaches = async () => {
    setLoading(true)
    try {
      const data = await adminListTrainCoaches(train.id)
      setCoaches(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expanded) loadCoaches()
  }, [expanded, train.id])

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-4">
          <div className="text-slate-400">{expanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}</div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              {train.name} <span className="text-slate-400 text-sm font-mono">#{train.train_number}</span>
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${train.direction === 'UP' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {train.direction === 'UP' ? 'UP (Colombo ➔ Badulla)' : 'DOWN (Badulla ➔ Colombo)'}
            </span>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete Train">
          <Trash2 size={16} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-white/5 bg-slate-900/40">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Armchair size={16} className="text-brand-400" /> Train Coaches & Capacity
                </h4>
                <div className="flex items-center gap-2">
                  <button onClick={loadCoaches} disabled={loading} aria-label={`Refresh coaches for ${train.name}`} title="Refresh table data" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={onAddCoach} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                    <Plus size={14}/> Add Coach
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading coaches...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase border-b border-white/5">
                        <th className="pb-3 font-semibold">Coach #</th>
                        <th className="pb-3 font-semibold">Label</th>
                        <th className="pb-3 font-semibold">Class</th>
                        <th className="pb-3 font-semibold">Type</th>
                        <th className="pb-3 font-semibold">Seats / Booked</th>
                        <th className="pb-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coaches.length === 0 ? (
                        <tr><td colSpan={6} className="text-xs text-slate-500 py-6 text-center">No coaches added to this train. Click "+ Add Coach" to create one.</td></tr>
                      ) : coaches.map(c => (
                        <React.Fragment key={c.id}>
                          <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 text-slate-200 font-medium">Coach {c.coach_number}</td>
                            <td className="py-3 text-slate-400">{c.label || '-'}</td>
                            <td className="py-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                c.coach_class === 'FIRST' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                                c.coach_class === 'SECOND' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {c.coach_class} CLASS
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.coach_type === 'RESERVED' ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-400'}`}>
                                {c.coach_type}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 font-mono">
                                  {c.total_seats} seats
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  (c.booked_seats || 0) > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  {c.booked_seats || 0} booked
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <button onClick={() => setViewSeatsCoachId(viewSeatsCoachId === c.id ? null : c.id)} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                                  {viewSeatsCoachId === c.id ? <EyeOff size={13}/> : <Eye size={13}/>}
                                  {viewSeatsCoachId === c.id ? 'Hide Seats' : 'View Seats'}
                                </button>
                                <button onClick={() => onEditCoach(c)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                  <Edit2 size={13}/> Edit
                                </button>
                                <button onClick={() => onPromptRemoveCoach(c.id, c.coach_number)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                  <Trash2 size={13}/> Remove
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline Coach Seat Grid Preview */}
                          {viewSeatsCoachId === c.id && (
                            <tr>
                              <td colSpan={6} className="bg-slate-950/60 p-4 border-b border-white/5">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                                    <span className="font-semibold text-slate-300">Coach #{c.coach_number} Seat Grid Breakdown</span>
                                    <div className="flex items-center gap-4">
                                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500 inline-block"/> Available ({c.total_seats - (c.booked_seats || 0)})</span>
                                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500 inline-block"/> Booked ({c.booked_seats || 0})</span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
                                    {Array.from({ length: c.total_seats }).map((_, idx) => {
                                      const sNum = idx + 1
                                      const isBooked = sNum <= (c.booked_seats || 0) // Visual representation
                                      return (
                                        <div key={sNum} className={`py-1.5 px-1 rounded text-center text-xs font-mono border ${
                                          isBooked ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-green-500/10 border-green-500/30 text-green-300'
                                        }`}>
                                          S{sNum}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
