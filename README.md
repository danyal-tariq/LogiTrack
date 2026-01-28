# Logitrack - Real-Time Fleet Tracking System

A production-grade, event-driven fleet tracking system designed for high concurrency and scalability. Features real-time GPS tracking, geofencing, analytics, and interactive mapping with support for 1,000+ requests/second.

## Performance Benchmarks
We conducted extensive load testing using **k6** to validate the Write-Behind architecture.

| Metric | Direct DB Writes | Queue (Write-Behind) | Improvement |
| :--- | :--- | :--- | :--- |
| **Throughput** | 1,126 req/s | **3,550 req/s** | **3.15x** |
| **P95 Latency** | 1,010ms | **371ms** | **2.7x Faster** |
| **Success Rate** | 100% | **99.9%** | Stable |

> **Result:** The implementation of Redis + BullMQ allowed the system to handle **3.5x more traffic** while reducing latency by **63%**.

![Load Test Terminal Screenshot](./assets/load-test-screenshot.png)

[Click here to view the full detailed Benchmarking Report](./BENCHMARKS.md)

## Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express 5
- **Database**: PostgreSQL 15 + PostGIS (spatial data)
- **Caching/Queue**: Redis 7 + BullMQ
- **Real-time**: Socket.io WebSockets
- **Logging**: Pino (structured JSON logging)
- **Validation**: Zod schemas
- **Migrations**: node-pg-migrate with TypeScript

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **Mapping**: Leaflet + Leaflet Draw
- **Real-time**: Socket.io Client
- **Language**: TypeScript 5

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database Admin**: PgAdmin 4
- **Load Testing**: Custom simulator + K6

## System Architecture

```mermaid
graph TD
    User[User / Truck] -->|HTTP/WS| LB[Load Balancer]
    LB --> API[Node.js API Cluster]
    
    subgraph "Real-Time Layer"
        API -->|Socket.io| Client[Frontend Dashboard]
        API -->|Geospatial Write| Redis[Redis Cache]
    end
    
    subgraph "Async Processing"
        Redis -->|BullMQ Job| Queue[Job Queue]
        Queue -->|Batch Process| Worker[Worker Service]
    end
    
    subgraph "Persistence"
        Worker -->|Bulk Insert| DB[(PostgreSQL + PostGIS)]
        DB -->|Partitioning| Parts[Monthly Partitions]
        DB -->|Aggregation| Views[Materialized Views]
    end
```

## Features

### Core Capabilities
- **Real-time GPS Tracking**: Live location updates for 500+ vehicles
- **Interactive Map**: Leaflet-based mapping with vehicle markers and status indicators
- **Geofencing**: Draw and manage custom polygonal geofences with entry/exit detection
- **Fleet Analytics**: Daily statistics including distance traveled, speed metrics, and activity summaries
- **Vehicle Status Monitoring**: Automatic status detection (moving, idling, stopped)
- **WebSocket Live Updates**: Sub-100ms latency for real-time position updates
- **Batch Processing**: Write-behind pattern for optimized database writes
- **Optimistic Locking**: Version-based concurrency control

### Performance Features
- **Partitioned Tables**: Monthly partitioning for location history
- **Materialized Views**: Pre-aggregated analytics refreshed via background jobs
- **Spatial Indexing**: GIST indexes on PostGIS geography columns
- **Batch Writes**: BullMQ job batching (1000ms intervals, 10-20x IOPS reduction)
- **Connection Pooling**: Managed PostgreSQL connection pools
- **Graceful Shutdown**: SIGTERM/SIGINT handlers with queue flushing

## Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (for PostgreSQL, Redis, PgAdmin)
- **Node.js 18+** (LTS recommended)
- **npm** or **yarn**
- **Git** (for cloning)

### 1. Clone & Setup Infrastructure

```bash
# Clone the repository
git clone https://github.com/danyal-tariq/logitrack.git
cd logitrack

# Start infrastructure (PostgreSQL, Redis, PgAdmin)
docker-compose up -d
```

**Services Started:**
- PostgreSQL: `localhost:5432` (admin/password123)
- Redis: `localhost:6379`
- PgAdmin: `http://localhost:5050` (admin@admin.com/admin)

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create database (if needed)
npm run create-db

# Run migrations
npm run migrate

# Seed initial data (500 vehicles)
npm run seed

# Start development server
npm run dev
```

**Backend API:** `http://localhost:4000`  
**WebSocket:** `ws://localhost:4000`

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend UI:** `http://localhost:3000`

### 4. Run Simulator (Optional)

