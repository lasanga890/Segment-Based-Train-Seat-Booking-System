import React from 'react'
import { motion } from 'framer-motion'
import { type SeatAvailability } from '../services/api'

interface TrainCoachSeatMapProps {
  seats: SeatAvailability[]
  coachClass: string
  selectedSeats: SeatAvailability[]
  onSeatClick: (seat: SeatAvailability) => void
  disabled?: boolean
}

export default function TrainCoachSeatMap({
  seats,
  coachClass,
  selectedSeats,
  onSeatClick,
  disabled = false,
}: TrainCoachSeatMapProps) {
  const is3rdClass = coachClass?.toUpperCase() === 'THIRD'
  const seatsPerRow = is3rdClass ? 5 : 4
  const leftCount = is3rdClass ? 3 : 2
  const rightCount = 2

  // Sort seats by seat_number
  const sortedSeats = [...seats].sort((a, b) => a.seat_number - b.seat_number)

  // Chunk seats into rows
  const rows: SeatAvailability[][] = []
  for (let i = 0; i < sortedSeats.length; i += seatsPerRow) {
    rows.push(sortedSeats.slice(i, i + seatsPerRow))
  }

  const isSelected = (seat: SeatAvailability) =>
    selectedSeats.some((s) => s.seat_id === seat.seat_id)

  return (
    <div className="space-y-3 select-none">
      {/* Compact Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/80 rounded-xl border border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white uppercase text-[11px] tracking-wide">
            {is3rdClass ? '3rd Class (3 + 2 Seating Layout)' : '2nd Class (2 + 2 Seating Layout)'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500" />
            <span className="text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-brand-600 border border-brand-400" />
            <span className="text-slate-300">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500" />
            <span className="text-slate-300">Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700 opacity-60" />
            <span className="text-slate-500">Booked</span>
          </div>
        </div>
      </div>

      {/* Single-Screen Carriage View */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 space-y-2 relative">
        {/* Train Direction Indicator */}
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-center border-b border-white/5 pb-1">
          ▲ Engine / Front Direction
        </div>

        {/* Rows Grid */}
        <div className="space-y-1.5 pt-1">
          {rows.map((row, rowIdx) => {
            const leftSeats = row.slice(0, leftCount)
            const rightSeats = row.slice(leftCount, leftCount + rightCount)

            return (
              <div key={rowIdx} className="flex items-center justify-center gap-3 sm:gap-6">
                {/* Left Side: 3 Seats (3rd class) or 2 Seats (2nd class) */}
                <div className="flex items-center gap-1.5">
                  {leftSeats.map((seat) => {
                    const active = isSelected(seat)
                    const isAvailable = seat.status === 'available'
                    const isPartial = seat.status === 'partial'
                    const isOccupied = seat.status === 'occupied'

                    return (
                      <button
                        key={seat.seat_id}
                        type="button"
                        onClick={() => !disabled && !isOccupied && onSeatClick(seat)}
                        disabled={isOccupied || disabled}
                        className={`
                          w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all border
                          ${
                            active
                              ? 'bg-brand-600 border-brand-400 text-white shadow-md shadow-brand-600/50 scale-105 z-10'
                              : isAvailable
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white cursor-pointer'
                              : isPartial
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-white cursor-pointer'
                              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                          }
                        `}
                        title={`Seat ${seat.seat_number} - ${seat.status}`}
                      >
                        {seat.seat_number}
                      </button>
                    )
                  })}
                </div>

                {/* Central Aisle Passage */}
                <div className="w-6 sm:w-8 h-8 flex items-center justify-center border-x border-white/5 bg-slate-950/40 rounded">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                    AISLE
                  </span>
                </div>

                {/* Right Side: 2 Seats */}
                <div className="flex items-center gap-1.5">
                  {rightSeats.map((seat) => {
                    const active = isSelected(seat)
                    const isAvailable = seat.status === 'available'
                    const isPartial = seat.status === 'partial'
                    const isOccupied = seat.status === 'occupied'

                    return (
                      <button
                        key={seat.seat_id}
                        type="button"
                        onClick={() => !disabled && !isOccupied && onSeatClick(seat)}
                        disabled={isOccupied || disabled}
                        className={`
                          w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all border
                          ${
                            active
                              ? 'bg-brand-600 border-brand-400 text-white shadow-md shadow-brand-600/50 scale-105 z-10'
                              : isAvailable
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white cursor-pointer'
                              : isPartial
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-white cursor-pointer'
                              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                          }
                        `}
                        title={`Seat ${seat.seat_number} - ${seat.status}`}
                      >
                        {seat.seat_number}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
