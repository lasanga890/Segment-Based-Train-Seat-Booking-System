import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User as UserIcon,
  Phone,
  CreditCard,
  Plus,
  Trash2,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Mail,
  X,
  ShieldCheck,
} from 'lucide-react'
import {
  getUserProfile,
  updateUserProfile,
  getFavoriteRoutes,
  addFavoriteRoute,
  deleteFavoriteRoute,
  getStations,
  type UserProfile,
  type FavoriteRoute,
  type Station,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([])
  const [stations, setStations] = useState<Station[]>([])

  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nicPassport, setNicPassport] = useState('')
  const [updating, setUpdating] = useState(false)

  // Add Favorite Route Modal State
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [rStart, setRStart] = useState('')
  const [rEnd, setREnd] = useState('')
  const [rLabel, setRLabel] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [profData, favData, stationData] = await Promise.all([
        getUserProfile(),
        getFavoriteRoutes(),
        getStations(),
      ])

      setProfile(profData)
      setName(profData.name || '')
      setPhone(profData.phone || '')
      setNicPassport(profData.nic_passport || '')

      setFavoriteRoutes(favData)

      stationData.sort((a, b) => a.distance_km - b.distance_km)
      setStations(stationData)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load profile data' })
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = () => {
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setNicPassport(profile.nic_passport || '')
    }
    setShowEditModal(true)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setUpdating(true)
    try {
      await updateUserProfile({ name, phone, nic_passport: nicPassport })
      setProfile((prev) => (prev ? { ...prev, name, phone, nic_passport: nicPassport } : null))
      setShowEditModal(false)
      setMsg({ type: 'success', text: 'Personal information updated successfully!' })
      setTimeout(() => setMsg(null), 3000)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile' })
    } finally {
      setUpdating(false)
    }
  }

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rStart || !rEnd) return
    try {
      await addFavoriteRoute({ start_station_id: rStart, end_station_id: rEnd, label: rLabel })
      setShowRouteModal(false)
      setRStart('')
      setREnd('')
      setRLabel('')
      setFavoriteRoutes(await getFavoriteRoutes())
      setMsg({ type: 'success', text: 'Favorite route saved!' })
      setTimeout(() => setMsg(null), 3000)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save route' })
    }
  }

  const handleDeleteRoute = async (id: string) => {
    try {
      await deleteFavoriteRoute(id)
      setFavoriteRoutes(favoriteRoutes.filter((r) => r.id !== id))
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete favorite route' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <UserIcon size={32} className="text-brand-400" />
              Passenger Profile
            </h1>
            <p className="text-sm text-slate-400 mt-1">Manage your personal account information and favorite routes</p>
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

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Section 1: Personal Info Card ──────────────────────── */}
            <div className="lg:col-span-1 glass-card p-6 border border-white/10 space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Personal Info</h2>
                    <p className="text-[11px] text-slate-400">Verified Account</p>
                  </div>
                </div>
                <button
                  onClick={openEditModal}
                  title="Update Passenger Details"
                  className="p-2 rounded-xl bg-white/5 hover:bg-brand-600/20 border border-white/10 hover:border-brand-500/40 text-slate-300 hover:text-brand-300 transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Edit2 size={14} />
                  <span>Update</span>
                </button>
              </div>

              {/* Detail Items */}
              <div className="space-y-4">
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <UserIcon size={12} className="text-slate-400" /> Full Name
                  </span>
                  <p className="text-sm font-bold text-white">{profile?.name || 'Not provided'}</p>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" /> Email Address
                  </span>
                  <p className="text-sm font-bold text-slate-300 font-mono truncate">{profile?.email || 'Not provided'}</p>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" /> Phone Number
                  </span>
                  <p className="text-sm font-bold text-white font-mono">{profile?.phone || 'Not provided'}</p>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <CreditCard size={12} className="text-slate-400" /> NIC / Passport Number
                  </span>
                  <p className="text-sm font-bold text-white font-mono">{profile?.nic_passport || 'Not provided'}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-white/5">
                <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                  <ShieldCheck size={14} /> Security Encrypted
                </span>
                <span className="text-[10px] font-mono">ID: {profile?.id?.slice(0, 8)}...</span>
              </div>
            </div>

            {/* ── Section 2: Favorite Frequent Routes ─────────────── */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Bookmark size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-base">Favorite Frequent Routes</h2>
                      <p className="text-xs text-slate-400">Save preferred station legs for 1-click quick search access</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRouteModal(true)}
                    className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1 font-semibold"
                  >
                    <Plus size={14} /> Add Route
                  </button>
                </div>

                {favoriteRoutes.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">No favorite routes saved. Click "Add Route" above to save quick station pairs.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {favoriteRoutes.map((r) => (
                      <div
                        key={r.id}
                        className="bg-slate-900/70 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all"
                      >
                        <div className="space-y-1">
                          {r.label && (
                            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                              {r.label}
                            </span>
                          )}
                          <p className="font-extrabold text-slate-100 text-sm flex items-center gap-2 pt-1">
                            <span>{r.start_station_name}</span>
                            <span className="text-brand-400 font-mono">→</span>
                            <span>{r.end_station_name}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteRoute(r.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-xl"
                          title="Delete Favorite Route"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Popup Background Blur Modal (Update Passenger Details) ── */}
        <AnimatePresence>
          {showEditModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
              onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false) }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl relative"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                      <Edit2 size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-white">Update Personal Details</h3>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      className="input-field text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kamal Perera"
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

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="btn-secondary text-xs px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5"
                    >
                      {updating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Favorite Route Modal ───────────────────────────────────── */}
        <AnimatePresence>
          {showRouteModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
              onClick={(e) => { if (e.target === e.currentTarget) setShowRouteModal(false) }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <h3 className="text-lg font-bold text-white">Add Favorite Route</h3>
                  <button onClick={() => setShowRouteModal(false)} className="text-slate-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAddRoute} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Route Label (e.g. Work, Home)</label>
                    <input type="text" className="input-field text-sm" placeholder="Home to Kandy" value={rLabel} onChange={(e) => setRLabel(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Origin Station</label>
                    <select required className="select-field text-sm" value={rStart} onChange={(e) => setRStart(e.target.value)}>
                      <option value="">Select Origin</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Destination Station</label>
                    <select required className="select-field text-sm" value={rEnd} onChange={(e) => setREnd(e.target.value)}>
                      <option value="">Select Destination</option>
                      {stations.filter((s) => s.id !== rStart).map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <button type="button" onClick={() => setShowRouteModal(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                    <button type="submit" className="btn-primary text-xs px-4 py-2 font-bold">Save Favorite Route</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
