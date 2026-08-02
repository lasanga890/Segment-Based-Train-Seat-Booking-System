import { useEffect, useState } from 'react'
import { getAdminMetrics, adminGetRevenueAnalytics, AdminMetrics as MetricsType, RevenueAnalytic } from '../../services/api'
import { Users, Banknote, Percent } from 'lucide-react'

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<MetricsType | null>(null)
  const [revenue, setRevenue] = useState<RevenueAnalytic | null>(null)
  const [loadingMetrics, setLM] = useState(true)
  const [loadingRev, setLR] = useState(true)

  useEffect(() => {
    getAdminMetrics().then(setMetrics).catch(() => {}).finally(() => setLM(false))
    adminGetRevenueAnalytics().then(setRevenue).catch(()=>{}).finally(() => setLR(false))
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-white mb-2">Dashboard Overview</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Bookings" value={loadingMetrics ? '...' : metrics?.total_bookings} icon={<Users className="text-brand-400" size={24} />} loading={loadingMetrics} />
        <MetricCard title="Total Revenue" value={loadingMetrics ? '...' : `LKR ${metrics?.total_revenue_lkr?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={<Banknote className="text-green-400" size={24} />} loading={loadingMetrics} />
        <MetricCard title="Occupancy Rate" value={loadingMetrics ? '...' : `${metrics?.occupancy_rate}%`} icon={<Percent className="text-amber-400" size={24} />} loading={loadingMetrics} />
      </div>

      {/* Revenue Breakdown */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4">Revenue Breakdown</h3>
        {loadingRev ? <Skeleton rows={3} /> : (
          revenue ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <p className="text-xs text-slate-400 mb-1">Full-Route Tickets</p>
                  <p className="text-2xl font-bold text-brand-400">LKR {revenue.full_route_revenue.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">{revenue.full_route_count} bookings</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <p className="text-xs text-slate-400 mb-1">Segment-Reused Tickets</p>
                  <p className="text-2xl font-bold text-purple-400">LKR {revenue.segment_reuse_revenue.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">{revenue.segment_reuse_count} bookings</p>
                </div>
              </div>

              {/* Donut split representation */}
              <div>
                <p className="text-xs text-slate-400 mb-2 text-center">Revenue Split</p>
                <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex">
                  {revenue.total_revenue > 0 ? (
                    <>
                      <div className="h-full bg-brand-500" style={{ width: `${(revenue.full_route_revenue / revenue.total_revenue) * 100}%` }} title="Full Route" />
                      <div className="h-full bg-purple-500" style={{ width: `${(revenue.segment_reuse_revenue / revenue.total_revenue) * 100}%` }} title="Segment Reused" />
                    </>
                  ) : (
                    <div className="w-full bg-white/10" />
                  )}
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                  <span>Full Route ({revenue.total_revenue ? Math.round((revenue.full_route_revenue/revenue.total_revenue)*100) : 0}%)</span>
                  <span>Reused ({revenue.total_revenue ? Math.round((revenue.segment_reuse_revenue/revenue.total_revenue)*100) : 0}%)</span>
                </div>
              </div>
            </div>
          ) : <p className="text-slate-500 text-sm">No revenue data</p>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, loading }: any) {
  return (
    <div className="glass-card p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {loading ? (
          <div className="h-6 w-24 bg-white/10 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-black text-white">{value}</p>
        )}
      </div>
    </div>
  )
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1"><div className="h-3 w-1/3 bg-white/10 rounded animate-pulse"/><div className="h-3 w-8 bg-white/10 rounded animate-pulse"/></div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-white/10 w-2/3 animate-pulse"/></div>
        </div>
      ))}
    </div>
  )
}
