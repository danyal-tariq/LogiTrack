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
    const { vehicleId, lat, lng, speed, heading, status, version, recordedAt } = job.data as LocationUpdate;
    jobsQueue.push({ vehicleId, lat, lng, speed, heading, status, version, recordedAt });
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
        const insertValues = jobsToProcess.map((job, index) => {
            const valueIndex = index * 6;
            return `($${valueIndex + 1}, ST_SetSRID(ST_MakePoint($${valueIndex + 2}, $${valueIndex + 3}), 4326), $${valueIndex + 4}, $${valueIndex + 5}, $${valueIndex + 6})`;
        }).join(', ');

        const insertParams = jobsToProcess.flatMap(job => [
            job.vehicleId, 
            job.lng, 
            job.lat, 
            job.speed, 
            job.heading,
            job.recordedAt || new Date().toISOString()
        ]);

        // 2. Prepare Bulk Update for vehicle status
        const updateValues = jobsToProcess.map((job, index) => {
            const valueIndex = index * 3;
            return `($${valueIndex + 1}::integer, $${valueIndex + 2}, $${valueIndex + 3}::integer)`;
        }).join(', ');
        const updateParams = jobsToProcess.flatMap(job => [job.vehicleId, job.status, job.version]);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Bulk Insert Locations
            await client.query(`
                INSERT INTO vehicle_locations (vehicle_id, location, speed, heading, recorded_at)
                VALUES ${insertValues}
            `, insertParams);

            // Bulk Update Vehicle Statuses
            await client.query(`
                UPDATE vehicles
                SET status = v.new_status, last_updated = NOW(), version = v.version + 1
                FROM (VALUES ${updateValues}) AS v(id, new_status, version)
                WHERE vehicles.id = v.id AND vehicles.version = v.version
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