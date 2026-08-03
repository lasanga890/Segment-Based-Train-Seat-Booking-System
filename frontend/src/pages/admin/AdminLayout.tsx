import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { Train, BarChart3, List, MapPin, Calendar, LogOut, Inbox, Armchair } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getAdminToken } from '../../services/api'

export default function AdminLayout() {
  const { admin, logoutAdmin, loading } = useAuth()
  const hasToken = getAdminToken()

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!admin && !hasToken) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex">
      {/* ── Fixed Side Panel ─────────────────────────────────────────── */}
      <aside className="w-60 h-screen sticky top-0 border-r border-white/10 bg-slate-900/80 backdrop-blur-md p-5 flex flex-col justify-between shrink-0 z-30 select-none">
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/30 border border-brand-400/40">
              <Train size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-wide">SL Rail System</p>
              <p className="text-[10px] text-slate-400 font-medium">Management Console</p>
            </div>
          </div>

          {/* Navigation Links (SPA client-side navigation without full reloads) */}
          <nav className="space-y-1">
            <NavLink
              to="/admin/metrics"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <BarChart3 size={16} />
              Dashboard
            </NavLink>

            <NavLink
              to="/admin/stations"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <MapPin size={16} />
              Stations
            </NavLink>

            <NavLink
              to="/admin/trains"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <Train size={16} />
              Trains & Coaches
            </NavLink>

            <NavLink
              to="/admin/schedules"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <Calendar size={16} />
              Schedules
            </NavLink>

            <NavLink
              to="/admin/bookings"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <List size={16} />
              All Bookings
            </NavLink>

            <NavLink
              to="/admin/seat-booking"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <Armchair size={16} />
              Seat & Customer Booking
            </NavLink>

            <NavLink
              to="/admin/requests"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <Inbox size={16} />
              Passenger Requests
            </NavLink>
          </nav>
        </div>

        {/* Logout Footer */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={logoutAdmin}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut size={15} /> Logout Admin
          </button>
        </div>
      </aside>

      {/* ── Independent Scrollable Content Area ───────────────────────────── */}
      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-8 bg-slate-950">
        <Outlet />
      </main>
    </div>
  )
}
