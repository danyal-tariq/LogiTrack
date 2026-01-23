import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { redisClient } from '../config/redis';
import { LocationUpdateSchema } from '../models/vehicle';
import { addLocationJob } from '../queues/locationQueue';
import logger from '../config/logger';

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

        const { vehicleId, lat, lng, speed, status, heading } = validation.data;

        // 2. Redis Geospatial Update
        await redisClient.geoAdd('fleet_locations', {
            longitude: lng,
            latitude: lat,
            member: vehicleId.toString()
        });

        // 3. Real-Time Emit
        io.emit('vehicle_update', { vehicleId, lat, lng, speed, status, heading });

        // 4. Queue Background Job
        await addLocationJob({ vehicleId, lat, lng, speed, status, heading });
        
        logger.info({ vehicleId, speed, heading }, 'Processed location update');
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error(error, 'Error processing location update');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};