import { useEffect, useState } from 'react'
import { getAdminMetrics, adminGetBookingChartAnalytics, AdminMetrics as MetricsType, BookingChartPoint } from '../../services/api'
import { Users, Banknote, Calendar, BarChart3, TrendingUp } from 'lucide-react'

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<MetricsType | null>(null)
  const [loadingMetrics, setLM] = useState(true)

  const [period, setPeriod] = useState<'day' | 'month'>('day')
  const [chartData, setChartData] = useState<BookingChartPoint[]>([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState<BookingChartPoint | null>(null)

  useEffect(() => {
    getAdminMetrics().then(setMetrics).catch(() => {}).finally(() => setLM(false))
  }, [])

  useEffect(() => {
    setLoadingChart(true)
    adminGetBookingChartAnalytics(period)
      .then(setChartData)
      .catch(() => setChartData([]))
      .finally(() => setLoadingChart(false))
  }, [period])

  const maxBookings = Math.max(...chartData.map((d) => d.bookings_count), 1)
  const totalPeriodBookings = chartData.reduce((sum, d) => sum + d.bookings_count, 0)
  const totalPeriodRevenue = chartData.reduce((sum, d) => sum + d.total_revenue, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Dashboard Overview</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time system metrics & booking analytics</p>
        </div>
      </div>

      {/* KPI Cards (Total Bookings & Total Revenue) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Total Bookings"
          value={loadingMetrics ? '...' : metrics?.total_bookings}
          subtitle="All confirmed seat reservations"
          icon={<Users className="text-brand-400" size={24} />}
          loading={loadingMetrics}
        />
        <MetricCard
          title="Total Revenue"
          value={loadingMetrics ? '...' : `LKR ${metrics?.total_revenue_lkr?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle="Lifetime ticket sales"
          icon={<Banknote className="text-emerald-400" size={24} />}
          loading={loadingMetrics}
        />
      </div>

      {/* Booking Chart Card */}
      <div className="glass-card p-6 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <BarChart3 className="text-brand-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Booking Trends & Performance</h3>
              <p className="text-xs text-slate-400">Track ticket volume over time</p>
            </div>
          </div>

          {/* Toggle Button Group: Day Wise | Month Wise */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setPeriod('day')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                period === 'day'
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar size={13} />
              Day Wise
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                period === 'month'
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp size={13} />
              Month Wise
            </button>
          </div>
        </div>

        {/* Period Summary Header */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5 text-xs">
          <div>
            <span className="text-slate-500 block">Period Total Bookings</span>
            <span className="text-base font-bold text-white">{totalPeriodBookings}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Period Total Revenue</span>
            <span className="text-base font-bold text-emerald-400">LKR {totalPeriodRevenue.toLocaleString()}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-500 block">Active Interval</span>
            <span className="text-base font-bold text-brand-400 uppercase">{period === 'day' ? 'Daily View (30 Days)' : 'Monthly View (12 Months)'}</span>
          </div>
        </div>

        {/* Interactive Chart Section */}
        {loadingChart ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm space-y-2">
            <BarChart3 size={32} className="text-slate-600" />
            <p>No booking data recorded for this period</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-64 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-white/10 relative">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 border-b border-white/10">
                <div className="border-b border-white/20 w-full" />
                <div className="border-b border-white/20 w-full" />
                <div className="border-b border-white/20 w-full" />
              </div>

              {/* Chart Bar Columns */}
              {chartData.map((pt, idx) => {
                const heightPct = Math.max((pt.bookings_count / maxBookings) * 100, 6)
                const formattedLabel =
                  period === 'day'
                    ? pt.label.slice(5)
                    : pt.label

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Tooltip Popup */}
                    {hoveredPoint === pt && (
                      <div className="absolute -top-12 z-20 bg-slate-900 border border-white/20 text-white text-[11px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                        <div className="font-bold text-brand-300">{pt.label}</div>
                        <div>Bookings: <strong>{pt.bookings_count}</strong></div>
                        <div>Revenue: <strong className="text-emerald-400">LKR {pt.total_revenue.toLocaleString()}</strong></div>
                      </div>
                    )}

                    {/* Value Badge above bar */}
                    <span className="text-[10px] text-slate-400 mb-1 group-hover:text-white font-mono transition-colors">
                      {pt.bookings_count}
                    </span>

                    {/* Bar Fill */}
                    <div
                      className="w-full max-w-[40px] bg-gradient-to-t from-brand-600 via-indigo-600 to-brand-400 rounded-t-md transition-all duration-300 group-hover:brightness-125 group-hover:scale-105 shadow-md shadow-brand-900/30"
                      style={{ height: `${heightPct}%` }}
                    />

                    {/* Label below bar */}
                    <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center group-hover:text-white font-mono">
                      {formattedLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtitle, icon, loading }: any) {
  return (
    <div className="glass-card p-6 flex items-center gap-5 border border-white/10 hover:border-white/20 transition-all">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        {loading ? (
          <div className="h-7 w-32 bg-white/10 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-black text-white mt-0.5">{value}</p>
        )}
        {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
