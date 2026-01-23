import { Request, Response } from 'express';
import pool from '../config/db';
import logger from '../config/logger';
import { DailyFleetStatsSchema } from '../models/vehicle';

export const getDailyStats = async (req: Request, res: Response) => {
    try {
        const validation = DailyFleetStatsSchema.safeParse(req.query);

        if (!validation.success) {
            logger.warn({ errors: validation.error.format() }, 'Invalid analytics stats request payload');
            return res.status(400).json({
                error: 'Invalid request data',
                details: validation.error.format()
            });
        }

        const { vehicleId, limit = 7 } = validation.data;

        const query = `
            SELECT * FROM daily_fleet_stats 
            WHERE vehicle_id = $1 
            ORDER BY travel_day DESC 
            LIMIT $2;
        `;
        const result = await pool.query(query, [vehicleId, limit]);
        res.status(200).json(result.rows);
    } catch (error) {
        logger.error({ error }, '❌ Error fetching analytics stats');
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
