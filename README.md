# AMJD Tourisme V2 — Full-Stack Travel Booking & Analytics

![CI](https://img.shields.io/badge/CI-GitHub_Actions-24292f) ![React](https://img.shields.io/badge/Frontend-React-149eca) ![PHP](https://img.shields.io/badge/Backend-PHP_8.4-777bb3) ![SQL](https://img.shields.io/badge/Database-MySQL_8.4-4479a1)

> Educational portfolio demonstration, rebuilt from a basic travel-agency landing page. All trips, prices, availability, customer accounts and reviews used for demonstrations are fictional. Not a live booking or payment service.

**Tech stack:** React + Vite, JavaScript, CSS, PHP, REST API, PDO, MySQL, Recharts, Docker Compose, Python smoke tests, PHP unit tests, GitHub Actions.

## What it does

- Search/filter published trips, view destination details and departure availability.
- Register, sign in/out with server-side PHP sessions, CSRF protection and hashed passwords.
- Make idempotent reservations with transactional seat inventory; view and cancel bookings.
- Admin-only management for trips, destinations and departures, plus reservation confirmations.
- Analytics dashboard: status breakdown, booking trends, popular destinations and **confirmed booking value** (not collected revenue).

## Architecture

```text
React / Vite (http://localhost:5173)
       | GET/POST /api  [Vite same-origin proxy]
       v
PHP 8.4 API (http://localhost:8000)
       | PDO prepared statements
       v
MySQL 8.4 (Docker host port 3307; internal port 3306)
```

Detailed architecture and API endpoints: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run with Docker Desktop (recommended)

**Prerequisites:** Docker Desktop (Compose v2). Stop any local servers occupying ports 5173, 8000 or 3307.

On **Windows CMD** in the project root:

```cmd
copy .env.example .env
docker compose up -d --build
docker compose ps
```

- Frontend: http://localhost:5173
- API check: http://localhost:8000/api/health
- MySQL (optional local DB client): `127.0.0.1:3307` using the credentials in the root `.env`.

The **first** startup creates a separate Docker database and imports `schema.sql`, `seed.sql`, `04_auth.sql` and `05_reservations.sql`. Database files are **not reimported** on subsequent starts when the named volume already contains data.

Stop without deleting data:

```cmd
docker compose down
```

**Never run** `docker compose down -v` against a Docker database containing data you want to keep. Docker uses its own volume, separate from XAMPP MySQL.

## Existing XAMPP setup (without Docker)

Keep your current `backend/.env` and imported MySQL tables. In two separate CMD windows:

```cmd
cd /d "C:\Users\faysal flk\Desktop\amjd-tourisme\backend"
C:\xampp\php\php.exe -S 127.0.0.1:8000 -t public public/index.php
```

```cmd
cd /d "C:\Users\faysal flk\Desktop\amjd-tourisme\frontend"
npm install
npm run dev
```

> XAMPP PHP 8.1 is end-of-life. The Docker environment uses supported PHP 8.4. This setup is for local development, not production hosting.

## Tests and CI

```cmd
docker compose exec api php tests/unit.php
python scripts/smoke_test.py http://127.0.0.1:8000
```

`smoke_test.py` **creates a fictitious client and reservation, then cancels it**. Run it only against the disposable Docker demo database, not real customer data.

`npm ci` and `npm run build` run automatically in GitHub Actions when changes are pushed to `main` or included in a pull request. **Commit `frontend/package.json` AND `frontend/package-lock.json`** so installs are reproducible.

## Repository layout

```text
frontend/           React pages and components (Vite)
backend/public/     PHP REST API entrypoint
backend/src/        Database repositories, auth and business logic
backend/tests/      PHP unit tests
database/           Schema, fictitious seed and incremental SQL migrations
scripts/            Python API integration test
.github/workflows/  CI: frontend build, PHP tests and integration
docs/               Architecture and step-by-step setup guide
docker-compose.yml  React + PHP + MySQL local environment
```

## Security & limitations

- No real payment integration. A confirmed booking is **not** proof of revenue collected.
- Do not use real customer data or commit `.env` credentials, SQL exports or production secrets.
- Authentication uses PHP sessions and CSRF. Production deployment would additionally require HTTPS, a production web server, email verification, stronger rate limiting, a secret manager, backups, observability and a security review.
- Docker credentials in `.env.example` are examples for local development only.
- Publishing brand assets or code from any previous internship requires authorization; replace brand details if permission is not granted.

## Roadmap

- Production deployment and monitoring (separate from dev Docker Compose).
- Admin filters / export features and extended analytics.
- Optional data analytics module with Python and Pandas — **not implemented yet**.
- Automated browser UI tests and accessibility review.

## Screenshots

Add your own screenshots under `docs/screenshots/` and link them here once generated.
