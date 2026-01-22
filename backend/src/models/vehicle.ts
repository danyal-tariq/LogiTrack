import { z } from 'zod';

export interface Vehicle {
  id: number;
  license_plate: string;
  vehicle_type: string;
  status: 'active' | 'inactive' | 'maintenance';
  last_updated?: Date;
}

export const LocationUpdateSchema = z.object({
  vehicleId: z.number().int().positive(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0),
  status: z.string().min(1)
});

export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;
