import { useEffect, useState } from 'react'
import { getAdminMetrics, adminGetBookingChartAnalytics, AdminMetrics as MetricsType, BookingChartPoint } from '../../services/api'
import { Users, Banknote, Calendar, TrendingUp, LineChart as LineChartIcon } from 'lucide-react'

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<MetricsType | null>(null)
  const [loadingMetrics, setLM] = useState(true)

  const [period, setPeriod] = useState<'day' | 'month'>('day')
  const [chartData, setChartData] = useState<BookingChartPoint[]>([])
  const [loadingChart, setLoadingChart] = useState(true)

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

  const totalPeriodBookings = chartData.reduce((sum, d) => sum + d.bookings_count, 0)
  const totalPeriodRevenue = chartData.reduce((sum, d) => sum + d.total_revenue, 0)
  const avgFarePerBooking = totalPeriodBookings > 0 ? totalPeriodRevenue / totalPeriodBookings : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Dashboard Overview</h2>
        <p className="text-xs text-slate-400 mt-1">Real-time system metrics & booking analytics</p>
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

      {/* Line Chart Analytics Card */}
      <div className="glass-card p-6 border border-white/10 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <LineChartIcon className="text-brand-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Booking Trend Line</h3>
              <p className="text-xs text-slate-400">Continuous booking velocity over time</p>
            </div>
          </div>

          {/* Period Selector Toggle */}
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

        {/* Detailed Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5 text-xs">
          <div>
            <span className="text-slate-500 block">Period Total Bookings</span>
            <span className="text-base font-bold text-white mt-0.5">{totalPeriodBookings} seats</span>
          </div>
          <div>
            <span className="text-slate-500 block">Period Revenue</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5">LKR {totalPeriodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Avg Revenue / Booking</span>
            <span className="text-base font-bold text-brand-300 mt-0.5">LKR {avgFarePerBooking.toFixed(2)}</span>
          </div>
        </div>

        {/* SVG Line Chart View */}
        {loadingChart ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm space-y-2">
            <LineChartIcon size={32} className="text-slate-600" />
            <p>No booking data available for this timeline</p>
          </div>
        ) : (
          <BookingLineChart data={chartData} period={period} />
        )}
      </div>
    </div>
  )
}

function BookingLineChart({ data, period }: { data: BookingChartPoint[]; period: 'day' | 'month' }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data || data.length === 0) return null

  const width = 800
  const height = 240
  const paddingX = 50
  const paddingTop = 30
  const paddingBottom = 40

  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingTop - paddingBottom

  const maxVal = Math.max(...data.map((d) => d.bookings_count), 1)

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * chartWidth
    const y = height - paddingBottom - (d.bookings_count / maxVal) * chartHeight
    return { ...d, x, y, index: i }
  })

  const linePath = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`

  const gridTicks = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div className="relative w-full select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines & Y-Axis Labels */}
        {gridTicks.map((ratio, idx) => {
          const y = paddingTop + (1 - ratio) * chartHeight
          const val = Math.round(maxVal * ratio)
          return (
            <g key={idx}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#ffffff" strokeOpacity="0.07" strokeDasharray="3 3" />
              <text x={paddingX - 10} y={y + 3} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                {val}
              </text>
            </g>
          )
        })}

        {/* Gradient Area Fill */}
        <path d={areaPath} fill="url(#lineAreaGradient)" />

        {/* Smooth Line Path */}
        <path d={linePath} fill="none" stroke="url(#lineStrokeGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data Point Circles & X-Axis Labels */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i
          const showLabel = period === 'month' || data.length <= 15 || i % Math.ceil(data.length / 10) === 0
          const displayDate = period === 'day' ? p.label.slice(5) : p.label

          return (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
              {/* Vertical Guide Line on Hover */}
              {isHovered && (
                <line x1={p.x} y1={paddingTop} x2={p.x} y2={height - paddingBottom} stroke="#818cf8" strokeWidth="1" strokeDasharray="2 2" />
              )}

              {/* X Axis Label */}
              {showLabel && (
                <text x={p.x} y={height - 12} fill={isHovered ? '#ffffff' : '#64748b'} fontSize="10" textAnchor="middle" fontFamily="monospace">
                  {displayDate}
                </text>
              )}

              {/* Data Point Circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 3.5}
                fill={isHovered ? '#38bdf8' : '#6366f1'}
                stroke="#0f172a"
                strokeWidth="2"
                className="transition-all duration-150"
              />
            </g>
          )
        })}
      </svg>

      {/* Hover Floating Details Tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          className="absolute z-20 bg-slate-900 border border-white/20 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 pointer-events-none transition-all duration-150"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-bold text-indigo-300 border-b border-white/10 pb-1 flex items-center justify-between gap-4">
            <span>{points[hoveredIndex].label}</span>
            <span className="text-[10px] text-slate-400 font-normal uppercase">{period === 'day' ? 'Daily Point' : 'Monthly Point'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Confirmed Bookings:</span>
            <span className="font-bold text-white">{points[hoveredIndex].bookings_count} seats</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Total Revenue:</span>
            <span className="font-bold text-emerald-400">LKR {points[hoveredIndex].total_revenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Avg Fare / Booking:</span>
            <span className="font-bold text-brand-300">
              LKR {(points[hoveredIndex].bookings_count > 0 ? points[hoveredIndex].total_revenue / points[hoveredIndex].bookings_count : 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
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
