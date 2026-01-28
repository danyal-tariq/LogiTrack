'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LocationUpdate, TrackedVehicle, FleetStats, VehicleStatus } from '@/types/vehicle';
import { Map as LeafletMap, Marker, DivIcon } from 'leaflet';

// Dynamic Leaflet import
let L: typeof import('leaflet') | null = null;

interface VehicleMarkerData {
  id: string;
  marker: Marker;
  lastUpdate: number;
  data: TrackedVehicle;
}

interface UseVehicleMarkersOptions {
  map: LeafletMap | null;
  selectedVehicleId?: string | null;
  isFollowing?: boolean;
  onMarkerClick?: (vehicleId: string) => void;
}

interface UseVehicleMarkersReturn {
  updateVehicle: (update: LocationUpdate) => void;
  clearAllMarkers: () => void;
  vehicles: Map<string, TrackedVehicle>;
  stats: FleetStats;
  centerOnVehicle: (vehicleId: string) => void;
}

function createVehicleIcon(status: VehicleStatus, isSelected: boolean): DivIcon {
  const statusClass = status;
  const selectedClass = isSelected ? 'selected' : '';
  
  return L!.divIcon({
    className: `vehicle-marker ${statusClass} ${selectedClass}`,
    html: `
      <div class="vehicle-marker-inner">
        <img src="/truck-icon.png" alt="truck" style="width: 100%; height: 100%; object-fit: contain; rotate: -90deg;" />
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 0],
    popupAnchor: [0, -16],
  });
}

function createPopupContent(vehicle: TrackedVehicle): string {
  const statusLabels: Record<VehicleStatus, string> = {
    moving: 'Moving',
    idling: 'Idling',
    stopped: 'Stopped',
  };

  return `
    <div class="vehicle-popup">
      <h3>🚛 Vehicle ${vehicle.id}</h3>
      <div class="stat-row">
        <span class="stat-label">Status</span>
        <span class="status-badge ${vehicle.status}">${statusLabels[vehicle.status]}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Speed</span>
        <span class="stat-value">${vehicle.speed.toFixed(1)} km/h</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Heading</span>
        <span class="stat-value">${vehicle.heading}°</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Updated</span>
        <span class="stat-value">${new Date(vehicle.lastUpdate).toLocaleTimeString()}</span>
      </div>
    </div>
  `;
}

function calculateStats(vehicles: Map<string, TrackedVehicle>): FleetStats {
  const stats: FleetStats = {
    total: vehicles.size,
    moving: 0,
    idling: 0,
    stopped: 0,
    avgSpeed: 0,
    maxSpeed: 0,
  };

  let totalSpeed = 0;

  vehicles.forEach((v) => {
    if (v.status === 'moving') stats.moving++;
    else if (v.status === 'idling') stats.idling++;
    else stats.stopped++;

    totalSpeed += v.speed;
    if (v.speed > stats.maxSpeed) stats.maxSpeed = v.speed;
  });

  stats.avgSpeed = stats.total > 0 ? totalSpeed / stats.total : 0;

  return stats;
}

export function useVehicleMarkers({
  map,
  selectedVehicleId,
  isFollowing,
  onMarkerClick,
}: UseVehicleMarkersOptions): UseVehicleMarkersReturn {
  const markersRef = useRef<Map<string, VehicleMarkerData>>(new Map());
  const vehiclesRef = useRef<Map<string, TrackedVehicle>>(new Map());
  const [vehicles, setVehicles] = useState<Map<string, TrackedVehicle>>(new Map());
  const [stats, setStats] = useState<FleetStats>({
    total: 0,
    moving: 0,
    idling: 0,
    stopped: 0,
    avgSpeed: 0,
    maxSpeed: 0,
  });
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const updateQueueRef = useRef<Map<string, LocationUpdate>>(new Map());
  const rafRef = useRef<number | undefined>(undefined);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !L) {
      import('leaflet').then((leaflet) => {
        L = leaflet.default;
        setLeafletLoaded(true);
      });
    } else if (L) {
      setLeafletLoaded(true);
    }
  }, []);

  // Process updates at 60fps
  useEffect(() => {
    if (!map || !leafletLoaded) return;

    const processUpdates = () => {
      if (updateQueueRef.current.size === 0) {
        rafRef.current = requestAnimationFrame(processUpdates);
        return;
      }

      const now = Date.now();
      const updates = Array.from(updateQueueRef.current.values());
      updateQueueRef.current.clear();

      let hasChanges = false;

      updates.forEach((update) => {
        const vehicleId = update.vehicle_id;
        const status: VehicleStatus = (update.status as VehicleStatus) || 
          (update.speed > 5 ? 'moving' : update.speed > 0 ? 'idling' : 'stopped');

        const vehicleData: TrackedVehicle = {
          id: vehicleId,
          latitude: update.latitude,
          longitude: update.longitude,
          speed: update.speed,
          heading: update.heading,
          status,
          lastUpdate: now,
        };

        vehiclesRef.current.set(vehicleId, vehicleData);
        hasChanges = true;

        const existingMarker = markersRef.current.get(vehicleId);
        const isSelected = vehicleId === selectedVehicleId;

        if (existingMarker) {
          // Update existing marker
          existingMarker.marker.setLatLng([update.latitude, update.longitude]);
          existingMarker.marker.setIcon(createVehicleIcon(status, isSelected));
          existingMarker.marker.setPopupContent(createPopupContent(vehicleData));
          
          // Rotate marker using CSS transform on the icon element
          const iconElement = existingMarker.marker.getElement();
          if (iconElement) {
            const innerDiv = iconElement.querySelector('.vehicle-marker-inner');
            if (innerDiv) {
              (innerDiv as HTMLElement).style.transform = `rotate(${update.heading}deg)`;
            }
          }

          existingMarker.lastUpdate = now;
          existingMarker.data = vehicleData;
        } else {
          // Create new marker
          if (!L) return; // Safety check
          
          const marker = L.marker([update.latitude, update.longitude], {
            icon: createVehicleIcon(status, isSelected),
            zIndexOffset: isSelected ? 1000 : 0,
          });

          marker.addTo(map);
          marker.bindPopup(createPopupContent(vehicleData));

          // Add click handler
          marker.on('click', () => {
            if (onMarkerClick) {
              onMarkerClick(vehicleId);
            }
          });

          markersRef.current.set(vehicleId, {
            id: vehicleId,
            marker,
            lastUpdate: now,
            data: vehicleData,
          });
        }

        // Follow selected vehicle
        if (isFollowing && vehicleId === selectedVehicleId) {
          map.panTo([update.latitude, update.longitude], { animate: true, duration: 0.5 });
        }
      });

      if (hasChanges) {
        setVehicles(new Map(vehiclesRef.current));
        setStats(calculateStats(vehiclesRef.current));
      }

      rafRef.current = requestAnimationFrame(processUpdates);
    };

    rafRef.current = requestAnimationFrame(processUpdates);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [map, leafletLoaded, selectedVehicleId, isFollowing, onMarkerClick]);

  // Update selected vehicle marker appearance
  useEffect(() => {
    if (!leafletLoaded) return;

    markersRef.current.forEach((markerData) => {
      const isSelected = markerData.id === selectedVehicleId;
      markerData.marker.setIcon(createVehicleIcon(markerData.data.status, isSelected));
      markerData.marker.setZIndexOffset(isSelected ? 1000 : 0);
    });
  }, [selectedVehicleId, leafletLoaded]);

  const updateVehicle = useCallback((update: LocationUpdate) => {
    updateQueueRef.current.set(update.vehicle_id, update);
  }, []);

  const clearAllMarkers = useCallback(() => {
    if (map && leafletLoaded) {
      markersRef.current.forEach(({ marker }) => marker.remove());
    }
    markersRef.current.clear();
    vehiclesRef.current.clear();
    updateQueueRef.current.clear();
    setVehicles(new Map());
    setStats({
      total: 0,
      moving: 0,
      idling: 0,
      stopped: 0,
      avgSpeed: 0,
      maxSpeed: 0,
    });
  }, [map, leafletLoaded]);

  const centerOnVehicle = useCallback(
    (vehicleId: string) => {
      const markerData = markersRef.current.get(vehicleId);
      if (markerData && map) {
        map.flyTo([markerData.data.latitude, markerData.data.longitude], 15, {
          animate: true,
          duration: 1,
        });
      }
    },
    [map]
  );

  // Cleanup on unmount
  useEffect(() => {
    const markers = markersRef.current;
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (map && leafletLoaded) {
        markers.forEach(({ marker }) => marker.remove());
        markers.clear();
      }
    };
  }, [map, leafletLoaded]);

  return {
    updateVehicle,
    clearAllMarkers,
    vehicles,
    stats,
    centerOnVehicle,
  };
}
