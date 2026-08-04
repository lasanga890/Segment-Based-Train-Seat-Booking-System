import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthContext'

// Lazy-load pages for code splitting
const HomePage      = lazy(() => import('./pages/HomePage'))
const SeatsPage     = lazy(() => import('./pages/SeatsPage'))
const BookingPage   = lazy(() => import('./pages/BookingPage'))
const UserLogin     = lazy(() => import('./pages/UserLogin'))
const UserRegister  = lazy(() => import('./pages/UserRegister'))
const ProfilePage   = lazy(() => import('./pages/ProfilePage'))
const MyBookingsPage= lazy(() => import('./pages/MyBookingsPage'))
const AdminLogin    = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout   = lazy(() => import('./pages/admin/AdminLayout'))
const AdminMetrics  = lazy(() => import('./pages/admin/AdminMetrics'))
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'))
const AdminStations = lazy(() => import('./pages/admin/AdminStations'))
const AdminTrains   = lazy(() => import('./pages/admin/AdminTrains'))
const AdminSchedules= lazy(() => import('./pages/admin/AdminSchedules'))
const AdminRequests  = lazy(() => import('./pages/admin/AdminRequests'))
const AdminSeatBooking = lazy(() => import('./pages/admin/AdminSeatBooking'))

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Passenger Routes */}
            <Route path="/"            element={<HomePage />} />
            <Route path="/seats"       element={<SeatsPage />} />
            <Route path="/booking/:id" element={<BookingPage />} />
            <Route path="/login"       element={<UserLogin />} />
            <Route path="/register"    element={<UserRegister />} />
            <Route path="/profile"     element={<ProfilePage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />

            {/* Admin Auth & Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="metrics" replace />} />
              <Route path="metrics"   element={<AdminMetrics />} />
              <Route path="stations"  element={<AdminStations />} />
              <Route path="trains"    element={<AdminTrains />} />
              <Route path="schedules" element={<AdminSchedules />} />
              <Route path="bookings"  element={<AdminBookings />} />
              <Route path="seat-booking" element={<AdminSeatBooking />} />
              <Route path="requests"  element={<AdminRequests />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="glass-card p-12 text-center">
                  <h1 className="text-6xl font-black text-slate-200 mb-2">404</h1>
                  <p className="text-slate-400">Page not found</p>
                </div>
              </div>
            } />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
