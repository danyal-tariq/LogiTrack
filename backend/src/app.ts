import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import vehicleRouter from './routes/vehicleRoutes';
import analyticsRouter from './routes/analyticsRoutes';
import logger from './config/logger';

//Workers
import './workers/locationWorker';
//Queues
import './queues/locationQueue';
//Shutdown handlers
import './utils/shutdown';
//Services
import { refreshDailyStats } from './services/analyticsService';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
})

app.use(cors())
app.use(express.json());

// Main status route
app.get('/', (req, res) => {
    res.send('LogiTrack Backend is running');
});

// Mounted routes
app.use('/api/vehicle', vehicleRouter(io));
app.use('/api/analytics', analyticsRouter);

// Start analytics refresh interval
setInterval(refreshDailyStats, 15 * 60 * 1000);

io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'A user connected');
})

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    logger.info(`🚀 Server is running on port ${PORT}`);
});