import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DollarSign, Users, TrendingUp, Train } from 'lucide-react'
import { getAdminMetrics, getAllBookings, type AdminMetrics, type Booking } from '../../services/api'

export default function AdminMetricsPage() {
  const [metrics, setMetrics]   = useState<AdminMetrics | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getAdminMetrics('admin-token'), // TODO: real JWT in Phase 5
      getAllBookings('admin-token'),
    ]).then(([m, b]) => {
      setMetrics(m)
      setBookings(b)
    }).finally(() => setLoading(false))
  }, [])

  // Compute segment revenue from bookings for chart
  const segmentData = bookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce<Record<string, number>>((acc, b) => {
      const key = `${b.start_station_name?.split(' ')[0]}→${b.end_station_name?.split(' ')[0]}`
      acc[key] = (acc[key] || 0) + b.fare_lkr
      return acc
    }, {})

  const chartData = Object.entries(segmentData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, revenue]) => ({ name, revenue }))

  const COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#0284c7', '#0369a1', '#075985', '#0c4a6e']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stats = [
    { label: 'Total Bookings', value: metrics?.total_bookings ?? 0, icon: Users, color: 'text-brand-400' },
    { label: 'Total Revenue', value: `LKR ${(metrics?.total_revenue_lkr ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
    { label: 'Occupancy Rate', value: `${metrics?.occupancy_rate ?? 0}%`, icon: TrendingUp, color: 'text-amber-400' },
    { label: 'Seats Available', value: 144, icon: Train, color: 'text-slate-400' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-6">Dashboard</h2>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{stat.label}</p>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Revenue Chart ────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-6">Revenue by Route Segment (LKR)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#38bdf8' }}
                formatter={(v: number) => [`LKR ${v.toFixed(2)}`, 'Revenue']}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {bookings.length === 0 && (
        <div className="glass-card p-12 text-center mt-6">
          <Train size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No bookings yet. Charts will appear after the first booking.</p>
        </div>
      )}
    </div>
  )
}