```bash
cd simulator

# Install dependencies
npm install

# Start 500 virtual trucks
npm start
```

**Simulator Behavior:**
- Creates 500 virtual vehicles
- Sends GPS updates every 2 seconds (~250 req/s baseline)
- Simulates realistic movement with speed and heading vectors
- Routes through major Dubai areas
- Includes status changes (moving, idling, stopped)

## Database Migrations

The project uses **node-pg-migrate** for database schema management with TypeScript migrations.

### Running Migrations

```bash
cd backend

# Apply all pending migrations
npm run migrate

# Rollback last migration (if needed)
npm run migrate:down

# Create new migration
npm run migrate:create add-vehicle-field
```

### Creating New Migrations

1. Generate a migration file:
   ```bash
   npm run migrate:create add-vehicle-field
   ```

2. Edit the generated TypeScript file in `src/migrations/`:
   ```typescript
   export async function up(pgm: MigrationBuilder): Promise<void> {
       pgm.addColumn('vehicles', {
           new_field: { type: 'varchar(100)' }
       });
   }

   export async function down(pgm: MigrationBuilder): Promise<void> {
       pgm.dropColumn('vehicles', 'new_field');
   }
   ```

3. Apply the migration:
   ```bash
   npm run migrate
   ```

See [backend/src/migrations/README.md](backend/src/migrations/README.md) for detailed migration guidelines.

## Project Structure

```
logitrack/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── app.ts              # Express server entry point
│   │   ├── config/             # DB, Redis, Logger config
│   │   ├── controllers/        # Request handlers (analytics, vehicle, geofence)
│   │   ├── models/             # TypeScript interfaces & Zod schemas
│   │   ├── queues/             # BullMQ producers (location queue)
│   │   ├── workers/            # BullMQ consumers (batch location processor)
│   │   ├── services/           # Business logic (analytics refresh)
│   │   ├── routes/             # Express routers
│   │   ├── utils/              # Graceful shutdown utilities
│   │   └── sockets/            # Socket.io event handlers
│   ├── migrations/             # Database migration files (TypeScript)
│   ├── scripts/                # Database utility scripts
│   ├── database.json           # Migration configuration
│   └── package.json
│
├── frontend/                   # Next.js 16 + React 19
│   ├── app/
│   │   ├── page.tsx            # Main dashboard page
│   │   ├── layout.tsx          # Root layout with metadata
│   │   └── globals.css         # Global styles + Tailwind
│   ├── components/
│   │   ├── Map.tsx             # Leaflet map wrapper
│   │   ├── VehicleList.tsx     # Vehicle sidebar with filters
│   │   ├── VehicleDetails.tsx  # Selected vehicle info panel
│   │   ├── FleetStats.tsx      # Real-time fleet statistics
│   │   ├── GeofenceManager.tsx # Geofence CRUD interface
│   │   └── GeofenceDetails.tsx # Geofence info panel
│   ├── hooks/
│   │   ├── useVehicleMarkers.ts    # Vehicle marker management + updates
│   │   ├── useVehicleSocket.ts     # WebSocket connection handler
│   │   └── useGeofenceDrawing.ts   # Leaflet Draw integration
│   ├── types/
│   │   └── vehicle.ts          # Shared TypeScript types
│   └── package.json
│
├── simulator/                  # Load testing simulator
│   ├── src/
│   │   ├── index.ts            # Fleet orchestrator (500 trucks)
│   │   ├── truck.ts            # Virtual truck physics engine
│   │   └── routes.ts           # Dubai route definitions
│   ├── load-tests/             # K6 load testing scripts
│   │   ├── load-test.ts        # Standard load test
│   │   ├── stress-test.ts      # Stress testing
│   │   ├── spike-test.ts       # Spike testing
│   │   └── soak-test.ts        # Endurance testing
│   └── package.json
│
├── docker-compose.yml          # Infrastructure (PostgreSQL, Redis, PgAdmin)
├── docker-compose.prod.yml     # Production configuration
├── redis.conf                  # Redis configuration
├── README.md                   # This file
├── PROJECT_CHECKLIST.md        # Development roadmap
└── BENCHMARKS.md               # Performance benchmarks
```

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://admin:password123@localhost:5432/fleet_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fleet_db
DB_USER=admin
DB_PASSWORD=password123

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=4000
NODE_ENV=development

# Logging
LOG_LEVEL=info

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### Simulator (`simulator/.env`)

```env
API_URL=http://localhost:4000/api
NUM_TRUCKS=500
UPDATE_INTERVAL=2000
```

## Performance Features

