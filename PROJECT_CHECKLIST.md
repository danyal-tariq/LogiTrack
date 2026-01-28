# 🚛 Project Roadmap: Logitrack (FleetOps)
**Target Level:** Senior / Staff Software Engineer
**Core Focus:** High Concurrency, Event-Driven Architecture, Spatial Data, and DevOps.

## 🟢 Phase 1: Infrastructure & Foundation (COMPLETED)
- [x] **Docker Orchestration:** `docker-compose.yml` set up with PostgreSQL, Redis, and PgAdmin.
- [x] **Geospatial Database:** PostGIS extension enabled.
- [x] **Schema Design:** Tables created (`vehicles`, `vehicle_locations`, `geofences`) with Spatial Indexing (GIST).
- [x] **Connectivity:** Verified connection between Container -> Host -> PgAdmin.

## 🟡 Phase 2: Core Backend Implementation (TypeScript)
*Goal: Get the basic data flow working with type safety.*
- [x] **TS Setup:** Initialize TypeScript project with `ts-node-dev` and proper `tsconfig.json`.
- [x] **Type Definitions:** Create shared interfaces (`Vehicle`, `LocationUpdate`) to ensure consistency.
- [x] **Database Module:** Implement `src/config/db.ts` using `pg.Pool` with error handling.
- [x] **Redis Module:** Implement `src/config/redis.ts` for caching current vehicle states.
- [x] **Basic Controller:** Create `POST /api/location` to receive GPS data.
- [x] **Socket.io Server:** specific setup in `app.ts` with CORS configuration.

## 🔴 Phase 3: Advanced Architecture (Resilience & Scale)
*Goal: Transform the app from "Tutorial" to "Production System" using an Event-Driven approach.*

### 3.1 Input Integrity & Security
- [x] **Validation Layer:** Implement **Zod** schemas to validate incoming GPS payloads (reject invalid lat/lng or negative speeds).
- [x] **Structured Logging:** Replace `console.log` with **Pino**. Ensure logs are JSON-formatted for observability tools.

### 3.2 The "Write-Behind" Pattern (Async Processing)
- [x] **Message Queue:** Install **BullMQ** (or Redis Streams) to handle high-throughput ingestion.
- [x] **Producer Logic:** Refactor `POST /api/location` to push jobs to the Queue instead of writing to DB directly.
- [x] **Worker Service:** Create a dedicated worker process (`src/workers/locationWorker.ts`) to consume jobs and perform the SQL writes.
- [x] **Batching:** Configure the worker to insert records in batches (e.g., every 50 records or 500ms) to reduce DB IOPS.

### 3.3 Reliability
- [x] **Graceful Shutdown:** Implement logic to close DB pools and Redis connections on `SIGTERM`.
- [x] **Retry Logic:** Configure BullMQ to retry failed database writes (e.g., if DB is temporarily locked).

### 3.4 Observability (Monitoring & Health)
- [ ] **Health Checks:** Implement `GET /health` endpoint for DB and Redis status.
- [ ] **Queue Monitoring:** Track job failure rates and queue depth for backpressure alerts.
- [ ] **Tracing:** Implement Correlation IDs to track a location update from request to background persistence.
- [ ] **Dashboard** Implemet Bull Board for monitoring job queues.

## ⚪ Phase 4: Database Engineering
*Goal: Optimize for millions of rows.*
- [x] **Partitioning:** Refactor `vehicle_locations` table to use **Declarative Partitioning** by Date (e.g., one partition per month).
- [x] **Materialized Views:** Create a view for "Daily Fleet Analytics" (total distance, avg speed) and set up a refresh strategy.
- [x] **Concurrency Control:** Implement Optimistic Locking (versioning) on the `vehicles` table to prevent race conditions during status updates.
- [ ] **Conflict Detection (Advanced):** Implement a mechanism to handle and log out-of-order delivery based on `recorded_at` timestamps.

## � Phase 5: The Simulation & Load Testing (COMPLETED)
- [x] **Simulator Script:** Create a Node.js script that spawns 500 "Virtual Trucks" moving randomly around Dubai coordinates.
- [x] **Load Testing:** Create a **k6** script to hit the API with 1,000 requests/second.
- [x] **Benchmarks:** Record metrics: Latency before Queue vs. Latency after Queue implementation.
- [x] **Stress Testing:** Test system breaking point with progressive load ramping to 4,000 VUs.
- [x] **Spike Testing:** Test recovery from sudden traffic bursts.
- [x] **Comprehensive Documentation:** Full benchmark results documented in `BENCHMARKS.md` with before/after comparison.

## 🟢 Phase 6: Frontend & Real-Time Visualization (COMPLETED)
- [x] **Next.js Setup:** Initialize with TypeScript and Tailwind.
- [x] **Map Integration:** Implement **React-Leaflet** with a custom Map component.
- [x] **Socket Hook:** Create a robust `useVehicleSocket` hook that handles reconnection automatically.
- [x] **Performance:** Implement **throttling** on the frontend to limit map re-renders to 60fps, even if updates come in faster.
- [x] **Geofence UI:** Ability to draw a polygon on the map and save it to the DB.
  - [x] Drawing functionality using Leaflet.draw
  - [x] Save/load geofences with PostGIS backend
  - [x] GeofenceManager panel with list, create, delete, and Go-to functionality
  - [x] GeofenceDetails popup component (similar to VehicleDetails)
  - [x] Map click handlers with proper event propagation
  - [x] Coordinate conversion between frontend [lat,lng] and PostGIS GeoJSON [lng,lat]
  - [x] Fixed map double-initialization guard

## ⚪ Phase 7: DevOps & CI/CD
- [ ] **Multi-Stage Dockerfile:** Optimize image size (Build Stage vs. Run Stage).
- [ ] **CI Pipeline:** GitHub Actions workflow to run Linting, TS Build, and Tests on every push.
- [ ] **Production Config:** `docker-compose.prod.yml` removing development ports (like PgAdmin) and enabling restart policies.