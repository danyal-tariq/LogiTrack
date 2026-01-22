import { Router } from 'express';
import { updateLocation } from '../controllers/vehicleController';
import { Server } from 'socket.io';

const vehicleRouter = (io: Server) => {
  const router = Router();

  router.post('/location', (req, res) => updateLocation(req, res, io));

  return router;
};

export default vehicleRouter;
