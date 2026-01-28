/**
 * Dubai Road Routes - Real road coordinates for realistic fleet simulation
 * Routes are based on actual Dubai roads and highways
 */

export interface Waypoint {
    lat: number;
    lng: number;
    name: string;
    speedLimit: number; // km/h
    stopDuration?: number; // seconds to stop (for deliveries, traffic lights)
}

export interface Route {
    id: string;
    name: string;
    type: 'highway' | 'urban' | 'industrial' | 'delivery';
    waypoints: Waypoint[];
    loop: boolean; // Whether to loop back to start
}

// Dubai road routes based on real coordinates
export const DUBAI_ROUTES: Route[] = [
    // Route 1: Sheikh Zayed Road (E11) - Main Highway
    {
        id: 'szr-north',
        name: 'Sheikh Zayed Road - Northbound',
        type: 'highway',
        loop: true,
        waypoints: [
            { lat: 25.0657, lng: 55.1713, name: 'Dubai Marina', speedLimit: 100 },
            { lat: 25.0847, lng: 55.1498, name: 'Media City', speedLimit: 100 },
            { lat: 25.1012, lng: 55.1672, name: 'Internet City', speedLimit: 100 },
            { lat: 25.1174, lng: 55.1889, name: 'Knowledge Village', speedLimit: 100 },
            { lat: 25.1356, lng: 55.1923, name: 'Dubai Mall Exit', speedLimit: 80 },
            { lat: 25.1543, lng: 55.2134, name: 'Business Bay', speedLimit: 80 },
            { lat: 25.1876, lng: 55.2456, name: 'Trade Centre', speedLimit: 80 },
            { lat: 25.2123, lng: 55.2634, name: 'DIFC', speedLimit: 80 },
            { lat: 25.2345, lng: 55.2812, name: 'Port Rashid', speedLimit: 80 },
            { lat: 25.2567, lng: 55.2923, name: 'Deira', speedLimit: 80 },
        ]
    },
    // Route 2: Al Khail Road (E44) - Parallel Highway
    {
        id: 'alkhail',
        name: 'Al Khail Road',
        type: 'highway',
        loop: true,
        waypoints: [
            { lat: 25.0534, lng: 55.1234, name: 'JLT', speedLimit: 100 },
            { lat: 25.0823, lng: 55.1456, name: 'Sports City Exit', speedLimit: 100 },
            { lat: 25.1123, lng: 55.1678, name: 'Motor City Exit', speedLimit: 100 },
            { lat: 25.1423, lng: 55.2012, name: 'Business Bay Exit', speedLimit: 80 },
            { lat: 25.1756, lng: 55.2345, name: 'Ras Al Khor', speedLimit: 80 },
            { lat: 25.2034, lng: 55.2567, name: 'Dubai Festival City', speedLimit: 80 },
            { lat: 25.2312, lng: 55.3123, name: 'Al Garhoud', speedLimit: 80 },
        ]
    },
    // Route 3: Downtown Delivery Route
    {
        id: 'downtown-delivery',
        name: 'Downtown Dubai Deliveries',
        type: 'delivery',
        loop: true,
        waypoints: [
            { lat: 25.1972, lng: 55.2744, name: 'Dubai Mall - Loading Bay', speedLimit: 40, stopDuration: 120 },
            { lat: 25.2048, lng: 55.2708, name: 'Burj Khalifa Area', speedLimit: 40 },
            { lat: 25.2156, lng: 55.2834, name: 'DIFC - Delivery Point', speedLimit: 40, stopDuration: 90 },
            { lat: 25.1876, lng: 55.2567, name: 'Business Bay - Office Tower', speedLimit: 40, stopDuration: 60 },
            { lat: 25.1789, lng: 55.2489, name: 'Design District', speedLimit: 40, stopDuration: 45 },
            { lat: 25.1923, lng: 55.2612, name: 'City Walk', speedLimit: 40, stopDuration: 60 },
        ]
    },
    // Route 4: Jebel Ali Industrial Route
    {
        id: 'jebel-ali',
        name: 'Jebel Ali Port & Industrial',
        type: 'industrial',
        loop: true,
        waypoints: [
            { lat: 24.9867, lng: 55.0234, name: 'Jebel Ali Port Gate 1', speedLimit: 40, stopDuration: 300 },
            { lat: 24.9734, lng: 55.0567, name: 'Container Terminal', speedLimit: 30, stopDuration: 180 },
            { lat: 24.9612, lng: 55.0789, name: 'Free Zone - Warehouse A', speedLimit: 40, stopDuration: 240 },
            { lat: 24.9489, lng: 55.0912, name: 'Free Zone - Warehouse B', speedLimit: 40, stopDuration: 180 },
            { lat: 24.9345, lng: 55.1123, name: 'Logistics Hub', speedLimit: 40, stopDuration: 120 },
            { lat: 24.9523, lng: 55.0678, name: 'Port Exit', speedLimit: 60 },
        ]
    },
    // Route 5: Dubai Airport Cargo Route
    {
        id: 'dxb-cargo',
        name: 'Dubai Airport Cargo',
        type: 'industrial',
        loop: true,
        waypoints: [
            { lat: 25.2528, lng: 55.3644, name: 'DXB Cargo Village', speedLimit: 30, stopDuration: 600 },
            { lat: 25.2456, lng: 55.3523, name: 'Emirates SkyCargo', speedLimit: 30, stopDuration: 300 },
            { lat: 25.2378, lng: 55.3412, name: 'Cargo Gate', speedLimit: 40 },
            { lat: 25.2234, lng: 55.3234, name: 'Airport Road', speedLimit: 80 },
            { lat: 25.2089, lng: 55.3012, name: 'Al Garhoud Bridge', speedLimit: 80 },
            { lat: 25.2312, lng: 55.3345, name: 'Return to Cargo', speedLimit: 60 },
        ]
    },
    // Route 6: Marina & JBR Urban Route
    {
        id: 'marina-jbr',
        name: 'Marina & JBR',
        type: 'urban',
        loop: true,
        waypoints: [
            { lat: 25.0801, lng: 55.1392, name: 'Marina Mall', speedLimit: 40, stopDuration: 60 },
            { lat: 25.0756, lng: 55.1323, name: 'JBR The Walk', speedLimit: 30, stopDuration: 45 },
            { lat: 25.0834, lng: 55.1412, name: 'Marina Promenade', speedLimit: 30 },
            { lat: 25.0712, lng: 55.1289, name: 'Bluewaters', speedLimit: 40, stopDuration: 90 },
            { lat: 25.0867, lng: 55.1456, name: 'Media City', speedLimit: 60 },
            { lat: 25.0923, lng: 55.1534, name: 'Internet City', speedLimit: 60 },
        ]
    },
    // Route 7: Old Dubai Heritage Route
    {
        id: 'old-dubai',
        name: 'Old Dubai - Deira & Bur Dubai',
        type: 'urban',
        loop: true,
        waypoints: [
            { lat: 25.2697, lng: 55.3095, name: 'Gold Souk', speedLimit: 30, stopDuration: 120 },
            { lat: 25.2634, lng: 55.3012, name: 'Spice Souk', speedLimit: 30, stopDuration: 90 },
            { lat: 25.2589, lng: 55.2967, name: 'Abra Station', speedLimit: 20, stopDuration: 60 },
            { lat: 25.2634, lng: 55.2889, name: 'Al Fahidi', speedLimit: 30, stopDuration: 45 },
            { lat: 25.2556, lng: 55.2934, name: 'Textile Souk', speedLimit: 30, stopDuration: 60 },
            { lat: 25.2612, lng: 55.3056, name: 'Naif Road', speedLimit: 40 },
        ]
    },
    // Route 8: Emirates Road Long Haul
    {
        id: 'emirates-road',
        name: 'Emirates Road (E311)',
        type: 'highway',
        loop: true,
        waypoints: [
            { lat: 25.0234, lng: 55.1123, name: 'Dubai South', speedLimit: 120 },
            { lat: 25.0789, lng: 55.1567, name: 'Sports City', speedLimit: 120 },
            { lat: 25.1234, lng: 55.2012, name: 'Academic City', speedLimit: 120 },
            { lat: 25.1678, lng: 55.2456, name: 'Silicon Oasis', speedLimit: 120 },
            { lat: 25.2123, lng: 55.3234, name: 'Mirdif', speedLimit: 100 },
            { lat: 25.2567, lng: 55.3789, name: 'Sharjah Border', speedLimit: 100 },
        ]
    }
];

/**
 * Get a random route for a vehicle
 */
export function getRandomRoute(): Route {
    return DUBAI_ROUTES[Math.floor(Math.random() * DUBAI_ROUTES.length)];
}

/**
 * Get a route by type
 */
export function getRouteByType(type: Route['type']): Route {
    const routes = DUBAI_ROUTES.filter(r => r.type === type);
    return routes[Math.floor(Math.random() * routes.length)];
}

/**
 * Calculate heading between two points
 */
export function calculateHeading(from: Waypoint, to: Waypoint): number {
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    heading = (heading + 360) % 360;
    
    return heading;
}

/**
 * Calculate distance between two points in km
 */
export function calculateDistance(from: Waypoint, to: Waypoint): number {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}
