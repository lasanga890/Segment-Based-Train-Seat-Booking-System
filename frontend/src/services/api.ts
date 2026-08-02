// ─────────────────────────────────────────────────────────────────────────────
// Typed API client — all backend communication goes through this module.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1'

export const getAdminToken = () => localStorage.getItem('admin_token')
export const setAdminToken = (token: string | null) => {
  if (token) localStorage.setItem('admin_token', token)
  else localStorage.removeItem('admin_token')
}

export const getUserToken = () => localStorage.getItem('user_token')
export const setUserToken = (token: string | null) => {
  if (token) localStorage.setItem('user_token', token)
  else localStorage.removeItem('user_token')
}

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {})
  const isAdminRoute = url.includes('/admin/')
  const token = isAdminRoute ? getAdminToken() : (getUserToken() || getAdminToken())

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, { ...options, headers })
  if (res.status === 401 && isAdminRoute) {
    setAdminToken(null)
    window.location.href = '/admin/login'
  }
  return res
}

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

export const getAdminMetrics = async (): Promise<AdminMetrics> => {
  const res = await authFetch(`${BASE_URL}/admin/metrics`)
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
  const res = await authFetch(`${BASE_URL}/admin/stations/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active }) })
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
export const getPublicTrains = async (): Promise<AdminTrain[]> => {
  const res = await fetch(`${BASE_URL}/trains`)
  if (!res.ok) throw new Error('Failed to fetch trains')
  return res.json()
}

export const adminGetTrains = async (): Promise<AdminTrain[]> => {
  const res = await authFetch(`${BASE_URL}/admin/trains`)
  if (!res.ok) throw new Error('Failed to fetch trains')
  return res.json()
}
export const adminCreateTrain = async (data: Omit<AdminTrain,'id'>) => {
  const res = await authFetch(`${BASE_URL}/admin/trains`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create train')
  return res.json()
}
export const adminUpdateTrain = async (id: string, data: Partial<AdminTrain>) => {
  const res = await authFetch(`${BASE_URL}/admin/trains/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update train')
  return res.json()
}
export const adminDeleteTrain = async (id: string) => {
  const res = await authFetch(`${BASE_URL}/admin/trains/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete train')
  return res.json()
}
export const adminListTrains = async (): Promise<AdminTrain[]> => {
  const res = await authFetch(`${BASE_URL}/admin/trains`)
  if (!res.ok) throw new Error('Failed to fetch trains')
  return res.json()
}
export const adminListTrainCoaches = async (trainId: string): Promise<AdminCoach[]> => {
  const res = await authFetch(`${BASE_URL}/admin/trains/${trainId}/coaches`)
  if (!res.ok) throw new Error('Failed to fetch train coaches')
  return res.json()
}

// ─── Requests: Reschedule & Refund ───────────────────────────────────────────

export const createRescheduleRequest = async (bookingId: string, req: { new_schedule_id?: string; new_start_station_id?: string; new_end_station_id?: string; new_seat_id?: string }) => {
  const res = await authFetch(`${BASE_URL}/user/bookings/${bookingId}/reschedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create reschedule request')
  }
  return res.json()
}

export const adminGetRefundRequests = async () => {
  const res = await authFetch(`${BASE_URL}/admin/refund-requests`)
  if (!res.ok) throw new Error('Failed to fetch refund requests')
  return res.json()
}

export const adminApproveRefundRequest = async (id: string, adminNote?: string) => {
  const res = await authFetch(`${BASE_URL}/admin/refund-requests/${id}/approve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_note: adminNote || '' }) })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to approve refund request')
  }
  return res.json()
}

export const adminRejectRefundRequest = async (id: string, adminNote?: string) => {
  const res = await authFetch(`${BASE_URL}/admin/refund-requests/${id}/reject`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_note: adminNote || '' }) })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to reject refund request')
  }
  return res.json()
}

export const adminGetRescheduleRequests = async () => {
  const res = await authFetch(`${BASE_URL}/admin/reschedule-requests`)
  if (!res.ok) throw new Error('Failed to fetch reschedule requests')
  return res.json()
}

export const adminApproveRescheduleRequest = async (id: string, adminNote?: string) => {
  const res = await authFetch(`${BASE_URL}/admin/reschedule-requests/${id}/approve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_note: adminNote || '' }) })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to approve reschedule request')
  }
  return res.json()
}

export const adminRejectRescheduleRequest = async (id: string, adminNote?: string) => {
  const res = await authFetch(`${BASE_URL}/admin/reschedule-requests/${id}/reject`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_note: adminNote || '' }) })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to reject reschedule request')
  }
  return res.json()
}

export const getUserRefundRequests = async () => {
  const res = await authFetch(`${BASE_URL}/user/refund-requests`)
  if (!res.ok) throw new Error('Failed to fetch user refund requests')
  return res.json()
}

