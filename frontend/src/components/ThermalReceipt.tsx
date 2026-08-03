import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, X } from 'lucide-react'
import { type UserBooking } from '../services/api'

interface ThermalReceiptProps {
  booking: UserBooking
  allBookings?: UserBooking[]
  onClose?: () => void
}

export default function ThermalReceipt({ booking, allBookings, onClose }: ThermalReceiptProps) {
  const bookingsList = allBookings && allBookings.length > 0 ? allBookings : [booking]
  const totalFare = bookingsList.reduce((sum, b) => sum + (b.fare_lkr || 0), 0)
  const bookingDate = booking.departure_date || booking.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
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
      {/* ── 80mm POS Thermal Receipt Ticket ── */}
      <div className="printable-thermal-receipt bg-amber-50 text-slate-900 font-mono text-xs p-5 w-full max-w-[340px] shadow-2xl border border-slate-300 relative space-y-2 select-none rounded-sm">
        {/* Top Serrated Edge Decoration */}
        <div className="text-center font-bold text-[11px] leading-tight space-y-0.5">
          <p className="tracking-widest">*** SRI LANKA RAILWAYS ***</p>
          <p className="text-[10px] text-slate-700">PASSENGER E-TICKET RECEIPT</p>
          <p className="text-slate-400">=================================</p>
        </div>

        {/* Header Metadata */}
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-600">RECEIPT NO :</span>
            <span className="font-bold">{refId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">ISSUE DATE :</span>
            <span>{new Date().toISOString().split('T')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">TRAVEL DATE:</span>
            <span className="font-bold">{bookingDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">DEPART TIME:</span>
            <span>{bookingTime}</span>
          </div>
        </div>

        <p className="text-slate-400 text-center text-[10px]">---------------------------------</p>

        {/* Train & Class Details */}
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-600">TRAIN NAME :</span>
            <span className="font-bold truncate max-w-[170px]">{booking.train_name || 'EXPRESS'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">TRAIN NO   :</span>
            <span>#{booking.train_number || 'SL-101'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">CLASS      :</span>
            <span className="font-bold">{booking.coach_class || 'SECOND'} CLASS</span>
          </div>
        </div>

        <p className="text-slate-400 text-center text-[10px]">---------------------------------</p>

        {/* Route Details */}
        <div className="space-y-0.5 text-[11px]">
          <div>
            <span className="text-slate-600">FROM: </span>
            <span className="font-bold">{booking.start_station_name}</span>
          </div>
          <div>
            <span className="text-slate-600">TO  : </span>
            <span className="font-bold">{booking.end_station_name}</span>
          </div>
        </div>

        <p className="text-slate-400 text-center text-[10px]">---------------------------------</p>

        {/* Passenger & Seats List */}
        <div className="space-y-1 text-[11px]">
          <div>
            <span className="text-slate-600">PASSENGER : </span>
            <span className="font-bold">{booking.passenger_name}</span>
          </div>

          <div className="pt-1">
            <span className="text-slate-600 font-bold block mb-0.5">SEAT RESERVATION(S):</span>
            {bookingsList.map((b, idx) => (
              <div key={b.id || idx} className="flex justify-between pl-2 text-[10.5px]">
                <span>• Coach {b.coach_number} / Seat #{b.seat_number}</span>
                <span>LKR {b.fare_lkr?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-400 text-center text-[10px]">---------------------------------</p>

        {/* Fare & Payment Summary */}
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between font-bold text-[12px] pt-0.5">
            <span>TOTAL FARE :</span>
            <span>LKR {totalFare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">PAYMENT STATUS:</span>
            <span className="font-bold text-emerald-800">PAID (CONFIRMED)</span>
          </div>
        </div>

        <p className="text-slate-400 text-center text-[10px]">=================================</p>

        {/* QR Code Thermal Section */}
        <div className="flex flex-col items-center justify-center py-2 space-y-1.5 bg-white p-3 rounded border border-slate-200">
          <QRCodeSVG
            value={qrPayload}
            size={135}
            bgColor="#FFFFFF"
            fgColor="#000000"
            level="M"
            includeMargin={true}
          />
          <p className="text-[9px] text-center font-bold tracking-tight text-slate-800">
            SCAN QR TO VERIFY E-TICKET
          </p>
          <p className="text-[8px] text-center font-mono text-slate-500 break-all px-1">
            UUID: {booking.id}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-[9.5px] text-slate-600 pt-1 space-y-0.5">
          <p className="text-slate-400">=================================</p>
          <p className="font-bold">THANK YOU FOR TRAVELING WITH US</p>
          <p>SRI LANKA RAILWAYS SCENIC LINE</p>
          <p className="text-[8.5px] text-slate-400">PLEASE RETAIN RECEIPT DURING JOURNEY</p>
        </div>
      </div>

      {/* Printable Action Buttons */}
      <div className="flex items-center justify-center gap-3 mt-4 no-print w-full max-w-[340px]">
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
          <Printer size={15} /> Print Receipt / PDF
        </button>
      </div>
    </div>
  )
}
