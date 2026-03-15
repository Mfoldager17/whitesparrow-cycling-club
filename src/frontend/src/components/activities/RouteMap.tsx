'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { StyleSpecification } from 'maplibre-gl';

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

type MapStyle = 'standard' | 'satellite' | 'cycling' | 'terrain';

// ─── Map style definitions using free raster tile providers ──────────────────

function rasterStyle(tiles: string[], attribution: string): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      base: { type: 'raster', tiles, tileSize: 256, attribution },
    },
    layers: [{ id: 'base-tiles', type: 'raster', source: 'base' }],
  };
}

const STYLES: Record<MapStyle, { label: string; icon: string; style: StyleSpecification }> = {
  standard: {
    label: 'Kort',
    icon: '🗺️',
    style: rasterStyle(
      ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    ),
  },
  satellite: {
    label: 'Satellit',
    icon: '🛰️',
    style: rasterStyle(
      [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      'Tiles © Esri — Source: Esri, USDA, USGS, AEX, GeoEye, Getmapping, IGN',
    ),
  },
  cycling: {
    label: 'Cykling',
    icon: '🚴',
    style: rasterStyle(
      [
        'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      ],
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, <a href="https://www.cyclosm.org" target="_blank">CyclOSM</a>',
    ),
  },
  terrain: {
    label: 'Terrain',
    icon: '⛰️',
    style: rasterStyle(
      ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, © <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>',
    ),
  },
};

// ─── Slope colour scale (cyclist-friendly) ───────────────────────────────────

function slopeColor(pct: number): string {
  if (pct <= -8) return '#1d4ed8'; // steep descent
  if (pct <= -3) return '#60a5fa'; // gentle descent
  if (pct <= 1)  return '#22c55e'; // flat
  if (pct <= 4)  return '#facc15'; // easy climb
  if (pct <= 8)  return '#f97316'; // moderate climb
  return '#dc2626';                 // steep climb
}

const SLOPE_LEGEND = [
  { color: '#1d4ed8', label: '< −8 %  (stejlt ned)' },
  { color: '#60a5fa', label: '−8 til −3 %' },
  { color: '#22c55e', label: '−3 til 1 %  (flad)' },
  { color: '#facc15', label: '1 til 4 %' },
  { color: '#f97316', label: '4 til 8 %' },
  { color: '#dc2626', label: '> 8 %  (stejlt op)' },
];

// ─── GeoJSON helpers ─────────────────────────────────────────────────────────

type RouteGeoJSON = GeoJSON.FeatureCollection<GeoJSON.LineString, {
  color: string;
  slope: number;
  elevStart: number;
  elevEnd: number;
  distKm: number;
}>;

function buildRouteGeoJSON(pts: TrackPoint[]): RouteGeoJSON {
  const features: RouteGeoJSON['features'] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const distM = (b.distanceKm - a.distanceKm) * 1000;
    const slope = distM > 0.5 ? ((b.ele - a.ele) / distM) * 100 : 0;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
      },
      properties: {
        color: slopeColor(slope),
        slope: Math.round(slope * 10) / 10,
        elevStart: Math.round(a.ele),
        elevEnd: Math.round(b.ele),
        distKm: Math.round(a.distanceKm * 10) / 10,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

// ─── Add/refresh route layers on the map ─────────────────────────────────────

let activePopup: maplibregl.Popup | null = null;

function attachRouteLayers(map: maplibregl.Map, pts: TrackPoint[]) {
  const data = buildRouteGeoJSON(pts);

  if (map.getSource('route')) {
    (map.getSource('route') as maplibregl.GeoJSONSource).setData(data);
    return;
  }

  map.addSource('route', { type: 'geojson', data });

  // Drop shadow for legibility on all basemaps
  map.addLayer({
    id: 'route-shadow',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 4 },
  });

  // Main slope-coloured route
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 14, 5, 18, 8],
    },
  });

  // Hover highlight
  map.addLayer({
    id: 'route-hover',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#fff',
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 8, 18, 12],
      'line-opacity': 0,
    },
    filter: ['==', '$type', 'LineString'],
  });

  // ── Hover interactions ──
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: '220px',
    className: 'route-popup',
  });
  activePopup = popup;

  map.on('mouseenter', 'route-line', () => {
    map.getCanvas().style.cursor = 'crosshair';
  });

  map.on('mouseleave', 'route-line', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
    map.setPaintProperty('route-hover', 'line-opacity', 0);
  });

  map.on('mousemove', 'route-line', (e) => {
    if (!e.features?.length) return;
    const p = e.features[0].properties as RouteGeoJSON['features'][0]['properties'];
    const slopeDir = p.slope > 0 ? '↑' : p.slope < 0 ? '↓' : '→';
    const slopeAbs = Math.abs(p.slope);

    map.setPaintProperty('route-hover', 'line-opacity', 0.35);

    popup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div style="font-family:system-ui,sans-serif;padding:4px 2px;line-height:1.5">
          <div style="font-weight:700;font-size:13px;color:#1a1a1a">${p.distKm} km</div>
          <div style="font-size:12px;color:#555">Højde: <strong>${p.elevStart} m</strong></div>
          <div style="font-size:12px;color:#555">${slopeDir} Hældning: <strong style="color:${p.color}">${slopeAbs}%</strong></div>
        </div>`,
      )
      .addTo(map);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RouteMap({ trackPoints, boundingBox }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initializedRef = useRef(false);
  // Tracks whether the initial style is already set via the map constructor
  const styleReadyRef = useRef(false);
  const [activeStyle, setActiveStyle] = useState<MapStyle>('standard');
  const [legendOpen, setLegendOpen] = useState(false);

  const bounds: maplibregl.LngLatBoundsLike = [
    [boundingBox.minLng, boundingBox.minLat],
    [boundingBox.maxLng, boundingBox.maxLat],
  ];

  // ── Initial map setup ──
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.standard.style,
      bounds,
      fitBoundsOptions: { padding: 50, maxZoom: 16 },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.FullscreenControl(), 'top-left');

    // ── Start marker ──
    const startEl = document.createElement('div');
    startEl.style.cssText =
      'width:14px;height:14px;border-radius:50%;background:#16a34a;border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)';
    new maplibregl.Marker({ element: startEl })
      .setLngLat([trackPoints[0].lng, trackPoints[0].lat])
      .setPopup(
        new maplibregl.Popup({ offset: 14 }).setHTML(
          `<strong style="font-size:13px">🚵 Start</strong><br/><span style="font-size:12px;color:#555">${Math.round(trackPoints[0].ele)} m</span>`,
        ),
      )
      .addTo(map);

    // ── End marker ──
    const endEl = document.createElement('div');
    endEl.style.cssText =
      'width:14px;height:14px;border-radius:50%;background:#dc2626;border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)';
    new maplibregl.Marker({ element: endEl })
      .setLngLat([trackPoints[trackPoints.length - 1].lng, trackPoints[trackPoints.length - 1].lat])
      .setPopup(
        new maplibregl.Popup({ offset: 14 }).setHTML(
          `<strong style="font-size:13px">🏁 Slut</strong><br/><span style="font-size:12px;color:#555">${Math.round(trackPoints[trackPoints.length - 1].ele)} m</span>`,
        ),
      )
      .addTo(map);

    map.once('load', () => {
      attachRouteLayers(map, trackPoints);
      styleReadyRef.current = true;
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
      styleReadyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Style switching – re-attach route after new style loads ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // On first render the style is already set in the map constructor – skip to avoid
    // "Style is not done loading" conflict. Only switch style on subsequent changes.
    if (!styleReadyRef.current) return;

    const apply = () => {
      map.setStyle(STYLES[activeStyle].style);
      map.once('idle', () => attachRouteLayers(map, trackPoints));
    };

    // If the map is still busy (e.g. previous switch), wait for it
    if (!map.loaded()) {
      map.once('load', apply);
      return () => { map.off('load', apply); };
    }

    apply();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyle]);

  return (
    <div className="relative h-[28rem] w-full rounded-xl overflow-hidden shadow-md">
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {/* ── Style switcher ── */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 rounded-lg bg-white/90 p-1 shadow backdrop-blur-sm">
        {(Object.keys(STYLES) as MapStyle[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveStyle(key)}
            title={STYLES[key].label}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              activeStyle === key
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {STYLES[key].icon} {STYLES[key].label}
          </button>
        ))}
      </div>

      {/* ── Slope legend (collapsible) ── */}
      <div className="absolute bottom-8 right-2 z-10">
        <button
          onClick={() => setLegendOpen((o) => !o)}
          className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-gray-700 shadow backdrop-blur-sm hover:bg-white"
        >
          <span>🏔️ Hældning</span>
          <span className="ml-1 text-gray-400">{legendOpen ? '▲' : '▼'}</span>
        </button>
        {legendOpen && (
          <div className="mt-1 rounded-lg bg-white/95 p-2 shadow backdrop-blur-sm">
            {SLOPE_LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 py-0.5">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
