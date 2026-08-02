import React from 'react'
import { motion } from 'framer-motion'
import { X, Train, Calendar, Clock, Armchair, Printer, CheckCircle2, MapPin } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { type UserBooking } from '../services/api'

interface Props {
  booking: UserBooking
  onClose: () => void
}

export default function DigitalBoardingPassModal({ booking, onClose }: Props) {
  const qrData = JSON.stringify({
    booking_id: booking.id,
    passenger: booking.passenger_name,
    train: booking.train_number || 'SL-RAIL',
    coach: booking.coach_number,
    seat: booking.seat_number,
    route: `${booking.start_station_name} -> ${booking.end_station_name}`,
    date: booking.departure_date || booking.created_at?.split('T')[0],
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Printable Pass Ticket Container */}
        <div id="printable-boarding-pass" className="p-6 overflow-y-auto bg-slate-900 text-slate-100 flex-1">
          {/* Header Badge */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-600/30">
                <Train size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base tracking-wide">SRI LANKA RAILWAYS</h3>
                <p className="text-[10px] text-brand-400 font-mono tracking-widest uppercase">Digital Boarding Pass</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-white/5 no-print"
            >
              <X size={20} />
            </button>
          </div>

          {/* Route Section */}
          <div className="bg-slate-950/70 border border-white/5 rounded-2xl p-4 mb-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Train size={12} className="text-brand-400" /> {booking.train_name || 'Express Line'} #{booking.train_number || 'SL-101'}
              </span>
              <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {booking.coach_class} CLASS
              </span>
            </div>

            <div className="flex items-center justify-between my-2">
              <div className="text-left">
                <p className="text-lg font-black text-white">{booking.start_station_name}</p>
                <p className="text-[10px] text-slate-500">Departure Station</p>
              </div>
              <div className="flex flex-col items-center px-3">
                <div className="w-16 h-0.5 bg-gradient-to-r from-brand-500 to-cyan-500 rounded-full mb-1" />
                <span className="text-[9px] text-brand-400 font-mono">SEAMLESS LEG</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-white">{booking.end_station_name}</p>
                <p className="text-[10px] text-slate-500">Destination Station</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-white/5 font-mono">
              <div className="flex items-center gap-1 text-slate-300">
                <Calendar size={13} className="text-slate-500" />
                <span>{booking.departure_date || booking.created_at?.split('T')[0]}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <Clock size={13} className="text-slate-500" />
                <span>{booking.departure_time || 'Scheduled'}</span>
              </div>
            </div>
          </div>

          {/* Passenger & Seat Details */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Passenger Name</p>
              <p className="text-sm font-bold text-white truncate mt-0.5">{booking.passenger_name}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{booking.passenger_email || '-'}</p>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Assigned Seat</p>
                <p className="text-base font-black text-brand-300 mt-0.5">
                  Coach {booking.coach_number} · Seat {booking.seat_number}
                </p>
              </div>
              <Armchair size={24} className="text-brand-400 opacity-80" />
            </div>
          </div>

          {/* QR Code Validation Section */}
          <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center text-center mb-4">
            <QRCodeSVG
              value={qrData}
              size={150}
              bgColor="#ffffff"
              fgColor="#020617"
              level="H"
              includeMargin={true}
            />
            <p className="text-[10px] font-mono text-slate-600 mt-2 font-bold uppercase tracking-wider">
              Booking Reference UUID
            </p>
            <p className="text-xs font-mono text-slate-900 font-extrabold tracking-tight">
              {booking.id}
            </p>
          </div>

          {/* Ticket Security Status */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 size={14} /> VALID DIGITAL PASS
            </span>
            <span className="text-slate-300 font-bold">Fare: LKR {booking.fare_lkr?.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex gap-3 flex-shrink-0 no-print">
          <button
            onClick={() => window.print()}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Printer size={16} /> Print / Save PDF Pass
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
