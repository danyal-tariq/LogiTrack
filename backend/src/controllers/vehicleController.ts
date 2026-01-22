import { Request, Response } from 'express';
import { Server } from 'socket.io';
import pool from '../config/db';
import redisClient from '../config/redis';
import { LocationUpdateSchema } from '../models/vehicle';
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

    const { vehicleId, lat, lng, speed, status } = validation.data;

    // 2. Redis Geospatial Update
    await redisClient.geoAdd('fleet_locations', {
      longitude: lng,
      latitude: lat,
      member: vehicleId.toString()
    });

    // 3. Real-Time Emit
    io.emit('vehicle_update', { vehicleId, lat, lng, speed, status });

    // 4. PostgreSQL Write
    const query = `
      INSERT INTO vehicle_locations (vehicle_id, location, speed)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
    `;
    await pool.query(query, [vehicleId, lng, lat, speed]);

    // Update current status
    await pool.query(
      'UPDATE vehicles SET last_updated = NOW(), status = $1 WHERE id = $2', 
      [status, vehicleId]
    );

    logger.info({ vehicleId, speed }, 'Processed location update');
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(error, 'Error processing location update');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};