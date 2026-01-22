import { Worker } from 'bullmq';
import pool from '../config/db';
import type { LocationUpdate } from '../models/vehicle';
import logger from '../config/logger';
import { redisConnection } from '../config/redis';

const jobsQueue = [] as LocationUpdate[];

const intervalId = setInterval(() => {
    // Process jobs in batches every second
    processJobsQueue();
}, 1000);

const locationWorker = new Worker('locationQueue', async job => {
    const { vehicleId, lat, lng, speed, status } = job.data as LocationUpdate;
    jobsQueue.push({ vehicleId, lat, lng, speed, status });
}, {
    connection: redisConnection,
    drainDelay: 5,

})

locationWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '✅ Location job completed');
});
locationWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, '❌ Location job failed');
});
locationWorker.on('closing', async() => {
    logger.info('🔒 Location worker is closing...');
    //close interval to avoid overlapping
    clearInterval(intervalId);
});
const processJobsQueue = async () => {
    if (jobsQueue.length > 0) {
        // get all jobs and clear the queue
        const jobsToProcess = jobsQueue.splice(0, jobsQueue.length);

        // 1. Prepare Bulk Insert for locations
        // for example, for 3 jobs we need:
        // INSERT INTO vehicle_locations (vehicle_id, location, speed) VALUES
        // ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4),
        // ($5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8),
        // ($9, ST_SetSRID(ST_MakePoint($10, $11), 4326), $12);

        const insertValues = jobsToProcess.map((job, index) => {
            const valueIndex = index * 4;
            return `($${valueIndex + 1}, ST_SetSRID(ST_MakePoint($${valueIndex + 2}, $${valueIndex + 3}), 4326), $${valueIndex + 4})`;
        }).join(', ');

        // Flatten parameters
        // vehicleId, lng, lat, speed for each job
        // e.g. [1, lng1, lat1, speed1, 2, lng2, lat2, speed2, ...]
        const insertParams = jobsToProcess.flatMap(job => [job.vehicleId, job.lng, job.lat, job.speed]);

        // 2. Prepare Bulk Update for vehicle status
        const updateValues = jobsToProcess.map((job, index) => {
            const valueIndex = index * 2;
            return `($${valueIndex + 1}::integer, $${valueIndex + 2})`;
        }).join(', ');
        const updateParams = jobsToProcess.flatMap(job => [job.vehicleId, job.status]);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Bulk Insert Locations
            await client.query(`
                INSERT INTO vehicle_locations (vehicle_id, location, speed)
                VALUES ${insertValues}
            `, insertParams);

            // Bulk Update Vehicle Statuses
            await client.query(`
                UPDATE vehicles
                SET status = v.new_status, last_updated = NOW()
                FROM (VALUES ${updateValues}) AS v(id, new_status)
                WHERE vehicles.id = v.id
            `, updateParams);

            await client.query('COMMIT');
            logger.info({ count: jobsToProcess.length }, `✅ Batch processed: ${jobsToProcess.length} updates`);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error({ error }, '❌ Batch failed - Changes rolled back');
        } finally {
            client.release();
        }
    }
}
export { locationWorker, processJobsQueue };