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
  is_active?: boolean
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
  coach_class: string
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
  train_id?: string
  train_name?: string
  train_number?: string
  coach_class?: string
  departure_time?: string
}

export interface HoldRequest {
  schedule_id: string
  seat_id: string
  from_seq: number
  to_seq: number
}

export interface MultiHoldItem {
  hold_id: string
  seat_id: string
  expires_at: string
  fare: FareBreakdown
}

export interface MultiHoldRequest {
  schedule_id: string
  seat_ids: string[]
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

export const getStations = async (all = false): Promise<Station[]> => {
  const res = await fetch(`${BASE_URL}/stations${all ? '?all=true' : ''}`)
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

export interface ScheduleCoach {
  id: string
  coach_number: number
  coach_type: 'RESERVED' | 'UNRESERVED'
  coach_class: string
  total_seats: number
  label: string
  booked_seats: number
}

export const getCoaches = async (): Promise<Coach[]> => {
  const res = await fetch(`${BASE_URL}/coaches`)
  if (!res.ok) throw new Error('Failed to fetch coaches')
  return res.json()
}

export const getScheduleCoaches = async (scheduleId: string): Promise<ScheduleCoach[]> => {
  const res = await fetch(`${BASE_URL}/schedules/${scheduleId}/coaches`)
  if (!res.ok) throw new Error('Failed to fetch schedule coaches')
  return res.json()
}

// ─── Seat Availability ────────────────────────────────────────────────────────

export const getSeatAvailability = async (
  scheduleId: string,
  coachClass: string,
  fromSeq: number,
  toSeq: number
): Promise<SeatAvailability[]> => {
  const res = await fetch(`${BASE_URL}/seats/availability?schedule_id=${scheduleId}&coach_class=${coachClass}&from=${fromSeq}&to=${toSeq}`)
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

export const holdManySeats = async (req: MultiHoldRequest): Promise<MultiHoldItem[]> => {
  const res = await fetch(`${BASE_URL}/bookings/hold-many`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to hold seats')
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

export const getAdminMetrics = async (token?: string): Promise<AdminMetrics> => {
  const res = await fetch(`${BASE_URL}/admin/metrics`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error('Failed to fetch admin metrics')
  return res.json()
}

export const getAllBookings = async (token?: string): Promise<Booking[]> => {
  const res = await fetch(`${BASE_URL}/admin/bookings`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error('Failed to fetch bookings')
  return res.json()
}

// Admin Station types & APIs
export interface AdminStation {
  id: string; name: string; code: string;
  sequence_order: number; distance_km: number; is_active: boolean;
}
export const adminCreateStation = async (data: Omit<AdminStation,'id'>) => {
  const res = await fetch(`${BASE_URL}/admin/stations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create station')
  return res.json()
}
export const adminUpdateStation = async (id: string, data: Partial<AdminStation>) => {
  const res = await fetch(`${BASE_URL}/admin/stations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update station')
  return res.json()
}
export const adminToggleStationStatus = async (id: string, is_active: boolean) => {
  const res = await fetch(`${BASE_URL}/admin/stations/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active }) })
  if (!res.ok) throw new Error('Failed to toggle station status')
  return res.json()
}

// Admin Train types & APIs
export interface AdminTrain {
  id: string; train_number: string; name: string; direction: 'UP'|'DOWN';
}
export interface AdminCoach {
  id: string; train_id: string; coach_number: number;
  coach_type: 'RESERVED'|'UNRESERVED'; coach_class: string;
  total_seats: number; label: string; booked_seats?: number;
}
export const adminGetTrains = async (): Promise<AdminTrain[]> => {
  const res = await fetch(`${BASE_URL}/admin/trains`)
  if (!res.ok) throw new Error('Failed to fetch trains')
  return res.json()
}
export const adminCreateTrain = async (data: Omit<AdminTrain,'id'>) => {
  const res = await fetch(`${BASE_URL}/admin/trains`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create train')
  return res.json()
}
export const adminUpdateTrain = async (id: string, data: Partial<AdminTrain>) => {
  const res = await fetch(`${BASE_URL}/admin/trains/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update train')
  return res.json()
}
export const adminDeleteTrain = async (id: string) => {
  const res = await fetch(`${BASE_URL}/admin/trains/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete train')
  return res.json()
}
export const adminListTrains = async (): Promise<AdminTrain[]> => {
  const res = await fetch(`${BASE_URL}/admin/trains`)
  if (!res.ok) throw new Error('Failed to fetch trains')
  return res.json()
}
export const adminListTrainCoaches = async (trainId: string): Promise<AdminCoach[]> => {
  const res = await fetch(`${BASE_URL}/admin/trains/${trainId}/coaches`)
  if (!res.ok) throw new Error('Failed to fetch train coaches')
  return res.json()
}
export const adminAddCoach = async (trainId: string, data: Omit<AdminCoach,'id'|'train_id'>) => {
  const res = await fetch(`${BASE_URL}/admin/trains/${trainId}/coaches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to add coach')
  return res.json()
}
export const adminUpdateCoach = async (id: string, data: Partial<AdminCoach>) => {
  const res = await fetch(`${BASE_URL}/admin/coaches/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update coach')
  return res.json()
}
export const adminRemoveCoach = async (id: string) => {
  const res = await fetch(`${BASE_URL}/admin/coaches/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove coach')
  return res.json()
}

// Admin Schedule types & APIs
export interface AdminSchedule {
  id: string; train_id: string; train_name: string; train_number: string;
  direction: string; departure_date: string; departure_time: string; is_active: boolean;
}
export const adminCreateSchedule = async (data: {train_id:string, departure_date:string, departure_time:string}) => {
  const res = await fetch(`${BASE_URL}/admin/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create schedule')
  return res.json()
}
export const adminUpdateSchedule = async (id: string, data: {departure_time:string}) => {
  const res = await fetch(`${BASE_URL}/admin/schedules/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update schedule')
  return res.json()
}
export const adminCancelSchedule = async (id: string) => {
  const res = await fetch(`${BASE_URL}/admin/schedules/${id}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to cancel schedule')
  return res.json()
}
export const adminListSchedules = async (params?: {date_from?:string, date_to?:string, direction?:string}): Promise<AdminSchedule[]> => {
  const query = new URLSearchParams(params as any).toString()
  const res = await fetch(`${BASE_URL}/admin/schedules${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error('Failed to fetch schedules')
  return res.json()
}

// Admin Booking operations
export const adminCancelBooking = async (id: string) => {
  const res = await fetch(`${BASE_URL}/admin/bookings/${id}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to cancel booking')
  return res.json()
}
export const adminGetSeatOccupancy = async (seatId: string) => {
  const res = await fetch(`${BASE_URL}/admin/seats/${seatId}/occupancy`)
  if (!res.ok) throw new Error('Failed to fetch seat occupancy')
  return res.json()
}
export const adminGetAllBookings = async (params?: {status?:string, search?:string, date?:string, train_id?:string, coach_class?:string}): Promise<Booking[]> => {
  const query = new URLSearchParams(params as any).toString()
  const res = await fetch(`${BASE_URL}/admin/bookings${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error('Failed to fetch bookings')
  return res.json()
}

// Analytics
export interface SegmentAnalytic { from_seq:number; to_seq:number; from_name:string; to_name:string; total_bookings:number; occupancy_pct:number; }
export interface RevenueAnalytic { total_revenue:number; full_route_revenue:number; segment_reuse_revenue:number; full_route_count:number; segment_reuse_count:number; }
export const adminGetSegmentAnalytics = async (): Promise<SegmentAnalytic[]> => {
  const res = await fetch(`${BASE_URL}/admin/analytics/segments`)
  if (!res.ok) throw new Error('Failed to fetch segment analytics')
  return res.json()
}
export const adminGetRevenueAnalytics = async (): Promise<RevenueAnalytic> => {
  const res = await fetch(`${BASE_URL}/admin/analytics/revenue`)
  if (!res.ok) throw new Error('Failed to fetch revenue analytics')
  return res.json()
}
