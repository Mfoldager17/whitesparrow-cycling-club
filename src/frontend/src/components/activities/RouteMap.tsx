'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackPoint {
  lat: number;
  lng: number;
  ele: number;
  distanceKm: number;
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface RouteMapProps {
  trackPoints: TrackPoint[];
  boundingBox: BoundingBox;
}

function FitBounds({ boundingBox }: { boundingBox: BoundingBox }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [boundingBox.minLat, boundingBox.minLng],
        [boundingBox.maxLat, boundingBox.maxLng],
      ],
      { padding: [20, 20] },
    );
  }, [map, boundingBox]);
  return null;
}

export default function RouteMap({ trackPoints, boundingBox }: RouteMapProps) {
  const positions: [number, number][] = trackPoints.map((p) => [p.lat, p.lng]);
  const center: [number, number] = [
    (boundingBox.minLat + boundingBox.maxLat) / 2,
    (boundingBox.minLng + boundingBox.maxLng) / 2,
  ];

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-80 w-full rounded-xl z-0"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: '#e85d04', weight: 3, opacity: 0.85 }}
      />
      <FitBounds boundingBox={boundingBox} />
    </MapContainer>
  );
}
