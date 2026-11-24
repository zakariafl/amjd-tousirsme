# Technical architecture and API

## Components

1. **Vite/React** renders the SPA and sends HTTP requests to `/api`. Vite proxies requests to PHP, preserving one browser origin for session cookies.
2. **PHP** uses `backend/public/index.php` to route requests. `Auth.php` implements server-side sessions, CSRF and role checks. Repositories use PDO prepared statements.
3. **MySQL** stores destinations, voyages, departures, users and reservations. Bookings use database transactions and row locking to prevent seat overselling.
4. **Recharts** renders values computed by `AdminRepository.php` (never fabricates revenue).

## Data model

```text
destinations (1) ---- (N) voyages (1) ---- (N) departures
users        (1) ------------------------ (N) reservations
                                      departures (1) --- (N) reservations
```

## Main API routes

| HTTP | Endpoint | Access |
|---|---|---|
| GET | `/api/health` | Public |
| GET | `/api/voyages` | Public |
| GET | `/api/voyages/{id}` | Public |
| GET | `/api/voyages/{id}/departures` | Public |
| GET | `/api/auth/csrf` | Public |
| POST | `/api/auth/register` | Visitor with CSRF |
| POST | `/api/auth/login` | Visitor with CSRF |
| POST | `/api/auth/logout` | Authenticated session + CSRF |
| GET | `/api/auth/me` | Public (null when anonymous) |
| GET, POST | `/api/reservations` | Authenticated client |
| POST | `/api/reservations/{id}/cancel` | Owner only |
| GET | `/api/admin/dashboard` | Admin only |
| GET | `/api/admin/reservations` | Admin only |
| POST | `/api/admin/reservations/{id}/confirm` | Admin only |
| GET, POST | `/api/admin/voyages` | Admin only |
| PUT | `/api/admin/voyages/{id}` | Admin only |
| PATCH | `/api/admin/voyages/{id}/published` | Admin only |
| GET, POST | `/api/admin/voyages/{id}/departures` | Admin only |
| GET, POST | `/api/admin/destinations` | Admin only |

## Booking invariants

- Each departure has capacity and remaining seats.
- Only a logged-in account can create a booking.
- `request_key` prevents duplicate bookings on network retries.
- Seat deduction and booking creation happen in the same MySQL transaction.
- A cancelled booking returns seats subject to booking rules.
- Admin actions are checked server-side, not by hiding buttons in React alone.

## Development vs deployment

The Compose configuration runs Vite and PHP's development server. For public internet hosting, use a reviewed production stack (web server/reverse proxy, PHP-FPM, TLS, managed database, backups and restricted network/secrets).
