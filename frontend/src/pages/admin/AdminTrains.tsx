import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminListTrains, adminCreateTrain, adminDeleteTrain, adminListTrainCoaches, adminAddCoach, adminUpdateCoach, adminRemoveCoach, AdminTrain, AdminCoach } from '../../services/api'
import { Plus, X, ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react'

export default function AdminTrains() {
  const [trains, setTrains] = useState<AdminTrain[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  
  const [trainModal, setTrainModal] = useState(false)
  const [trainNo, setTrainNo] = useState('')
  const [trainName, setTrainName] = useState('')
  const [trainDir, setTrainDir] = useState<'UP'|'DOWN'>('UP')

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
  const handleDeleteTrain = async (id: string) => {
    if (confirm('Delete this train and all its coaches?')) {
      try {
        await adminDeleteTrain(id)
        loadTrains()
      } catch (e) {
        alert('Failed')
      }
    }
  }

  return (
    <div>
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
            <TrainCard key={t.id} train={t} expanded={expanded === t.id} onToggle={() => setExpanded(expanded === t.id ? null : t.id)} onDelete={() => handleDeleteTrain(t.id)} />
          ))}
          {trains.length === 0 && <p className="text-slate-500 text-center py-8">No trains configured.</p>}
        </div>
      )}

      {/* Train Modal */}
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
                  <input required type="text" className="input-field" value={trainNo} onChange={e => setTrainNo(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Train Name</label>
                  <input required type="text" className="input-field" value={trainName} onChange={e => setTrainName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Direction</label>
                  <select className="select-field" value={trainDir} onChange={e => setTrainDir(e.target.value as 'UP'|'DOWN')}>
                    <option value="UP">UP</option>
                    <option value="DOWN">DOWN</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setTrainModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrainCard({ train, expanded, onToggle, onDelete }: { train: AdminTrain, expanded: boolean, onToggle: () => void, onDelete: () => void }) {
  const [coaches, setCoaches] = useState<AdminCoach[]>([])
  const [loading, setLoading] = useState(false)
  const [coachModal, setCoachModal] = useState(false)

  // Coach form
  const [cNum, setCNum] = useState('')
  const [cType, setCType] = useState<'RESERVED'|'UNRESERVED'>('RESERVED')
  const [cClass, setCClass] = useState('SECOND')
  const [cSeats, setCSeats] = useState('40')
  const [cLabel, setCLabel] = useState('')

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

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminAddCoach(train.id, {
        coach_number: Number(cNum), coach_type: cType, coach_class: cClass, total_seats: Number(cSeats), label: cLabel
      })
      setCoachModal(false)
      loadCoaches()
    } catch (e) { alert('Failed to add coach') }
  }

  const handleRemoveCoach = async (id: string) => {
    if(confirm('Remove this coach?')) {
      await adminRemoveCoach(id)
      loadCoaches()
    }
  }

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
              {train.direction}
            </span>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-white/5 bg-slate-900/30">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-slate-300">Coaches</h4>
                <button onClick={() => { setCNum(''); setCLabel(''); setCoachModal(true) }} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                  <Plus size={14}/> Add Coach
                </button>
              </div>
              
              {loading ? <p className="text-xs text-slate-500">Loading...</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase">
                        <th className="pb-2 font-semibold">Coach #</th>
                        <th className="pb-2 font-semibold">Label</th>
                        <th className="pb-2 font-semibold">Class</th>
                        <th className="pb-2 font-semibold">Type</th>
                        <th className="pb-2 font-semibold">Seats</th>
                        <th className="pb-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coaches.length === 0 ? <tr><td colSpan={6} className="text-xs text-slate-500 py-2">No coaches added</td></tr> : coaches.map(c => (
                        <tr key={c.id} className="border-t border-white/5">
                          <td className="py-2 text-slate-300">{c.coach_number}</td>
                          <td className="py-2 text-slate-400">{c.label || '-'}</td>
                          <td className="py-2 text-slate-400">{c.coach_class}</td>
                          <td className="py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.coach_type === 'RESERVED' ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-700 text-slate-300'}`}>
                              {c.coach_type}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md border border-slate-700">
                              {c.total_seats} seats
                            </span>
                          </td>
                          <td className="py-2">
                            <button onClick={() => handleRemoveCoach(c.id)} className="text-xs text-red-400 hover:underline">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {coachModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Add Coach to {train.name}</h3>
              <form onSubmit={handleAddCoach} className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Coach #</label>
                    <input required type="number" className="input-field" value={cNum} onChange={e => setCNum(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Label (e.g. A, B, C)</label>
                    <input type="text" className="input-field" value={cLabel} onChange={e => setCLabel(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Class</label>
                    <select className="select-field" value={cClass} onChange={e => setCClass(e.target.value)}>
                      <option value="FIRST">First Class</option>
                      <option value="SECOND">Second Class</option>
                      <option value="THIRD">Third Class</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Type</label>
                    <select className="select-field" value={cType} onChange={e => setCType(e.target.value as any)}>
                      <option value="RESERVED">Reserved</option>
                      <option value="UNRESERVED">Unreserved</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Seats</label>
                  <input required type="number" className="input-field" value={cSeats} onChange={e => setCSeats(e.target.value)} />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setCoachModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Add Coach</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
