import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL as string,
});

redisClient.on('error', (err) => logger.error({ err }, '❌ Redis Client Error'));
redisClient.on('connect', () => {
    logger.info('🔄 Connecting to Redis...');
});

(async () => {
    await redisClient.connect();
    logger.info('✅ Connected to Redis');
})();

export default redisClient;