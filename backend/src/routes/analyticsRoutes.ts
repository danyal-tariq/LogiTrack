import { Router } from 'express';
import { getDailyStats } from '../controllers/analyticsController';

const analyticsRouter = Router();

analyticsRouter.get('/stats', getDailyStats);

export default analyticsRouter;