export const getUserRescheduleRequests = async () => {
  const res = await authFetch(`${BASE_URL}/user/reschedule-requests`)
  if (!res.ok) throw new Error('Failed to fetch user reschedule requests')
  return res.json()
}
export const adminAddCoach = async (trainId: string, data: Omit<AdminCoach,'id'|'train_id'>) => {
  const res = await authFetch(`${BASE_URL}/admin/trains/${trainId}/coaches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to add coach')
  return res.json()
}
export const adminUpdateCoach = async (id: string, data: Partial<AdminCoach>) => {
  const res = await authFetch(`${BASE_URL}/admin/coaches/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update coach')
  return res.json()
}
export const adminRemoveCoach = async (id: string) => {
  const res = await authFetch(`${BASE_URL}/admin/coaches/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove coach')
  return res.json()
}

// Admin Schedule types & APIs
export interface AdminSchedule {
  id: string; train_id: string; train_name: string; train_number: string;
  direction: string; departure_date: string; departure_time: string; is_active: boolean; cancel_reason?: string; batch_id?: string;
}
export const adminCreateSchedule = async (data: {train_id:string, start_date:string, end_date:string, departure_time:string}) => {
  const res = await authFetch(`${BASE_URL}/admin/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to create schedule')
  return res.json()
}
export const adminUpdateSchedule = async (id: string, data: {departure_date?:string, departure_time:string}) => {
  const res = await authFetch(`${BASE_URL}/admin/schedules/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update schedule')
  return res.json()
}
export const adminToggleScheduleStatus = async (id: string, is_active: boolean, reason?: string) => {
  const res = await authFetch(`${BASE_URL}/admin/schedules/${id}/status`, { 
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active, reason })
  })
  if (!res.ok) throw new Error('Failed to update schedule status')
  return res.json()
}
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export const getStationsPaginated = async (params: { all?: boolean, page: number, limit: number }): Promise<PaginatedResponse<Station>> => {
  const query = new URLSearchParams(params as any).toString()
  const res = await fetch(`${BASE_URL}/stations?${query}`)
  if (!res.ok) throw new Error('Failed to fetch stations')
  return res.json()
}

// ─── Authentication APIs ──────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  phone?: string
}

export const adminLoginApi = async (username: string, password: string) => {
  const res = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Admin login failed')
  setAdminToken(data.token)
  return data
}

export const userRegisterApi = async (data: { name: string; email: string; password: string; phone?: string }) => {
  const res = await fetch(`${BASE_URL}/auth/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const resData = await res.json()
  if (!res.ok) throw new Error(resData.error || 'Registration failed')
  setUserToken(resData.token)
  return resData
}

export const userLoginApi = async (email: string, password: string) => {
  const res = await fetch(`${BASE_URL}/auth/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'User login failed')
  setUserToken(data.token)
  return data
}

export const getUserMeApi = async (): Promise<User> => {
  const res = await authFetch(`${BASE_URL}/auth/user/me`)
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

// ─── Passenger Profile & Presets ──────────────────────────────────────────────

export interface UserProfile extends User {
  phone?: string
  nic_passport?: string
  created_at?: string
}

export interface FrequentPassenger {
  id: string
  full_name: string
  nic_passport: string
  gender: string
  created_at: string
}

export interface FavoriteRoute {
  id: string
  start_station_id: string
  start_station_name: string
  start_seq: number
  end_station_id: string
  end_station_name: string
  end_seq: number
  label?: string
  created_at: string
}

export interface UserBooking {
  id: string
  passenger_name: string
  passenger_email: string
  start_station_name: string
  end_station_name: string
  start_seq: number
  end_seq: number
  fare_lkr: number
  status: 'CONFIRMED' | 'HOLD' | 'CANCELLED'
  coach_number: number
  seat_number: number
  created_at: string
  train_id: string
  train_name: string
  train_number: string
  coach_class: string
  departure_date: string
  departure_time: string
}

export interface WaitlistItem {
  id: string
  schedule_id: string
  train_name: string
  train_number: string
  start_station_name: string
  end_station_name: string
  coach_class: string
  status: 'WAITING' | 'PROMOTED' | 'EXPIRED' | 'CANCELLED'
  departure_date: string
  departure_time: string
  created_at: string
}

export interface UserNotification {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export const getUserProfile = async (): Promise<UserProfile> => {
  const res = await authFetch(`${BASE_URL}/user/profile`)
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export const updateUserProfile = async (data: { name?: string; phone?: string; nic_passport?: string }) => {
  const res = await authFetch(`${BASE_URL}/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json()
}

export const getFrequentPassengers = async (): Promise<FrequentPassenger[]> => {
  const res = await authFetch(`${BASE_URL}/user/frequent-passengers`)
  if (!res.ok) throw new Error('Failed to fetch presets')
  return res.json()
}

export const addFrequentPassenger = async (data: { full_name: string; nic_passport: string; gender: string }) => {
  const res = await authFetch(`${BASE_URL}/user/frequent-passengers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to save passenger preset')
  return res.json()
}

export const deleteFrequentPassenger = async (id: string) => {
  const res = await authFetch(`${BASE_URL}/user/frequent-passengers/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete preset')
  return res.json()
}

export const getFavoriteRoutes = async (): Promise<FavoriteRoute[]> => {
  const res = await authFetch(`${BASE_URL}/user/favorite-routes`)
  if (!res.ok) throw new Error('Failed to fetch favorite routes')
  return res.json()
}

export const addFavoriteRoute = async (data: { start_station_id: string; end_station_id: string; label?: string }) => {
  const res = await authFetch(`${BASE_URL}/user/favorite-routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to save favorite route')
  return res.json()
}

export const deleteFavoriteRoute = async (id: string) => {
  const res = await authFetch(`${BASE_URL}/user/favorite-routes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete favorite route')
  return res.json()
}

export const getUserBookings = async (): Promise<UserBooking[]> => {
  const res = await authFetch(`${BASE_URL}/user/bookings`)
  if (!res.ok) throw new Error('Failed to fetch user bookings')
  return res.json()
}

export const cancelUserBooking = async (id: string) => {
  const res = await authFetch(`${BASE_URL}/user/bookings/${id}/cancel`, { method: 'PATCH' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to cancel booking')
  return data
}

export const joinWaitlist = async (data: { schedule_id: string; start_station_id: string; end_station_id: string; coach_class: string }) => {
  const res = await authFetch(`${BASE_URL}/waitlists/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const resData = await res.json()
  if (!res.ok) throw new Error(resData.error || 'Failed to join waitlist')
  return resData
}

export const getUserWaitlists = async (): Promise<WaitlistItem[]> => {
  const res = await authFetch(`${BASE_URL}/user/waitlists`)
  if (!res.ok) throw new Error('Failed to fetch waitlists')
  return res.json()
}

export const getUserNotifications = async (): Promise<UserNotification[]> => {
  const res = await authFetch(`${BASE_URL}/user/notifications`)
  if (!res.ok) throw new Error('Failed to fetch notifications')
  return res.json()
}

export const markNotificationRead = async (id: string) => {
  const res = await authFetch(`${BASE_URL}/user/notifications/${id}/read`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Failed to mark notification read')
  return res.json()
}

// Update admin calls to use authFetch
export const adminListSchedulesPaginated = async (params?: {date_from?:string, date_to?:string, direction?:string, page?:number, limit?:number}): Promise<PaginatedResponse<AdminSchedule>> => {
  const query = new URLSearchParams(params as any).toString()
  const res = await authFetch(`${BASE_URL}/admin/schedules${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error('Failed to fetch schedules')
  return res.json()
}

export const adminGetAllBookingsPaginated = async (params?: {status?:string, search?:string, date?:string, train_id?:string, coach_class?:string, page?:number, limit?:number}): Promise<PaginatedResponse<Booking>> => {
  const query = new URLSearchParams(params as any).toString()
  const res = await authFetch(`${BASE_URL}/admin/bookings${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error('Failed to fetch bookings')
  return res.json()
}

// Admin Booking operations
export const adminCancelBooking = async (id: string) => {
  const res = await authFetch(`${BASE_URL}/admin/bookings/${id}/cancel`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Failed to cancel booking')
  return res.json()
}
export const adminGetSeatOccupancy = async (seatId: string) => {
  const res = await authFetch(`${BASE_URL}/admin/seats/${seatId}/occupancy`)
  if (!res.ok) throw new Error('Failed to fetch seat occupancy')
  return res.json()
}

// Analytics
export interface SegmentAnalytic { from_seq:number; to_seq:number; from_name:string; to_name:string; total_bookings:number; occupancy_pct:number; }
export interface RevenueAnalytic { total_revenue:number; full_route_revenue:number; segment_reuse_revenue:number; full_route_count:number; segment_reuse_count:number; }
export const adminGetSegmentAnalytics = async (): Promise<SegmentAnalytic[]> => {
  const res = await authFetch(`${BASE_URL}/admin/analytics/segments`)
  if (!res.ok) throw new Error('Failed to fetch segment analytics')
  return res.json()
}
export const adminGetRevenueAnalytics = async (): Promise<RevenueAnalytic> => {
  const res = await authFetch(`${BASE_URL}/admin/analytics/revenue`)
  if (!res.ok) throw new Error('Failed to fetch revenue analytics')
  return res.json()
}
