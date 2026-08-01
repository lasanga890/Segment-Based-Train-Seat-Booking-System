// ─────────────────────────────────────────────────────────────────────────────
// Typed API client — all backend communication goes through this module.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Station {
  id: string
  name: string
  code: string
  sequence_order: number
  distance_km: number
}

export interface Schedule {
  id: string
  train_id: string
  departure_date: string
  departure_time: string
  is_active: boolean
  train_name: string
  train_number: string
  direction: 'UP' | 'DOWN'
}

export interface Coach {
  id: string
  coach_number: number
  coach_type: 'RESERVED' | 'UNRESERVED'
  total_seats: number
  label: string
}

export type SeatStatus = 'available' | 'occupied' | 'partial' | 'hold'

export interface SeatAvailability {
  seat_id: string
  coach_number: number
  coach_type: 'RESERVED' | 'UNRESERVED'
  seat_number: number
  status: SeatStatus
}

export interface FareBreakdown {
  start_station_name: string
  end_station_name: string
  stations_traversed: number
  distance_km: number
  coach_type: string
  base_rate_lkr: number
  multiplier: number
  total_fare_lkr: number
}

export interface Booking {
  id: string
  passenger_name: string
  passenger_email: string
  seat_id: string
  start_station_name: string
  end_station_name: string
  start_seq: number
  end_seq: number
  fare_lkr: number
  status: 'HOLD' | 'CONFIRMED' | 'CANCELLED'
  hold_expires_at?: string
  coach_number: number
  seat_number: number
  created_at: string
}

export interface HoldRequest {
  schedule_id: string
  seat_id: string
  from_seq: number
  to_seq: number
}

export interface ConfirmRequest {
  hold_id: string
  passenger_name: string
  passenger_email: string
  start_station_id: string
  end_station_id: string
}

export interface AdminMetrics {
  total_bookings: number
  total_revenue_lkr: number
  occupancy_rate: number
  top_segments: Array<{ from: string; to: string; bookings: number }>
  revenue_by_coach_type: Array<{ coach_type: string; revenue: number }>
}

// ─── Health ──────────────────────────────────────────────────────────────────

export const healthCheck = async () => {
  const res = await fetch(`${BASE_URL}/health`)
  return res.json()
}

// ─── Stations ────────────────────────────────────────────────────────────────

export const getStations = async (): Promise<Station[]> => {
  const res = await fetch(`${BASE_URL}/stations`)
  if (!res.ok) throw new Error('Failed to fetch stations')
  return res.json()
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export const getSchedules = async (date: string, direction: 'UP' | 'DOWN'): Promise<Schedule[]> => {
  const res = await fetch(`${BASE_URL}/schedules?date=${date}&direction=${direction}`)
  if (!res.ok) throw new Error('Failed to fetch schedules')
  return res.json()
}

// ─── Coaches ─────────────────────────────────────────────────────────────────

export const getCoaches = async (): Promise<Coach[]> => {
  const res = await fetch(`${BASE_URL}/coaches`)
  if (!res.ok) throw new Error('Failed to fetch coaches')
  return res.json()
}

// ─── Seat Availability ────────────────────────────────────────────────────────

export const getSeatAvailability = async (
  scheduleId: string,
  fromSeq: number,
  toSeq: number
): Promise<SeatAvailability[]> => {
  const res = await fetch(`${BASE_URL}/seats/availability?schedule_id=${scheduleId}&from=${fromSeq}&to=${toSeq}`)
  if (!res.ok) throw new Error('Failed to fetch seat availability')
  return res.json()
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const holdSeat = async (req: HoldRequest): Promise<{ hold_id: string; expires_at: string; fare: FareBreakdown }> => {
  const res = await fetch(`${BASE_URL}/bookings/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to hold seat')
  }
  return res.json()
}

export const confirmBooking = async (req: ConfirmRequest): Promise<Booking> => {
  const res = await fetch(`${BASE_URL}/bookings/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to confirm booking')
  }
  return res.json()
}

export const releaseHold = async (holdId: string): Promise<void> => {
  await fetch(`${BASE_URL}/bookings/hold/${holdId}`, { method: 'DELETE' })
}

export const getBooking = async (id: string): Promise<Booking> => {
  const res = await fetch(`${BASE_URL}/bookings/${id}`)
  if (!res.ok) throw new Error('Booking not found')
  return res.json()
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAdminMetrics = async (token: string): Promise<AdminMetrics> => {
  const res = await fetch(`${BASE_URL}/admin/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch admin metrics')
  return res.json()
}

export const getAllBookings = async (token: string): Promise<Booking[]> => {
  const res = await fetch(`${BASE_URL}/admin/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch bookings')
  return res.json()
}
