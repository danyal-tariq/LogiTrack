/* eslint-disable camelcase */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    // Create materialized view for daily fleet statistics
    pgm.sql(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS daily_fleet_stats AS
        WITH location_distances AS (
            SELECT 
                vehicle_id,
                DATE(recorded_at) AS travel_day,
                speed,
                location,
                recorded_at,
                LAG(location) OVER (PARTITION BY vehicle_id ORDER BY recorded_at) AS prev_location
            FROM vehicle_locations
            WHERE recorded_at >= CURRENT_DATE - INTERVAL '90 days'
        )
        SELECT 
            vehicle_id,
            travel_day,
            COUNT(*) AS total_updates,
            AVG(speed) AS avg_speed,
            MAX(speed) AS max_speed,
            MIN(speed) AS min_speed,
            SUM(
                CASE 
                    WHEN prev_location IS NOT NULL 
                    THEN ST_Distance(location::geometry, prev_location::geometry)
                    ELSE 0
                END
            ) / 1000.0 AS total_distance_km
        FROM location_distances
        GROUP BY vehicle_id, travel_day;
    `);

    // Create unique index to enable CONCURRENT refresh
    pgm.createIndex('daily_fleet_stats', ['vehicle_id', 'travel_day'], {
        name: 'idx_daily_fleet_stats_unique',
        unique: true,
        ifNotExists: true
    });

    // Create index for faster queries on travel_day
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_daily_fleet_stats_travel_day 
        ON daily_fleet_stats(travel_day DESC);
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Drop materialized view
    pgm.dropMaterializedView('daily_fleet_stats', { 
        ifExists: true, 
        cascade: true 
    });
}
