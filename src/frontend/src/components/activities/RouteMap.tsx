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
  onHoverDistKm?: (km: number | null) => void;
  hoveredDistKm?: number | null;
  onMapReady?: (moveDot: (km: number | null) => void) => void;
}

type HoverCbRef = { current: ((km: number | null) => void) | undefined };

type MapStyle = 'standard' | 'satellite' | 'cycling' | 'terrain';

// ─── Map style definitions using free raster tile providers ──────────────────

function rasterStyle(tiles: string[], attribution: string, maxzoom?: number): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      base: { type: 'raster', tiles, tileSize: 256, attribution, maxzoom },
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
      19,
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
      19,
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
      19,
    ),
  },
  terrain: {
    label: 'Terrain',
    icon: '⛰️',
    style: rasterStyle(
      ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, © <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>',
      17,
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
        distKm: a.distanceKm,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

// ─── Add/refresh route layers on the map ─────────────────────────────────────

function nearestPoint(pts: TrackPoint[], km: number) {
  return pts.reduce((best, p) =>
    Math.abs(p.distanceKm - km) < Math.abs(best.distanceKm - km) ? p : best,
  );
}

function hoverDetails(pts: TrackPoint[], km: number) {
  let bestIndex = 0;
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i].distanceKm - km) < Math.abs(pts[bestIndex].distanceKm - km)) {
      bestIndex = i;
    }
  }

  const startIndex = Math.min(bestIndex, pts.length - 2);
  const a = pts[startIndex];
  const b = pts[startIndex + 1] ?? a;
  const distM = Math.max((b.distanceKm - a.distanceKm) * 1000, 0);
  const slope = distM > 0.5 ? ((b.ele - a.ele) / distM) * 100 : 0;

  return {
    point: pts[bestIndex],
    distKm: pts[bestIndex].distanceKm,
    elevStart: Math.round(a.ele),
    slope: Math.round(slope * 10) / 10,
    color: slopeColor(slope),
  };
}

