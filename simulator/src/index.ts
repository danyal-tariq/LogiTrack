import { VirtualTruck } from './truck';
import * as dotenv from 'dotenv';
import * as colors from 'colors';

dotenv.config();

const TRUCK_COUNT = 500;
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
// Tick every 2 seconds to simulate high frequent updates across many units
const REPORT_INTERVAL_MS = 2000; 

// Initial coordinates around Dubai Downtown
const DUBAI_LAT = 25.1972;
const DUBAI_LNG = 55.2744;

async function runSimulator() {
    console.log(colors.cyan.bold(`Starting Logitrack Simulator with ${TRUCK_COUNT} vehicles...`));
    console.log(colors.cyan(`Target API: ${API_URL}`));

    const fleet: VirtualTruck[] = [];

    for (let i = 1; i <= TRUCK_COUNT; i++) {
        const vehicleId = i;
        
        // Slightly randomize starting positions so they aren't all in one spot
        const startLat = DUBAI_LAT + (Math.random() * 0.1 - 0.05);
        const startLng = DUBAI_LNG + (Math.random() * 0.1 - 0.05);

        const truck = new VirtualTruck(vehicleId, startLat, startLng, API_URL);
        fleet.push(truck);

        // JITTER: Stagger the start of each truck within the interval window
        // to prevent all 500 requests hitting the server at the exact same millisecond.
        const staggerDelay = Math.floor(Math.random() * REPORT_INTERVAL_MS);
        
        setTimeout(() => {
            console.log(colors.gray(`[SYSTEM] Starting heartbeat for Vehicle ${vehicleId}`));
            truck.startSimulation(REPORT_INTERVAL_MS);
        }, staggerDelay);
    }

    console.log(colors.green.bold(`✅ All ${TRUCK_COUNT} vehicles initialized and staggered.`));
}

runSimulator().catch(err => {
    console.error(colors.red('Simulator crashed:'), err);
});
