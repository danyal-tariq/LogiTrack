import axios from 'axios';
import * as colors from 'colors';

export interface LocationUpdate {
    vehicleId: number;
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    status: 'moving' | 'idling' | 'stopped';
    version: number;
    recordedAt: string;
}

export class VirtualTruck {
    private vehicleId: number;
    private lat: number;
    private lng: number;
    private speed: number; // km/h
    private heading: number; // degrees 0-359
    private version: number = 0;
    private apiUrl: string;
    private status: 'moving' | 'idling' | 'stopped' = 'moving';

    constructor(id: number, startLat: number, startLng: number, apiUrl: string) {
        this.vehicleId = id;
        this.lat = startLat;
        this.lng = startLng;
        this.speed = Math.floor(Math.random() * 60) + 40; // 40-100 km/h
        this.heading = Math.floor(Math.random() * 360);
        this.apiUrl = apiUrl;
    }

    /**
     * Updates position based on speed and heading.
     * Uses a simplified Euclidean approximation for movement.
     * 1 degree of latitude is ~111km.
     * 1 degree of longitude depends on latitude, at 25N it's ~100km.
     */
    public move(seconds: number) {
        if (this.status === 'idling' || this.status === 'stopped') return;

        const distanceKm = (this.speed * seconds) / 3600;
        
        // Convert heading to radians
        const radians = (this.heading * Math.PI) / 180;

        // Calculate delta lat/lng
        const deltaLat = (distanceKm * Math.cos(radians)) / 111;
        const deltaLng = (distanceKm * Math.sin(radians)) / (111 * Math.cos((this.lat * Math.PI) / 180));

        this.lat += deltaLat;
        this.lng += deltaLng;

        // Randomly change heading slightly to simulate realistic driving
        this.heading += (Math.random() * 10 - 5);
        if (this.heading < 0) this.heading += 360;
        if (this.heading >= 360) this.heading -= 360;

        // Randomly change speed
        this.speed += (Math.random() * 4 - 2);
        if (this.speed < 10) this.speed = 10;
        if (this.speed > 120) this.speed = 120;
    }

    public async report() {
        this.version++; // Increment version for Optimistic Locking
        
        const payload: LocationUpdate = {
            vehicleId: this.vehicleId,
            lat: Number(this.lat.toFixed(6)),
            lng: Number(this.lng.toFixed(6)),
            speed: Number(this.speed.toFixed(1)),
            heading: Math.floor(this.heading),
            status: this.status,
            version: this.version,
            recordedAt: new Date().toISOString()
        };

        try {
            await axios.post(`${this.apiUrl}/vehicle/location`, payload);
            console.log(colors.green(`[${this.vehicleId}] Reported: ${payload.lat}, ${payload.lng} (v${payload.version})`));
        } catch (error: any) {
            console.error(colors.red(`[${this.vehicleId}] Failed to report: ${error.message}`));
            // On conflict (409/400), we might need to sync version in a real system, 
            // but for simulation, we'll just keep incrementing.
        }
    }

    public startSimulation(intervalMs: number) {
        setInterval(async () => {
            this.move(intervalMs / 1000);
            await this.report();
        }, intervalMs);
    }
}
