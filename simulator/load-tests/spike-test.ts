import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Spike test: Sudden traffic bursts to test system recovery
export const options = {
    stages: [
        { duration: '30s', target: 100 },   // Normal load
        { duration: '10s', target: 2000 },  // SPIKE! 20x increase
        { duration: '1m', target: 100 },    // Recovery period
        { duration: '10s', target: 3000 },  // Bigger spike!
        { duration: '1m', target: 100 },    // Recovery
        { duration: '10s', target: 4000 },  // Maximum spike
        { duration: '2m', target: 100 },    // Final recovery
        { duration: '30s', target: 0 },     // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<2000'], // Very lenient during spikes
        'http_req_failed': ['rate<0.15'],    // Allow up to 15% failures
    },
};

export default function () {
    const vehicleId = Math.floor(Math.random() * 500) + 1;
    
    const payload = JSON.stringify({
        vehicleId: vehicleId,
        lat: 25.1972 + (Math.random() * 0.1 - 0.05),
        lng: 55.2744 + (Math.random() * 0.1 - 0.05),
        speed: Math.floor(Math.random() * 80) + 20,
        heading: Math.floor(Math.random() * 360),
        status: 'moving',
        version: Math.floor(Math.random() * 100),
        recordedAt: new Date().toISOString()
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post('http://localhost:4000/api/vehicle/location', payload, params);
    
    const success = check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'no timeout': (r) => r.status !== 0,
    });
    
    errorRate.add(!success);
}