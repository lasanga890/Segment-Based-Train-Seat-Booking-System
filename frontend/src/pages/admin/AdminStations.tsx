import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStations, adminCreateStation, adminUpdateStation, adminToggleStationStatus, Station, AdminStation } from '../../services/api'
import { Edit2, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react'

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
        type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
      } z-50`}
    >
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  )
}

export default function AdminStations() {
  const [stations, setStations] = useState<AdminStation[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setModalOpen] = useState(false)
  const [editStation, setEditStation] = useState<AdminStation | null>(null)
  
  // form state
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [seq, setSeq] = useState('')
  const [dist, setDist] = useState('')

  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null)

  const loadStations = async () => {
    try {
      const data = await getStations(true) as unknown as AdminStation[]
      data.sort((a, b) => a.distance_km - b.distance_km)
      setStations(data)
    } catch (e) {
      setToast({ msg: 'Failed to load stations', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStations() }, [])

  const openAdd = () => {
    setEditStation(null)
    setName(''); setCode(''); setSeq(''); setDist('')
    setModalOpen(true)
  }

  const openEdit = (st: AdminStation) => {
    setEditStation(st)
    setName(st.name)
    setCode(st.code)
    setSeq(String(st.sequence_order))
    setDist(String(st.distance_km))
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editStation) {
        await adminUpdateStation(editStation.id, {
          name, code, sequence_order: Number(seq), distance_km: Number(dist)
        })
        setToast({ msg: 'Station updated', type: 'success' })
      } else {
        await adminCreateStation({
          name, code, sequence_order: Number(seq), distance_km: Number(dist), is_active: true
        })
        setToast({ msg: 'Station created', type: 'success' })
      }
      setModalOpen(false)
      loadStations()
    } catch (err: any) {
      setToast({ msg: err.message || 'Action failed', type: 'error' })
    }
  }

  const handleToggle = async (st: AdminStation) => {
    try {
      await adminToggleStationStatus(st.id, !st.is_active)
      setToast({ msg: `Station marked ${!st.is_active ? 'active' : 'inactive'}`, type: 'success' })
      loadStations()
    } catch (e) {
      setToast({ msg: 'Failed to toggle status', type: 'error' })
    }
  }

  return (
    <div>
      <AnimatePresence>
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">Station Management</h2>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Station
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {['Seq #', 'Name', 'Code', 'Distance KM', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No stations found
                    </td>
                  </tr>
                ) : (
                  stations.map((s, i) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${!s.is_active ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono">{s.sequence_order}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {s.is_active ? s.name : <span className="line-through">{s.name}</span>}
                      </td>
                      <td className="px-4 py-3 text-brand-300 font-mono">{s.code}</td>
                      <td className="px-4 py-3 text-slate-400">{s.distance_km}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400 line-through'
                        }`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleToggle(s)} className="text-xs font-medium px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                          Toggle
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{editStation ? 'Edit Station' : 'Add Station'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Station Name</label>
                  <input required type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Colombo Fort" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Station Code</label>
                  <input required type="text" className="input-field" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. FOT" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Sequence Order</label>
                    <input required type="number" className="input-field" value={seq} onChange={e => setSeq(e.target.value)} placeholder="1" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Distance (KM)</label>
                    <input required type="number" step="0.1" className="input-field" value={dist} onChange={e => setDist(e.target.value)} placeholder="0.0" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">{editStation ? 'Save Changes' : 'Create Station'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
