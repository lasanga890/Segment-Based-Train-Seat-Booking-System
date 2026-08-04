import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'
import { type UserBooking } from '../services/api'

interface ThermalReceiptProps {
  booking: UserBooking
  allBookings?: UserBooking[]
  onClose?: () => void
}

function formatTravelDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const cleanDate = dateStr.split('T')[0].split(' ')[0]
  const parts = cleanDate.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    const shortYear = year.slice(-2)
    return `${day}/${month}/${shortYear}`
  }
  return dateStr
}

export default function ThermalReceipt({ booking, allBookings, onClose }: ThermalReceiptProps) {
  const bookingsList = allBookings && allBookings.length > 0 ? allBookings : [booking]
  const totalFare = bookingsList.reduce((sum, b) => sum + (b.fare_lkr || 0), 0)
  const rawDate = booking.departure_date || booking.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
  const bookingDate = formatTravelDate(rawDate)
  const bookingTime = booking.departure_time || 'SCHEDULED'
  const refId = booking.id ? booking.id.slice(0, 8).toUpperCase() : 'REC-1001'

  const qrPayload = JSON.stringify({
    ref: refId,
    uuid: booking.id,
    passenger: booking.passenger_name,
    train: booking.train_number || 'SL-RAIL',
    seats: bookingsList.map((b) => `C${b.coach_number}-S${b.seat_number}`).join(','),
    route: `${booking.start_station_name}->${booking.end_station_name}`,
    date: bookingDate,
  })

  return (
    <div className="flex flex-col items-center">
      {/* ── 80mm POS Thermal Receipt Ticket (Compact Single Page Layout) ── */}
      <div className="printable-thermal-receipt bg-amber-50 text-slate-900 font-mono text-[10.5px] leading-tight p-3.5 w-full max-w-[320px] shadow-2xl border border-slate-300 relative space-y-1.5 select-none rounded-sm">
        {/* Top Header */}
        <div className="text-center font-bold text-[10px] space-y-0.5">
          <p className="tracking-wider">*** SRI LANKA RAILWAYS ***</p>
          <p className="text-[9px] text-slate-700">PASSENGER E-TICKET RECEIPT</p>
          <p className="text-slate-400">---------------------------------</p>
        </div>

        {/* Header Metadata */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-slate-600">RECEIPT NO :</span>
            <span className="font-bold">{refId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">TRAVEL DATE:</span>
            <span className="font-bold">{bookingDate} ({bookingTime})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">TRAIN NAME :</span>
            <span className="font-bold truncate max-w-[150px]">{booking.train_name || 'EXPRESS'} (#{booking.train_number || '101'})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">CLASS      :</span>
            <span className="font-bold">{booking.coach_class || 'THIRD'} CLASS</span>
          </div>
        </div>

        <p className="text-slate-400 text-center text-[9px]">---------------------------------</p>

        {/* Route Details */}
        <div className="space-y-0.5">
          <div>
            <span className="text-slate-600">FROM: </span>
            <span className="font-bold">{booking.start_station_name}</span>
          </div>
          <div>
            <span className="text-slate-600">TO  : </span>
            <span className="font-bold">{booking.end_station_name}</span>
          </div>
        </div>

        <p className="text-slate-400 text-center text-[9px]">---------------------------------</p>

        {/* Passenger & Seats List */}
        <div className="space-y-0.5">
          <div>
            <span className="text-slate-600">PASSENGER : </span>
            <span className="font-bold truncate">{booking.passenger_name}</span>
          </div>

          <div className="pt-0.5">
            <span className="text-slate-600 font-bold block">SEAT RESERVATION(S):</span>
            {bookingsList.map((b, idx) => (
              <div key={b.id || idx} className="flex justify-between pl-1 text-[10px]">
                <span>• Coach {b.coach_number} / Seat #{b.seat_number}</span>
                <span>LKR {b.fare_lkr?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-400 text-center text-[9px]">---------------------------------</p>

        {/* Fare & Payment Summary */}
        <div className="space-y-0.5">
          <div className="flex justify-between font-bold text-[11.5px]">
            <span>TOTAL FARE :</span>
            <span>LKR {totalFare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-600">STATUS:</span>
            <span className="font-bold text-emerald-800">PAID (CONFIRMED)</span>
          </div>
        </div>

        <p className="text-slate-400 text-center text-[9px]">---------------------------------</p>

        {/* Compact QR Code Section */}
        <div className="flex flex-col items-center justify-center py-1 space-y-1 bg-white p-2 rounded border border-slate-200">
          <QRCodeSVG
            value={qrPayload}
            size={105}
            bgColor="#FFFFFF"
            fgColor="#000000"
            level="M"
            includeMargin={false}
          />
          <p className="text-[8.5px] text-center font-bold tracking-tight text-slate-800">
            SCAN QR TO VERIFY TICKET
          </p>
          <p className="text-[7.5px] text-center font-mono text-slate-500 break-all">
            {booking.id}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-[8.5px] text-slate-600 space-y-0.5">
          <p className="text-slate-400">---------------------------------</p>
          <p className="font-bold">THANK YOU FOR TRAVELING WITH US</p>
          <p>PLEASE RETAIN RECEIPT DURING JOURNEY</p>
        </div>
      </div>

      {/* Printable Action Buttons */}
      <div className="flex items-center justify-center gap-3 mt-3 no-print w-full max-w-[320px]">
        {onClose && (
          <button
            onClick={onClose}
            className="btn-secondary flex-1 py-2 text-xs font-bold"
          >
            Close
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Printer size={14} /> Print Receipt / PDF
        </button>
      </div>
    </div>
  )
}
