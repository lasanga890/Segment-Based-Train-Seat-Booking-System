import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { Train, BarChart3, List, MapPin, Calendar, LogOut, Inbox } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getAdminToken } from '../../services/api'

export default function AdminLayout() {
  const { admin, logoutAdmin, loading } = useAuth()
  const hasToken = getAdminToken()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!admin && !hasToken) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-56 border-r border-white/5 bg-slate-900/50 p-5 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Train size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">SL Rail</p>
            <p className="text-[10px] text-slate-500">Admin Panel</p>
          </div>
        </div>

        <NavLink
          to="/admin/metrics"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
        >
          <BarChart3 size={15} />
          Dashboard
        </NavLink>

        <NavLink
          to="/admin/stations"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
        >
          <MapPin size={15} />
          Stations
        </NavLink>

        <NavLink
          to="/admin/trains"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
        >
          <Train size={15} />
          Trains
        </NavLink>

        <NavLink
          to="/admin/schedules"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
        >
          <Calendar size={15} />
          Schedules
        </NavLink>

        <NavLink
          to="/admin/bookings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
        >
          <List size={15} />
          All Bookings
        </NavLink>

        <NavLink
          to="/admin/requests"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
        >
          <Inbox size={15} />
          Passenger Requests
        </NavLink>

        <NavLink
          to="/admin/refunds"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
        >
          <Inbox size={15} />
          Refund Requests
        </NavLink>

        <div className="mt-auto pt-4 border-t border-white/5">
          <button
            onClick={logoutAdmin}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} /> Logout Admin
          </button>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
