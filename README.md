# Segment-Based Train Seat Booking System 🚆🇱🇰

A high-concurrency, enterprise-grade segment-based train seat reservation platform designed for scenic and regional railway lines (such as Sri Lanka Railways). The system enables dynamic seat re-allocation across station legs, guaranteeing maximum train capacity utilization while preventing double bookings through Redis distributed locking and PostgreSQL atomic transactions.

---

## 📌 Executive Summary & Architecture Overview

Traditional train booking engines treat an entire journey as a static unit, rendering a seat unavailable for the whole route even if a passenger only travels between intermediate stops. 

Our **Segment-Based Train Seat Booking Engine** models train routes as sequential station segments ($0 \to 1, 1 \to 2, \dots, N-1 \to N$). A seat can be booked for overlapping or non-overlapping station ranges independently. When a passenger books a seat from Station A to B, that same seat remains available for future passengers traveling from B to C on the exact same train.

```
Station Sequence:  0 (Colombo) ──── 1 (Polgahawela) ──── 2 (Kandy) ──── 3 (Badulla)
Passenger 1:       [============ Seat 12 ============]
Passenger 2:                                          [==== Seat 12 ====]  (SEGMENT REUSED!)
```

### System Architecture

- **Backend**: Go (Golang) REST API utilizing `chi` router, native `pgx` pool, and JWT RBAC authentication.
- **Cache & Concurrency Control**: Redis for sub-millisecond distributed locks, active seat holds, and TTL-based expiration.
- **Database**: PostgreSQL with ACID relational schema, sequence segment tracking, and scheduled departure auto-deactivation.
- **Frontend**: React 18, TypeScript, TailwindCSS, Framer Motion, Lucide Icons, and SVG Line Data Visualization.
- **Email Notifications**: EmailJS REST API integration for real-time transaction receipts, administrative decision notices, welcome emails, and waitlist alerts.

---

## 🧠 Core Design Decisions & Reasoning

### 1. Redis Distributed Locking + DB Atomic Validation vs. Pure Database Row Locking
* **Decision**: We implemented a multi-layered concurrency strategy:
  1. **Redis Distributed Locks (`hold:seat:<schedule_id>:<seat_id>:<segment>`)**: Used when a passenger holds seats temporarily during checkout (5-10 min expiry TTL).
  2. **PostgreSQL Overlap CTE Checks & Atomic Transactions**: Executed upon final payment confirmation using transactions with explicit leg intersection queries:
     $$\text{Overlap} \iff (\text{Existing Start} < \text{Requested End}) \land (\text{Existing End} > \text{Requested Start})$$
* **Alternatives Considered**:
  - *Pure DB `SELECT FOR UPDATE`*: Lock database rows for the duration of user checkout (up to 10 minutes), causing database connection pool starvation and severe bottlenecks under high load.
  - *Optimistic Concurrency Control (OCC) with version columns*: High collision rates under peak booking rushes leading to repeated user checkout failures.
* **Why this choice**: Redis handles transient holds in-memory with sub-millisecond TTL expirations, offloading traffic from PostgreSQL. PostgreSQL only processes finalized bookings with strict ACID guarantees.

### 2. Sequence Order Range Modeling vs. Graph Adjacency Matrix
* **Decision**: Stations are assigned an integer `sequence_order` ($0, 1, 2, \dots$). Booking leg validity is validated via simple integer range comparisons (`start_seq < end_seq`).
* **Alternatives Considered**:
  - *Graph Adjacency Matrix*: Overly complex for linear railway lines, adding unnecessary runtime overhead.
  - *Explicit Leg Table per Seat*: Would require pre-generating thousands of individual seat-leg rows in DB for every single schedule.
* **Why this choice**: Sequence ranges allow dynamic O(1) SQL queries using `WHERE b.start_seq < $to_seq AND b.end_seq > $from_seq`, scaling effortlessly to any number of stations or coaches.

### 3. POS Thermal & Single-Page PDF Print Views
* **Decision**: The receipt component renders an on-screen 80mm POS thermal receipt, while utilizing CSS `@media print` rules for browser `window.print()` / PDF export to fit top-centered on a single page cleanly.
* **Alternatives Considered**:
  - *Server-Side PDF Generation (e.g. wkhtmltopdf / Go PDF libraries)*: Added heavy binary dependencies to backend Docker containers and increased latency.
* **Why this choice**: Native browser print rendering delivers instant, zero-latency receipt generation without inflating backend memory or container size.

---

## 🛠️ Challenges Faced & Solutions

### 1. The "Ghost Hold" & Expiry Race Condition
* **Challenge**: When a seat hold expires in Redis, another user might attempt to book the seat at the exact millisecond the original user submits payment.
* **Solution**: Implemented atomic Lua scripts in Redis and double-check validation in backend `ConfirmBooking`:
  ```sql
  SELECT COUNT(*) FROM bookings 
  WHERE schedule_id = $1 AND seat_id = $2 AND status = 'CONFIRMED'
    AND start_seq < $4 AND end_seq > $3
  ```
  If an overlap is detected, the transaction aborts cleanly, and the user receives a structured HTTP 409 Conflict response.

