import { NavLink, Outlet } from 'react-router-dom'
import { Train, BarChart3, List } from 'lucide-react'

export default function AdminLayout() {
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

        <div className="mt-auto pt-4 border-t border-white/5">
          <a href="/" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to Booking
          </a>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
