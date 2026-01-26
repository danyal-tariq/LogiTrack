import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Stress test: Push system beyond normal capacity to find breaking point
export const options = {
    stages: [
        { duration: '1m', target: 1000 },   // Baseline
        { duration: '2m', target: 2000 },   // Double the load
        { duration: '2m', target: 3000 },   // Triple the load
        { duration: '2m', target: 4000 },   // Quadruple - find breaking point
        { duration: '1m', target: 0 },      // Recovery
    ],
    thresholds: {
        'http_req_duration': ['p(95)<1000'], // More lenient for stress test
        'http_req_failed': ['rate<0.10'],    // Allow up to 10% failures
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
        'response received': (r) => r.status !== 0,
    });
    
    errorRate.add(!success);
}