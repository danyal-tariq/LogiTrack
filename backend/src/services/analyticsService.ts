import pool from '../config/db';
import logger from '../config/logger';

export const refreshDailyStats = async () => {
    let client;
    try {
        client = await pool.connect();
        logger.debug('🔄 Refreshing daily analytics statistics...');
        await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_fleet_stats;');
        logger.info('✅ Successfully refreshed daily analytics statistics.');
    } catch (error) {
        logger.error({ error }, '❌ Error refreshing daily analytics statistics');
    } finally {
        if (client) client.release();
    }
};
