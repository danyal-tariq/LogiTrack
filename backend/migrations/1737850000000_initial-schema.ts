/* eslint-disable camelcase */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Enable PostGIS extension
    pgm.sql('CREATE EXTENSION IF NOT EXISTS postgis;');

    // Create vehicles table
    pgm.createTable('vehicles', {
        id: 'id',
        name: { type: 'varchar(255)', notNull: false },
        reg_number: { type: 'varchar(50)', unique: true, notNull: false },
        status: { type: 'varchar(50)', default: "'active'" },
        version: { type: 'integer', default: 0 },
        last_updated: { type: 'timestamp', default: pgm.func('NOW()') }
    }, {
        ifNotExists: true
    });

    // Create vehicle_locations table with partitioning
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS vehicle_locations (
            id SERIAL,
            vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
            location GEOGRAPHY(POINT, 4326) NOT NULL,
            speed FLOAT DEFAULT 0,
            heading INTEGER DEFAULT 0,
            recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            PRIMARY KEY (id, recorded_at)
        ) PARTITION BY RANGE (recorded_at);
    `);

    // Create partitions for 2026
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS vehicle_locations_y2026_m01 
        PARTITION OF vehicle_locations 
        FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
    `);

    pgm.sql(`
        CREATE TABLE IF NOT EXISTS vehicle_locations_y2026_m02 
        PARTITION OF vehicle_locations 
        FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
    `);

    pgm.sql(`
        CREATE TABLE IF NOT EXISTS vehicle_locations_y2026_m03 
        PARTITION OF vehicle_locations 
        FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
    `);

    // Create spatial indexes
    pgm.createIndex('vehicle_locations_y2026_m01', 'location', {
        name: 'idx_vehicle_locations_y2026_m01_location',
        method: 'gist',
        ifNotExists: true
    });

    pgm.createIndex('vehicle_locations_y2026_m02', 'location', {
        name: 'idx_vehicle_locations_y2026_m02_location',
        method: 'gist',
        ifNotExists: true
    });

    pgm.createIndex('vehicle_locations_y2026_m03', 'location', {
        name: 'idx_vehicle_locations_y2026_m03_location',
        method: 'gist',
        ifNotExists: true
    });

    // Create composite indexes on vehicle_id and recorded_at
    pgm.createIndex('vehicle_locations_y2026_m01', ['vehicle_id', 'recorded_at'], {
        name: 'idx_vehicle_locations_y2026_m01_vehicle_recorded',
        ifNotExists: true
    });

    pgm.createIndex('vehicle_locations_y2026_m02', ['vehicle_id', 'recorded_at'], {
        name: 'idx_vehicle_locations_y2026_m02_vehicle_recorded',
        ifNotExists: true
    });

    pgm.createIndex('vehicle_locations_y2026_m03', ['vehicle_id', 'recorded_at'], {
        name: 'idx_vehicle_locations_y2026_m03_vehicle_recorded',
        ifNotExists: true
    });

    // Create geofences table
    pgm.createTable('geofences', {
        id: 'id',
        name: { type: 'varchar(255)', notNull: true },
        geom: { type: 'GEOGRAPHY(POLYGON, 4326)', notNull: true },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') }
    }, {
        ifNotExists: true
    });

    // Create spatial index on geofences
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='geofences' AND column_name='geom') THEN
                CREATE INDEX IF NOT EXISTS idx_geofences_geom 
                ON geofences USING GIST(geom);
            END IF;
        END$$;
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Drop tables in reverse order
    pgm.dropTable('geofences', { ifExists: true, cascade: true });
    pgm.dropTable('vehicle_locations', { ifExists: true, cascade: true });
    pgm.dropTable('vehicles', { ifExists: true, cascade: true });
    
    // Drop PostGIS extension
    pgm.sql('DROP EXTENSION IF EXISTS postgis CASCADE;');
}
