import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 100 },   // Ramp up to 100 RPS
        { duration: '1m', target: 500 },    // Ramp up to 500 RPS
        { duration: '2m', target: 1000 },   // Reach target 1000 RPS
        { duration: '3m', target: 1000 },   // Sustain 1000 RPS
        { duration: '30s', target: 0 },     // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<350', 'p(99)<500'],  // 95% < 350ms, 99% < 500ms
        'http_req_failed': ['rate<0.01'],                  // Less than 1% errors
        'errors': ['rate<0.05'],                           // Less than 5% app errors
    },
};

// Test data
export default function () {
    const vehicleId = Math.floor(Math.random() * 500) + 1;  // Random vehicle 1-500
    
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
    
    // Validations
    const success = check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!success);
}