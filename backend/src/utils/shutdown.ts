import pool from "../config/db";
import { redisClient } from "../config/redis";
import { locationWorker, processJobsQueue } from "../workers/locationWorker";

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await shutdown();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await shutdown();
    process.exit(0);
});


const shutdown = async () => {
    await locationWorker.close();
    await processJobsQueue();
    console.log('Workers shut down successfully.');
    await pool.end();
    console.log('Database connection closed successfully.');
    await redisClient.quit();
    console.log('Redis client disconnected successfully.');
}