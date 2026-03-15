'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { StyleSpecification } from 'maplibre-gl';
import type { PlannedRoute, RouteSurface, Waypoint } from '@/api/generated/routes/routes';
import { routesControllerSnap } from '@/api/generated/routes/routes';

// ─── Map style definitions (reused from RouteMap) ─────────────────────────────

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

type MapStyle = 'standard' | 'satellite' | 'cycling' | 'terrain';

const MAP_STYLES: Record<MapStyle, { label: string; icon: string; style: StyleSpecification }> = {
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
      ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      'Tiles © Esri',
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

// ─── Slope colour scale (same as RouteMap) ─────────────────────────────────────

function slopeColor(pct: number): string {
  if (pct <= -8) return '#1d4ed8';
  if (pct <= -3) return '#60a5fa';
  if (pct <= 1)  return '#22c55e';
  if (pct <= 4)  return '#facc15';
  if (pct <= 8)  return '#f97316';
  return '#dc2626';
}

// ─── Connector line (straight dashed lines between waypoints) ────────────────

function waypointsToLineData(waypoints: Waypoint[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: waypoints.map((w) => [w.lng, w.lat]),
    },
  };
}

function setupConnectorLayer(map: maplibregl.Map) {
  if (!map.getSource('wp-connector')) {
    map.addSource('wp-connector', {
      type: 'geojson',
      data: waypointsToLineData([]),
    });
    map.addLayer({
      id: 'wp-connector-line',
      type: 'line',
      source: 'wp-connector',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#2563eb',
        'line-width': 2,
        'line-dasharray': [3, 3],
        'line-opacity': 0.55,
      },
    });
  }
}

function updateConnectorLine(map: maplibregl.Map, waypoints: Waypoint[], routeDrawn: boolean) {
  const src = map.getSource('wp-connector') as maplibregl.GeoJSONSource | undefined;
  if (!src) return;
  // Show dashed connector only while route isn't drawn yet
  map.setPaintProperty('wp-connector-line', 'line-opacity', routeDrawn ? 0 : 0.55);
  src.setData(waypointsToLineData(waypoints.length >= 2 ? waypoints : []));
}

// ─── Build GeoJSON from planned route track points ────────────────────────────

type RouteFeature = GeoJSON.Feature<GeoJSON.LineString, { color: string }>;

function buildRouteGeoJSON(pts: PlannedRoute['trackPoints']): GeoJSON.FeatureCollection<GeoJSON.LineString, { color: string }> {
  const features: RouteFeature[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const distM = (b.distanceKm - a.distanceKm) * 1000;
    const slope = distM > 0.5 ? ((b.ele - a.ele) / distM) * 100 : 0;
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
      properties: { color: slopeColor(slope) },
    });
  }
  return { type: 'FeatureCollection', features };
}

// ─── Waypoint marker helpers ───────────────────────────────────────────────────

function createWaypointEl(index: number, total: number): HTMLDivElement {
  const el = document.createElement('div');
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const bg = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#2563eb';
  el.style.cssText = `
    width:28px;height:28px;border-radius:50%;
    background:${bg};border:2.5px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:11px;font-weight:700;cursor:grab;
    user-select:none;
  `;
  el.textContent = isFirst ? 'S' : isLast ? 'M' : String(index);
  return el;
}

// ─── Surface type config ───────────────────────────────────────────────────────