### Write-Behind Pattern
- Incoming requests are queued in Redis via BullMQ
- Worker processes consume jobs in batches (1000ms intervals)
- Reduces database IOPS by 10-20x

### Database Optimizations
- **Partitioning**: `vehicle_locations` partitioned by month
- **Materialized Views**: Pre-aggregated daily analytics
- **Spatial Indexing**: GIST indexes on PostGIS geography columns
- **Optimistic Locking**: Version-based concurrency control

### Observability
- **Structured Logging**: Pino with JSON output
- **Graceful Shutdown**: SIGTERM/SIGINT handlers flush queues before exit

## Load Testing

The simulator creates 500 virtual trucks that:
- Start at random Dubai coordinates
- Move realistically (speed + heading vectors)
- Report GPS updates every 2 seconds
- Increment version numbers for optimistic locking

```bash
cd simulator
npm start
```

Expected throughput: **250 req/s** baseline (500 trucks × 1 update / 2s)

## API Endpoints

### Vehicle Endpoints

#### POST `/api/vehicle/location`
Submit GPS location update (queued for batch processing)

**Request:**
```json
{
  "vehicleId": 1,
  "lat": 25.1972,
  "lng": 55.2744,
  "speed": 85.5,
  "heading": 270,
  "status": "moving",
  "version": 5,
  "recordedAt": "2026-01-23T10:30:00.000Z"
}
```

**Response:** `200 OK`
```json
{ "success": true }
```

#### GET `/api/vehicle/all`
Fetch all vehicles with latest location

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "license_plate": "DXB-001",
    "model": "Volvo FH16",
    "status": "moving",
    "latest_location": {
      "latitude": 25.1972,
      "longitude": 55.2744,
      "speed": 85.5,
      "heading": 270,
      "recorded_at": "2026-01-28T10:30:00Z"
    }
  }
]
```

### Analytics Endpoints

#### GET `/api/analytics/stats`
Fetch daily analytics for vehicles

**Query Parameters:**
- `vehicleId` (optional): Filter by specific vehicle
- `limit` (optional, default: 7): Number of days to return

**Response:** `200 OK`
```json
[
  {
    "vehicle_id": 1,
    "travel_day": "2026-01-28",
    "total_updates": 43200,
    "avg_speed": 65.3,
    "max_speed": 120.0,
    "min_speed": 0.0,
    "total_distance_km": 1250.5
  }
]
```

### Geofence Endpoints

#### GET `/api/geofence`
Fetch all geofences

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Downtown Warehouse",
    "coordinates": [[25.1972, 55.2744], [25.1980, 55.2750], ...],
    "created_at": "2026-01-28T08:00:00Z"
  }
]
```

#### POST `/api/geofence`
Create a new geofence

**Request:**
```json
{
  "name": "Downtown Warehouse",
  "coordinates": [[25.1972, 55.2744], [25.1980, 55.2750], [25.1975, 55.2760]]
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Downtown Warehouse",
  "coordinates": [...],
  "created_at": "2026-01-28T08:00:00Z"
}
```

#### DELETE `/api/geofence/:id`
Delete a geofence

**Response:** `200 OK`
```json
{ "success": true }
```

### WebSocket Events

#### Client → Server
- `subscribe`: Subscribe to vehicle updates

#### Server → Client
- `location-update`: Real-time vehicle location update
  ```json
  {
    "vehicle_id": "1",
    "latitude": 25.1972,
    "longitude": 55.2744,
    "speed": 85.5,
    "heading": 270,
    "status": "moving"
  }
  ```

## Load Testing (Advanced)

### Built-in Simulator
The included simulator creates 500 virtual vehicles with realistic behavior:

```bash
cd simulator
npm start
```

**Features:**
- Random Dubai coordinates as starting points
- Realistic movement (speed + heading vectors)
- GPS updates every 2 seconds
- Version-based optimistic locking
- Status transitions (moving/idling/stopped)

**Expected Throughput:** ~250 req/s baseline (500 vehicles × 1 update / 2s)

### K6 Load Tests
For advanced load testing:

```bash
cd simulator/load-tests

# Standard load test
k6 run load-test.ts

# Stress test (find breaking point)
k6 run stress-test.ts

# Spike test (sudden traffic surge)
k6 run spike-test.ts

# Soak test (extended duration)
k6 run soak-test.ts
```

## Database Schema

### Core Tables

**`vehicles`**
- Primary vehicle registry
- Fields: id, license_plate, model, status, version, created_at, updated_at

