import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { redisClient } from '../config/redis';
import { LocationUpdateSchema } from '../models/vehicle';
import { addLocationJob } from '../queues/locationQueue';
import pool from '../config/db';
import logger from '../config/logger';

// Direct DB write (bypasses queue for performance testing)
const writeLocationDirectly = async (data: any) => {
    const { vehicleId, lat, lng, speed, status, heading, version, recordedAt } = data;
    
    const query = `
        INSERT INTO vehicle_locations (vehicle_id, location, speed, heading, recorded_at)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)
    `;
    
    await pool.query(query, [vehicleId, lng, lat, speed, heading, recordedAt]);
    
    // Also update vehicle version for optimistic locking
    await pool.query(
        `UPDATE vehicles SET version = $1, last_updated = NOW() WHERE id = $2`,
        [version, vehicleId]
    );
};

export const updateLocation = async (req: Request, res: Response, io: Server) => {
    try {
        // 1. Validation
        const validation = LocationUpdateSchema.safeParse(req.body);

        if (!validation.success) {
            logger.warn({ errors: validation.error.format() }, 'Invalid location update payload');
            return res.status(400).json({
                error: 'Invalid request data',
                details: validation.error.format()
            });
        }

        const { vehicleId, lat, lng, speed, status, heading, version, recordedAt } = validation.data;

        // 2. Redis Geospatial Update
        await redisClient.geoAdd('fleet_locations', {
            longitude: lng,
            latitude: lat,
            member: vehicleId.toString()
        });

        // 3. Real-Time Emit
        io.emit('vehicle_update', { vehicleId, lat, lng, speed, status, heading, version, recordedAt });

        // 4. Check feature flag: Queue or Direct Write
        const useQueue = process.env.USE_QUEUE === 'true';
        
        if (useQueue) {
            // Queue Background Job (Write-Behind Pattern) - Fire and forget, don't await
            addLocationJob({ vehicleId, lat, lng, speed, status, heading, version, recordedAt }).catch(err => {
                logger.error({ err, vehicleId }, 'Failed to queue location job');
            });
        } else {
            // Direct DB Write (for baseline testing)
            await writeLocationDirectly({ vehicleId, lat, lng, speed, status, heading, version, recordedAt });
        }
        
        logger.info({ vehicleId, speed, heading, useQueue }, 'Processed location update');
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error(error, 'Error processing location update');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};