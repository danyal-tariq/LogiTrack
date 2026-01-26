# 🚛 Logitrack - Fleet Tracking System

A high-performance, event-driven fleet tracking system built for scale. Handles 1,000+ requests/second with PostgreSQL + PostGIS, Redis, BullMQ, and WebSocket real-time updates.

## 🏗️ Architecture

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL 15 + PostGIS (partitioned tables)
- **Message Queue**: BullMQ + Redis
- **Real-time**: Socket.io
- **Load Testing**: Custom simulator (500 virtual trucks)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- npm or yarn

### 1. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and PgAdmin
docker-compose up -d
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Seed initial vehicle data (500 trucks)
npm run seed

# Start development server
npm run dev
```

The backend will start on `http://localhost:4000`

### 3. Run Simulator (Optional)

```bash
cd simulator

# Install dependencies
npm install

# Start 500 virtual trucks
npm start
```

The simulator will begin sending location updates every 2 seconds (~250 req/s baseline).

## 📊 Database Migrations

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

## 🗂️ Project Structure

```
logitrack/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express server entry point
│   │   ├── config/             # DB, Redis, Logger config
│   │   ├── controllers/        # Request handlers
│   │   ├── models/             # TypeScript interfaces & Zod schemas
│   │   ├── queues/             # BullMQ producers
│   │   ├── workers/            # BullMQ consumers (batch processing)
│   │   ├── services/           # Business logic (analytics refresh)
│   │   ├── routes/             # Express routers
│   │   ├── utils/              # Graceful shutdown utilities
│   │   ├── migrations/         # SQL migration files
│   │   └── seed.ts             # Database seeding script
│   └── package.json
├── simulator/
│   ├── src/
│   │   ├── index.ts            # Fleet orchestrator
│   │   └── truck.ts            # Virtual truck physics
│   └── package.json
└── docker-compose.yml          # Infrastructure setup
```

## 🔧 Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://admin:password123@localhost:5432/fleet_db
REDIS_URL=redis://localhost:6379
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
```

### Simulator (.env)

```env
API_URL=http://localhost:4000/api
```

## 📈 Performance Features

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

## 🧪 Load Testing

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

## 📝 API Endpoints

### POST /api/vehicle/location
Submit GPS location update

**Request Body:**
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

**Response:**
```json
{
  "success": true
}
```

### GET /api/analytics/stats?vehicleId=1&limit=7
Fetch daily statistics for a vehicle

**Response:**
```json
[
  {
    "vehicle_id": 1,
    "travel_day": "2026-01-23",
    "total_updates": 43200,
    "avg_speed": 65.3,
    "max_speed": 120.0,
    "min_speed": 0.0,
    "total_distance_km": 1250.5
  }
]
```

## 🔐 Production Considerations

Before deploying to production:

1. **Change default credentials** in `docker-compose.yml`
2. **Enable SSL/TLS** for PostgreSQL connections
3. **Set up Redis authentication**
4. **Configure log aggregation** (e.g., ELK stack)
5. **Set up monitoring** (Prometheus + Grafana)
6. **Enable backup strategies** for PostgreSQL
7. **Review partition management** (auto-create future partitions)

## 📚 Additional Documentation

- [Database Migrations Guide](backend/src/migrations/README.md)
- [Project Checklist](PROJECT_CHECKLIST.md) - Development roadmap

## 🤝 Contributing

This is a learning/portfolio project demonstrating senior-level software engineering practices:
- Event-driven architecture
- High-concurrency patterns
- Database optimization
- Observability
- Migration systems

## 📄 License

MIT