**`vehicle_locations`** (Partitioned by month)
- GPS location history
- Spatial index on geography column
- Fields: id, vehicle_id, latitude, longitude, speed, heading, geography, recorded_at, version

**`geofences`**
- Custom boundary definitions
- PostGIS polygon storage
- Fields: id, name, coordinates (JSONB), geometry (GEOGRAPHY), created_at

**`daily_fleet_analytics`** (Materialized View)
- Pre-aggregated daily statistics
- Refreshed by background worker
- Fields: vehicle_id, travel_day, total_updates, avg_speed, max_speed, min_speed, total_distance_km

### Indexes
- `vehicle_locations_vehicle_id_idx` - Fast vehicle lookups
- `vehicle_locations_geography_idx` (GIST) - Spatial queries
- `vehicle_locations_recorded_at_idx` - Time-based queries
- `geofences_geometry_idx` (GIST) - Geofence intersection queries

## Production Deployment

### Pre-Deployment Checklist

#### Security
- [ ] Change all default credentials in `docker-compose.prod.yml`
- [ ] Enable PostgreSQL SSL/TLS connections
- [ ] Configure Redis authentication (requirepass)
- [ ] Set up firewall rules (restrict database ports)
- [ ] Use environment variable secrets (not .env files)
- [ ] Enable CORS whitelist for frontend domain
- [ ] Implement rate limiting on API endpoints

#### Infrastructure
- [ ] Set up container orchestration (Kubernetes/ECS)
- [ ] Configure load balancer for backend instances
- [ ] Enable CDN for frontend static assets
- [ ] Set up managed PostgreSQL (RDS/CloudSQL)
- [ ] Use managed Redis (ElastiCache/MemoryStore)
- [ ] Configure auto-scaling policies

#### Observability
- [ ] Set up log aggregation (ELK/Datadog/CloudWatch)
- [ ] Configure metrics collection (Prometheus)
- [ ] Set up dashboards (Grafana)
- [ ] Enable APM tracing (Datadog/New Relic)
- [ ] Configure alerts (PagerDuty/OpsGenie)
- [ ] Set up uptime monitoring

#### Database
- [ ] Enable automated backups (daily/hourly)
- [ ] Configure point-in-time recovery (PITR)
- [ ] Set up read replicas for analytics queries
- [ ] Automate partition creation (future months)
- [ ] Schedule vacuum/analyze jobs
- [ ] Configure connection pooling (PgBouncer)

#### Performance
- [ ] Enable Redis persistence (RDB/AOF)
- [ ] Configure BullMQ job retention policies
- [ ] Set up CDN caching headers
- [ ] Enable gzip/brotli compression
- [ ] Optimize Docker images (multi-stage builds)

### Production Environment Variables

**Backend:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/fleet_db?sslmode=require
REDIS_URL=rediss://prod-redis:6379
PORT=4000
LOG_LEVEL=warn
CORS_ORIGIN=https://your-domain.com
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
```

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Additional Documentation

- [Database Migrations Guide](backend/migrations/README.md)
- [Project Checklist](PROJECT_CHECKLIST.md) - Development roadmap
- [Performance Benchmarks](BENCHMARKS.md) - Load testing results

## Development Tips

### Database Management

```bash
# Create database
cd backend && npm run create-db

# Drop database (caution!)
npm run drop-db

# Create new migration
npm run migrate:create add_new_field

# Rollback last migration
npm run migrate:down
```

### Debugging

```bash
# View backend logs
cd backend && npm run dev

# View Redis queue contents
redis-cli
> KEYS bull:location-queue:*
> LLEN bull:location-queue:wait

# Connect to PostgreSQL
psql -h localhost -U admin -d fleet_db

# Check partition sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'vehicle_locations%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Frontend Development

```bash
# Type checking
cd frontend && npx tsc --noEmit

# Linting
npm run lint

# Production build test
npm run build && npm start
```

## Contributing

This is a learning/portfolio project demonstrating production-ready engineering practices:

- **Event-Driven Architecture**: BullMQ job queues with batch processing
- **High-Concurrency Patterns**: Write-behind pattern, connection pooling
- **Database Optimization**: Partitioning, spatial indexes, materialized views
- **Real-Time Systems**: WebSocket connections with Socket.io
- **Observability**: Structured logging, graceful shutdown
- **Type Safety**: End-to-end TypeScript with Zod validation
- **Migration Management**: Version-controlled database schemas
- **Geospatial Operations**: PostGIS for location-based queries

Feel free to explore, learn, and adapt for your own projects!

## License

MIT

---

**Built for high-performance fleet tracking**