### 2. Departure Time Safety Cutoff (1-Hour Pre-Departure Rule)
* **Challenge**: Passengers attempting to book or hold seats on trains that have already departed or are departing within minutes.
* **Solution**:
  - **SQL Filter**: Integrated `(s.departure_date + s.departure_time::time) > (NOW() + INTERVAL '1 hour')` across all search, list, and hold endpoints.
  - **Background Worker**: Added a background Go ticker worker running every 60 seconds that auto-deactivates schedules departing within 1 hour:
    ```sql
    UPDATE schedules SET is_active = false, cancel_reason = 'Departure within 1 hour' 
    WHERE is_active = true AND (departure_date + departure_time::time) <= (NOW() + INTERVAL '1 hour')
    ```

### 3. Print PDF Page Overflow
* **Challenge**: Browsers printing thermal receipts created extra blank pages or pushed the receipt to the bottom.
* **Solution**: Applied CSS `@page { size: portrait; margin: 5mm; }` and `page-break-inside: avoid !important;` with absolute top-center positioning in `@media print`, guaranteeing single-page outputs.

---

## ✨ Extra Credit & Advanced Features Implemented

1. **Automated Waitlist Promotion Engine**:
   - Passengers can join a waitlist when a coach/train is fully booked.
   - When a booking is cancelled (by admin or passenger), the system automatically promotes the next eligible waitlisted passenger to a confirmed seat and sends a notification.

2. **2-Step Reschedule & Refund Workflow**:
   - Passengers can request journey reschedules or ticket refunds with automated eligibility rules.
   - Admins review, approve, or reject requests with decision notes in an interactive Admin Portal.

3. **Multi-Channel EmailJS Integration**:
   - Real-time transactional emails sent via EmailJS REST API (`service_x1z7q8p`):
     - **Booking Receipt Email**: Dispatched automatically upon seat confirmation.
     - **Reschedule & Refund Decision Emails**: Sent when admins approve or reject requests.
     - **Waitlist Auto-Promotion Email**: Sent when a waiting passenger gets booked.
     - **Passenger Self-Cancellation Email**: Instant cancellation confirmation.
     - **Account Registration Welcome Email**: Sent upon new user signup.

4. **Analytics & Performance Dashboard**:
   - **Booking Trends Line Chart**: Interactive SVG curve line chart with Day-Wise (30 Days) and Month-Wise (12 Months) toggles, gridlines, value labels, and hover details (Bookings, Revenue, Avg Fare).
   - **Segment Occupancy Analytics**: Station-by-station leg load percentage tracking.

5. **POS Thermal Receipt Generator**:
   - 80mm POS thermal receipt styling with embedded QR verification payloads and single-page A4 PDF print export.

6. **Global Confirmation Modals & Security**:
   - Custom `ConfirmDeleteModal` replacing default browser alerts across admin stations, trains, schedules, and profile modules.
   - JWT authentication with secure password hashing (`bcrypt`) and RBAC middleware.

---

## 🔐 Environment Variables & Security

Secrets and credentials are managed via environment variables (never committed to git).

### Backend Environment Variables (`backend/.env`)
```env
PORT=8080
DATABASE_URL=postgres://postgres:postgres@postgres:5432/trainbooking?sslmode=disable
REDIS_URL=redis:6379
JWT_SECRET=your-super-secret-jwt-key
SEAT_HOLD_DURATION_MINUTES=10
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
```

### Frontend Environment Variables (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_EMAILJS_SERVICE_ID=service_x1z7q8p
VITE_EMAILJS_PUBLIC_KEY=H8QxTF3eCPdzWhirQ
VITE_EMAILJS_RECEIPT_TEMPLATE_ID=template_051ybek
VITE_EMAILJS_STATUS_TEMPLATE_ID=template_051ybek
```

---

## 🚀 Quick Start & Deployment Guide

### Prerequisites
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) installed.

### 1. Clone & Launch Container Stack
```bash
git clone https://github.com/lasanga890/Segment-Based-Train-Seat-Booking-System.git
cd Segment-Based-Train-Seat-Booking-System

# Start PostgreSQL, Redis, Go Backend, and React Frontend in Docker
docker compose up --build -d
```

### 2. Access Web Applications
- **Passenger Portal**: `http://localhost:5173`
- **Admin Portal**: `http://localhost:5173/admin/login`
  - **Username**: `admin`
  - **Password**: `admin123`
- **Backend API Health Check**: `http://localhost:8080/api/v1/health`

---

## 📡 Core API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/stations` | List all active stations ordered by sequence |
| `GET` | `/api/v1/schedules` | List available train schedules for date & direction |
| `GET` | `/api/v1/schedules/{id}/seats` | Fetch real-time segment seat availability |
| `POST` | `/api/v1/bookings/hold-many` | Reserve multiple seats with 10-min Redis TTL |
| `POST` | `/api/v1/bookings/confirm` | Finalize seat booking & generate ticket |
| `POST` | `/api/v1/auth/user/register` | Register new passenger account |
| `POST` | `/api/v1/auth/admin/login` | Admin portal authentication |
| `GET` | `/api/v1/admin/analytics/chart` | Fetch daily / monthly booking chart trends |
| `PATCH`| `/api/v1/admin/bookings/{id}/cancel` | Cancel booking & release segment capacity |

---

## 📄 License & Author

Developed with ❤️ for Sri Lanka Railways modern seat reservation engine.