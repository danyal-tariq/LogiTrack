'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { Map as LeafletMap } from 'leaflet';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMapReady?: (map: LeafletMap) => void;
}

interface MapContainer extends HTMLDivElement {
  dataset: DOMStringMap & { leafletInitialized?: string };
}

export default function Map({
  center = [25.2048, 55.2708], // Dubai coordinates
  zoom = 12,
  className = 'h-screen w-full',
  onMapReady,
}: MapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const containerElement = mapContainerRef.current;

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      // Fix default icon issue with webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Prevent double-initialization (React StrictMode/dev fast refresh)
      const container = containerElement as MapContainer;
      if (container.dataset?.leafletInitialized === 'true') {
        // If already initialized, avoid creating a new map
        return;
      }

      // Initialize map
      const map = L.map(container).setView(center, zoom);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      // mark container as initialized so repeated mounts won't re-create map
      try {
        const mapContainer = containerElement as MapContainer;
        mapContainer.dataset.leafletInitialized = 'true';
      } catch {
        // ignore
      }

      if (onMapReady) {
        onMapReady(map);
      }
    });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      // clear initialized flag so future mounts can recreate map
      try {
        const mapContainer = containerElement as MapContainer;
        if (mapContainer.dataset) {
          delete mapContainer.dataset.leafletInitialized;
        }
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mapContainerRef} className={className} />;
}
