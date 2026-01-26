import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Soak test: Extended duration to detect memory leaks and degradation
export const options = {
    stages: [
        { duration: '2m', target: 1000 },   // Ramp up
        { duration: '10m', target: 1000 },  // Sustain for 10 minutes
        { duration: '1m', target: 0 },      // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<400', 'p(99)<600'],
        'http_req_failed': ['rate<0.01'],
        'errors': ['rate<0.05'],
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
        'response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!success);
}