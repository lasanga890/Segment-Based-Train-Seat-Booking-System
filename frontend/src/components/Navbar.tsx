import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Train, Ticket, User, Bell, LogOut, CheckCircle2, Bookmark } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getUserNotifications, markNotificationRead, type UserNotification } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const { user, logoutUser } = useAuth()
  const location = useLocation()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [showBellMenu, setShowBellMenu] = useState(false)

  useEffect(() => {
    if (user) {
      getUserNotifications()
        .then(setNotifications)
        .catch(console.error)
    }
  }, [user, location.pathname])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <header className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-600/30">
            <Train size={18} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white">SL Rail</h1>
            <p className="text-[10px] text-slate-400">Scenic Train Seat Booking</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <Link
          to="/"
          className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            location.pathname === '/' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Train size={14} /> Search Trains
        </Link>

        {user ? (
          <>
            <Link
              to="/my-bookings"
              className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                location.pathname === '/my-bookings' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ticket size={14} /> My Journeys
            </Link>

            <Link
              to="/profile"
              className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                location.pathname === '/profile' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={14} /> Profile
            </Link>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowBellMenu(!showBellMenu)}
                className="relative p-2 rounded-xl bg-slate-800/60 border border-white/5 text-slate-300 hover:text-white transition-colors"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showBellMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-bold text-white">Notifications</span>
                      <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
                    </div>

                    {notifications.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">No notifications</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleRead(n.id)}
                            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                              n.is_read ? 'bg-slate-950/40 border-white/5 text-slate-400' : 'bg-brand-500/10 border-brand-500/30 text-slate-200 font-medium'
                            }`}
                          >
                            <p className="font-bold text-white text-[11px]">{n.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={logoutUser}
              className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 bg-red-500/10 px-2.5 py-1.5 rounded-xl border border-red-500/20"
            >
              <LogOut size={12} /> Logout
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-xs text-slate-300 hover:text-white font-medium px-3 py-1.5">
              Log In
            </Link>
            <Link to="/register" className="btn-secondary px-3 py-1.5 text-xs font-bold">
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