const SURFACE_OPTIONS: { value: RouteSurface; label: string; icon: string; title: string }[] = [
  { value: 'auto', icon: '🚲', label: 'Auto', title: 'Vælg den bedste vej automatisk' },
  { value: 'paved', icon: '🛣️', label: 'Asfalt', title: 'Foretrækker asfalt og befæstede veje' },
  { value: 'unpaved', icon: '🪨', label: 'Grus', title: 'Foretrækker grus og ubefæstede veje' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RoutePlannerMapProps {
  /** Initially populated waypoints (e.g. when editing an existing route) */
  initialWaypoints?: Waypoint[];
  surface: RouteSurface;
  onSurfaceChange: (s: RouteSurface) => void;
  /** Called when waypoints change — parent should re-plan the route */
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  /** The currently computed route; null while not yet computed */
  plannedRoute: PlannedRoute | null;
  /** Whether a route computation is in progress */
  isPlanning: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoutePlannerMap({
  initialWaypoints = [],
  surface,
  onSurfaceChange,
  onWaypointsChange,
  plannedRoute,
  isPlanning,
}: RoutePlannerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initializedRef = useRef(false);
  const styleReadyRef = useRef(false);
  const styleTransitionRef = useRef(false);
  const appliedStyleRef = useRef<MapStyle>('cycling');
  const queuedStyleRef = useRef<MapStyle | null>(null);

  // Keep a stable ref to waypoints for use inside map event handlers
  const waypointsRef = useRef<Waypoint[]>(initialWaypoints);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  // Track current surface inside map event handlers without stale closures
  const surfaceRef = useRef<RouteSurface>(surface);
  useEffect(() => { surfaceRef.current = surface; }, [surface]);
  // Track whether a route is currently drawn (to control connector visibility)
  const routeDrawnRef = useRef(false);

  // ── Undo / redo history ──
  const historyRef = useRef<Waypoint[][]>([[...initialWaypoints]]);
  const historyIndexRef = useRef(0);
  const [historyState, setHistoryState] = useState({ pos: 0, total: 1 });
  const canUndo = historyState.pos > 0;
  const canRedo = historyState.pos < historyState.total - 1;

  // Always up-to-date function for pushing a new snapshot — safe to call from map event handlers
  const pushHistoryRef = useRef<(wps: Waypoint[]) => void>(() => {});
  pushHistoryRef.current = (wps: Waypoint[]) => {
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push([...wps]);
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
    setHistoryState({ pos: historyIndexRef.current, total: next.length });
  };

  // Undo/redo — use current ref values so keyboard handler always sees latest
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});
  undoRef.current = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const wps = historyRef.current[historyIndexRef.current];
    waypointsRef.current = wps;
    setHistoryState((s) => ({ ...s, pos: historyIndexRef.current }));
    onWaypointsChange(wps);
    const map = mapRef.current;
    if (map && styleReadyRef.current) rebuildMarkers(map, wps);
  };
  redoRef.current = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const wps = historyRef.current[historyIndexRef.current];
    waypointsRef.current = wps;
    setHistoryState((s) => ({ ...s, pos: historyIndexRef.current }));
    onWaypointsChange(wps);
    const map = mapRef.current;
    if (map && styleReadyRef.current) rebuildMarkers(map, wps);
  };

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y = redo
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redoRef.current(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const [activeStyle, setActiveStyle] = useState<MapStyle>('cycling');
  const activeStyleRef = useRef(activeStyle);
  useEffect(() => { activeStyleRef.current = activeStyle; }, [activeStyle]);

  // ── Draw/update the planned route on the map ──
  const drawRoute = useCallback((map: maplibregl.Map, route: PlannedRoute | null) => {
    routeDrawnRef.current = !!route;
    // Hide/show connector based on whether route is drawn
    if (map.getSource('wp-connector')) {
      map.setPaintProperty('wp-connector-line', 'line-opacity', route ? 0 : 0.55);
    }
    if (!route) {
      if (map.getSource('planner-route')) {
        (map.getSource('planner-route') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      return;
    }

    const data = buildRouteGeoJSON(route.trackPoints);

    if (!map.getSource('planner-route')) {
      map.addSource('planner-route', { type: 'geojson', data });
      map.addLayer({
        id: 'planner-route-shadow',
        type: 'line',
        source: 'planner-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 4 },
      });
      map.addLayer({
        id: 'planner-route-line',
        type: 'line',
        source: 'planner-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 14, 5, 18, 8],
        },
      });
    } else {
      (map.getSource('planner-route') as maplibregl.GeoJSONSource).setData(data);
    }

    // Fit bounds to route
    const { minLng, minLat, maxLng, maxLat } = route.boundingBox;
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 16, duration: 600 });
  }, []);

  // ── Rebuild all waypoint markers ──
  const rebuildMarkers = useCallback((map: maplibregl.Map, waypoints: Waypoint[]) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    waypoints.forEach((wp, idx) => {
      const el = createWaypointEl(idx, waypoints.length);
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);

      // Right-click to remove
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const next = [...waypointsRef.current];
        next.splice(idx, 1);
        waypointsRef.current = next;
        pushHistoryRef.current(next);
        onWaypointsChange(next);
        rebuildMarkers(map, next);
      });

      // Drag end — snap to nearest road, then update
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        routesControllerSnap({ lat: lngLat.lat, lng: lngLat.lng, surface: surfaceRef.current })
          .then((snapped) => {
            marker.setLngLat([snapped.lng, snapped.lat]);
            const next = [...waypointsRef.current];
            next[idx] = snapped;
            waypointsRef.current = next;
            pushHistoryRef.current(next);
            onWaypointsChange(next);
            updateConnectorLine(map, next, routeDrawnRef.current);
          })
          .catch(() => {
            // fallback: keep drag position
            const next = [...waypointsRef.current];
            next[idx] = { lat: lngLat.lat, lng: lngLat.lng };
            waypointsRef.current = next;
            pushHistoryRef.current(next);
            onWaypointsChange(next);
            updateConnectorLine(map, next, routeDrawnRef.current);
          });
      });

      markersRef.current.push(marker);
    });

    // Update dashed connector line between waypoints
    updateConnectorLine(map, waypoints, routeDrawnRef.current);
  }, [onWaypointsChange]);

  // ── Reattach route layers after a style change ──
  const reattachLayers = useCallback((map: maplibregl.Map) => {
    setupConnectorLayer(map);
    updateConnectorLine(map, waypointsRef.current, routeDrawnRef.current);
    drawRoute(map, plannedRoute);
  }, [drawRoute, plannedRoute]);

  // ── Style switcher ──
  const applyStyleChange = useCallback((map: maplibregl.Map, styleKey: MapStyle) => {
    styleTransitionRef.current = true;
    map.setStyle(MAP_STYLES[styleKey].style);
    map.once('idle', () => {
      reattachLayers(map);
      appliedStyleRef.current = styleKey;
      styleReadyRef.current = true;
      styleTransitionRef.current = false;
      if (queuedStyleRef.current && queuedStyleRef.current !== styleKey) {
        const next = queuedStyleRef.current;
        queuedStyleRef.current = null;
        applyStyleChange(map, next);
      }
    });
  }, [reattachLayers]);

  // ── Initial map setup ──
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES.cycling.style,
      center: [10.2, 55.7], // Denmark
      zoom: 7,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.once('load', () => {
      styleReadyRef.current = true;
      appliedStyleRef.current = 'cycling';

      // Set up connector layer, then route, then markers
      setupConnectorLayer(map);

      // Draw initial route if provided
      drawRoute(map, plannedRoute);
      rebuildMarkers(map, waypointsRef.current);

      // Click to add waypoints — snap to nearest road first
      map.on('click', (e) => {
        if (styleTransitionRef.current) return;
        const clicked: Waypoint = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        routesControllerSnap({ ...clicked, surface: surfaceRef.current })
          .then((snapped) => {
            const next = [...waypointsRef.current, snapped];
            waypointsRef.current = next;
            pushHistoryRef.current(next);
            onWaypointsChange(next);
            rebuildMarkers(map, next);
          })
          .catch(() => {
            // fallback: use original click position
            const next = [...waypointsRef.current, clicked];
            waypointsRef.current = next;
            pushHistoryRef.current(next);
            onWaypointsChange(next);
            rebuildMarkers(map, next);
          });
      });
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

  // ── React to style changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    if (activeStyle === appliedStyleRef.current) return;
    if (styleTransitionRef.current) {
      queuedStyleRef.current = activeStyle;
      return;
    }
    applyStyleChange(map, activeStyle);
  }, [activeStyle, applyStyleChange]);

  // ── React to route data changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    drawRoute(map, plannedRoute);
  }, [plannedRoute, drawRoute]);

  // ── React to external waypoint changes (e.g. reset) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    waypointsRef.current = initialWaypoints;
    rebuildMarkers(map, initialWaypoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWaypoints.length]);

  const waypointCount = waypointsRef.current.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Surface buttons */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {SURFACE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              title={opt.title}
              onClick={() => onSurfaceChange(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                surface === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Undo / Redo */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => undoRef.current()}
            disabled={!canUndo}
            title="Fortryd (Ctrl+Z)"
            className="px-2.5 py-1.5 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => redoRef.current()}
            disabled={!canRedo}
            title="Gendan (Ctrl+Y)"
            className="px-2.5 py-1.5 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors border-l border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Map style buttons */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-auto">
          {(Object.entries(MAP_STYLES) as [MapStyle, (typeof MAP_STYLES)[MapStyle]][]).map(
            ([key, { icon, label }]) => (
              <button
                key={key}
                title={label}
                onClick={() => setActiveStyle(key)}
                className={`px-2 py-1.5 text-sm transition-colors ${
                  activeStyle === key
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {icon}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 480 }}>
        <div ref={containerRef} className="absolute inset-0" />

        {/* Planning spinner overlay */}
        {isPlanning && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-3 text-sm font-medium text-gray-700">
              <svg className="w-5 h-5 text-brand-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Beregner rute…
            </div>
          </div>
        )}

        {/* Hint overlay (no waypoints) */}
        {waypointCount === 0 && !isPlanning && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-gray-600 shadow-md text-center">
              Klik på kortet for at tilføje startpunkt
            </div>
          </div>
        )}

        {waypointCount === 1 && !isPlanning && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-gray-600 shadow-md text-center">
              Klik for at tilføje næste waypoint · {waypointCount} punkt tilføjet
            </div>
          </div>
        )}
      </div>

      {/* Waypoints + instructions */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {waypointCount} waypoint{waypointCount !== 1 ? 's' : ''} ·{' '}
          <span className="text-gray-400">Højreklik markør for at fjerne · Træk for at flytte</span>
        </span>
        {waypointCount >= 2 && plannedRoute && (
          <span className="font-medium text-gray-700">
            {plannedRoute.totalDistanceKm} km · ↑{plannedRoute.elevationGainM} m
          </span>
        )}
      </div>
    </div>
  );
}
