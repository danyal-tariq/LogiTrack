import { Router, Request, Response } from 'express';
import pool from '../config/db';
import logger from '../config/logger';

const router = Router();

interface GeofenceCreateBody {
  name: string;
  description?: string;
  coordinates: [number, number][];
  color?: string;
}

interface GeofenceUpdateBody {
  name?: string;
  description?: string;
  coordinates?: [number, number][];
  color?: string;
}

// GET all geofences
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        ST_AsGeoJSON(geom)::json->'coordinates' as coordinates,
        created_at
      FROM geofences 
      ORDER BY created_at DESC`
    );

    const geofences = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: '', // Not stored in DB
      // GeoJSON returns [lng, lat], convert to [lat, lng] for frontend
      coordinates: row.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]),
      color: '#2563eb', // Default color
      created_at: row.created_at,
      updated_at: row.created_at, // Use created_at as fallback
    }));

    res.json(geofences);
  } catch (error) {
    logger.error({ error }, 'Error fetching geofences');
    res.status(500).json({ error: 'Failed to fetch geofences' });
  }
});

// GET single geofence by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        ST_AsGeoJSON(geom)::json->'coordinates' as coordinates,
        created_at
      FROM geofences 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const row = result.rows[0];
    const geofence = {
      id: row.id,
      name: row.name,
      description: '', // Not stored in DB
      // GeoJSON returns [lng, lat], convert to [lat, lng] for frontend
      coordinates: row.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]),
      color: '#2563eb', // Default color
      created_at: row.created_at,
      updated_at: row.created_at, // Use created_at as fallback
    };

    res.json(geofence);
  } catch (error) {
    logger.error({ error, geofenceId: req.params.id }, 'Error fetching geofence');
    res.status(500).json({ error: 'Failed to fetch geofence' });
  }
});

// POST create new geofence
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, coordinates, color } = req.body as GeofenceCreateBody;

    logger.info({ 
      receivedCoordinates: coordinates,
      firstPoint: coordinates?.[0],
      note: 'Expecting [lat, lng] format - Dubai should be [~25, ~55]'
    }, 'Received geofence creation request');

    // Validate input
    if (!name || !coordinates || coordinates.length < 3) {
      return res.status(400).json({ 
        error: 'Name and coordinates (at least 3 points) are required' 
      });
    }

    // Close the polygon if not already closed
    const polygonCoords = [...coordinates];
    const firstPoint = polygonCoords[0];
    const lastPoint = polygonCoords[polygonCoords.length - 1];
    if (firstPoint && lastPoint && (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1])) {
      polygonCoords.push(firstPoint);
    }

    // Convert coordinates to PostGIS polygon format
    // PostGIS expects (lng, lat) but we receive [lat, lng]
    const polygonWKT = `POLYGON((${polygonCoords.map(([lat, lng]) => `${lng} ${lat}`).join(', ')}))`;
    logger.info({ polygonWKT }, 'Created WKT polygon');

    const result = await pool.query(
      `INSERT INTO geofences (name, geom)
       VALUES ($1, ST_GeomFromText($2, 4326))
       RETURNING id, name, 
                 ST_AsGeoJSON(geom)::json->'coordinates' as coordinates,
                 created_at`,
      [name, polygonWKT]
    );

    const row = result.rows[0];
    
    logger.info({ 
      rawCoordinates: row.coordinates,
      firstRawPoint: row.coordinates[0]?.[0],
      note: 'Raw from PostGIS - should be [lng, lat] format'
    }, 'Raw coordinates from database');

    const convertedCoordinates = row.coordinates[0].map(([lng, lat]: [number, number]) => {
      console.log(`Converting: [${lng}, ${lat}] (lng,lat) -> [${lat}, ${lng}] (lat,lng)`);
      return [lat, lng];
    });

    logger.info({
      convertedFirst: convertedCoordinates[0],
      note: 'After conversion - should be [lat, lng] format for Leaflet'
    }, 'Converted coordinates');

    const geofence = {
      id: row.id,
      name: row.name,
      description: description || '', // Return the requested description (client-side only)
      coordinates: convertedCoordinates,
      color: color || '#2563eb', // Return the requested color (client-side only)
      created_at: row.created_at,
      updated_at: row.created_at, // Use created_at as fallback
    };

    logger.info({ geofenceId: geofence.id, name: geofence.name, returnedCoordinates: geofence.coordinates[0] }, 'Geofence created - final response');
    res.status(201).json(geofence);
  } catch (error) {
    logger.error({ error }, 'Error creating geofence');
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

// PUT update geofence
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, coordinates, color } = req.body as GeofenceUpdateBody;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (coordinates !== undefined && coordinates.length >= 3) {
      const polygonCoords = [...coordinates];
      const firstPoint = polygonCoords[0];
      const lastPoint = polygonCoords[polygonCoords.length - 1];
      if (firstPoint && lastPoint && (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1])) {
        polygonCoords.push(firstPoint);
      }

      const polygonWKT = `POLYGON((${polygonCoords.map(([lat, lng]) => `${lng} ${lat}`).join(', ')}))`;
      updates.push(`geom = ST_GeomFromText($${paramCount++}, 4326)`);
      values.push(polygonWKT);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE geofences 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, 
                 ST_AsGeoJSON(geom)::json->'coordinates' as coordinates,
                 created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const row = result.rows[0];
    const geofence = {
      id: row.id,
      name: row.name,
      description: description || '', // Return requested description (client-side only)
      // GeoJSON returns [lng, lat], convert to [lat, lng] for frontend
      coordinates: row.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]),
      color: color || '#2563eb', // Return requested color (client-side only)
      created_at: row.created_at,
      updated_at: row.created_at, // Use created_at as fallback
    };

    logger.info({ geofenceId: geofence.id }, 'Geofence updated');
    res.json(geofence);
  } catch (error) {
    logger.error({ error, geofenceId: req.params.id }, 'Error updating geofence');
    res.status(500).json({ error: 'Failed to update geofence' });
  }
});

// DELETE geofence
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM geofences WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    logger.info({ geofenceId: id, name: result.rows[0].name }, 'Geofence deleted');
    res.json({ message: 'Geofence deleted successfully', id: result.rows[0].id });
  } catch (error) {
    logger.error({ error, geofenceId: req.params.id }, 'Error deleting geofence');
    res.status(500).json({ error: 'Failed to delete geofence' });
  }
});

export default router;