function attachRouteLayers(map: maplibregl.Map, pts: TrackPoint[], onHoverRef: HoverCbRef) {
  const data = buildRouteGeoJSON(pts);

  if (!map.getSource('route')) {
    map.addSource('route', { type: 'geojson', data });
  } else {
    (map.getSource('route') as maplibregl.GeoJSONSource).setData(data);
  }

  if (!map.getLayer('route-shadow')) {
    map.addLayer({
      id: 'route-shadow',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 4 },
    });
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
  }

  map.on('mouseenter', 'route-line', () => {
    map.getCanvas().style.cursor = 'crosshair';
  });

  map.on('mouseleave', 'route-line', () => {
    map.getCanvas().style.cursor = '';
    map.setPaintProperty('route-hover', 'line-opacity', 0);
    onHoverRef.current?.(null);
  });

  map.on('mousemove', 'route-line', (e) => {
    if (!e.features?.length) return;
    const p = e.features[0].properties as RouteGeoJSON['features'][0]['properties'];
    map.setPaintProperty('route-hover', 'line-opacity', 0.35);
    onHoverRef.current?.(p.distKm);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RouteMap({ trackPoints, boundingBox, onHoverDistKm, hoveredDistKm, onMapReady }: RouteMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initializedRef = useRef(false);
  const styleReadyRef = useRef(false);
  const styleTransitionRef = useRef(false);
  const appliedStyleRef = useRef<MapStyle>('standard');
  const queuedStyleRef = useRef<MapStyle | null>(null);
  const [activeStyle, setActiveStyle] = useState<MapStyle>('standard');
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoverPointPx, setHoverPointPx] = useState<{ x: number; y: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    distKm: number;
    elevStart: number;
    slope: number;
    color: string;
  } | null>(null);

  const onHoverDistKmRef = useRef(onHoverDistKm);
  useEffect(() => { onHoverDistKmRef.current = onHoverDistKm; }, [onHoverDistKm]);
  const activeStyleRef = useRef(activeStyle);
  useEffect(() => { activeStyleRef.current = activeStyle; }, [activeStyle]);
  const hoveredDistKmRef = useRef<number | null>(hoveredDistKm ?? null);
  useEffect(() => { hoveredDistKmRef.current = hoveredDistKm ?? null; }, [hoveredDistKm]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || hoveredDistKm == null) {
      setHoverPointPx(null);
      setHoverInfo(null);
      return;
    }

    const details = hoverDetails(trackPoints, hoveredDistKm);
    const projected = map.project([details.point.lng, details.point.lat]);
    setHoverPointPx({ x: projected.x, y: projected.y });
    setHoverInfo({
      x: projected.x,
      y: projected.y,
      distKm: details.distKm,
      elevStart: details.elevStart,
      slope: details.slope,
      color: details.color,
    });
  }, [hoveredDistKm]);

  const bounds: maplibregl.LngLatBoundsLike = [
    [boundingBox.minLng, boundingBox.minLat],
    [boundingBox.maxLng, boundingBox.maxLat],
  ];

  function applyStyleChange(map: maplibregl.Map, styleKey: MapStyle) {
    styleTransitionRef.current = true;
    map.setStyle(STYLES[styleKey].style);
    map.once('idle', () => {
      attachRouteLayers(map, trackPoints, onHoverDistKmRef);
      appliedStyleRef.current = styleKey;
      styleReadyRef.current = true;
      styleTransitionRef.current = false;

      if (queuedStyleRef.current && queuedStyleRef.current !== styleKey) {
        const nextStyle = queuedStyleRef.current;
        queuedStyleRef.current = null;
        applyStyleChange(map, nextStyle);
      }
    });
  }

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
    map.addControl(
      new maplibregl.FullscreenControl({ container: wrapperRef.current ?? undefined }),
      'top-left',
    );

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
      attachRouteLayers(map, trackPoints, onHoverDistKmRef);
      appliedStyleRef.current = 'standard';
      styleReadyRef.current = true;

      if (activeStyleRef.current !== appliedStyleRef.current) {
        applyStyleChange(map, activeStyleRef.current);
      }
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

  // ── Style switching ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!styleReadyRef.current) return;

    if (activeStyle === appliedStyleRef.current) return;

    if (styleTransitionRef.current) {
      queuedStyleRef.current = activeStyle;
      return;
    }

    applyStyleChange(map, activeStyle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncHoverPoint = () => {
      const km = hoveredDistKmRef.current;
      if (km == null) {
        setHoverPointPx(null);
        setHoverInfo(null);
        return;
      }

      const details = hoverDetails(trackPoints, km);
      const projected = map.project([details.point.lng, details.point.lat]);
      setHoverPointPx({ x: projected.x, y: projected.y });
      setHoverInfo({
        x: projected.x,
        y: projected.y,
        distKm: details.distKm,
        elevStart: details.elevStart,
        slope: details.slope,
        color: details.color,
      });
    };

    map.on('move', syncHoverPoint);
    map.on('zoom', syncHoverPoint);
    map.on('resize', syncHoverPoint);

    return () => {
      map.off('move', syncHoverPoint);
      map.off('zoom', syncHoverPoint);
      map.off('resize', syncHoverPoint);
    };
  }, [trackPoints]);

  return (
    <div ref={wrapperRef} className="relative h-[28rem] w-full rounded-xl overflow-hidden shadow-md">
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      {hoverPointPx && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20"
          style={{
            left: hoverPointPx.x,
            top: hoverPointPx.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="h-10 w-10 rounded-full bg-red-500/20" />
          <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-red-600 shadow-[0_3px_10px_rgba(0,0,0,0.35)]" />
        </div>
      )}
      {hoverInfo && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20 w-max max-w-[220px] rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
          style={{
            left: hoverInfo.x + 24,
            top: hoverInfo.y,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="text-[13px] font-bold text-gray-900">{(Math.round(hoverInfo.distKm * 10) / 10).toFixed(1)} km</div>
          <div className="text-[12px] text-gray-600">Højde: <strong>{hoverInfo.elevStart} m</strong></div>
          <div className="text-[12px] text-gray-600">
            Hældning: <strong style={{ color: hoverInfo.color }}>{hoverInfo.slope > 0 ? '+' : ''}{hoverInfo.slope}%</strong>
          </div>
        </div>
      )}

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
