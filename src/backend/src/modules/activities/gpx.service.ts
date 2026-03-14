import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface TrackPoint {
  lat: number;
  lng: number;
  ele: number;
  distanceKm: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ParsedGpx {
  trackPoints: TrackPoint[];
  totalDistanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  maxElevationM: number;
  minElevationM: number;
  boundingBox: BoundingBox;
}

/** Haversine distance in km between two lat/lng pairs */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Simple moving-average smoother for elevation to reduce GPS noise */
function smoothElevation(elevations: number[], windowSize = 5): number[] {
  return elevations.map((_, i) => {
    const half = Math.floor(windowSize / 2);
    const start = Math.max(0, i - half);
    const end = Math.min(elevations.length - 1, i + half);
    const slice = elevations.slice(start, end + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

/** Sample an array down to at most maxPoints entries, keeping first and last */
function sampleArray<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = (arr.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) =>
    arr[Math.round(i * step)],
  );
}

@Injectable()
export class GpxService {
  parse(gpxBuffer: Buffer): ParsedGpx {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (_name, jpath) =>
        jpath === 'gpx.trk.trkseg.trkpt' || jpath === 'gpx.trk' || jpath === 'gpx.trk.trkseg',
    });

    const parsed = parser.parse(gpxBuffer.toString('utf-8')) as Record<string, unknown>;
    const gpx = parsed['gpx'] as Record<string, unknown> | undefined;

    if (!gpx) {
      throw new Error('Invalid GPX: missing <gpx> root element');
    }

    const trks = (gpx['trk'] as unknown[]) ?? [];
    const rawPoints: Array<{ lat: number; lng: number; ele: number }> = [];

    for (const trk of trks) {
      const trkObj = trk as Record<string, unknown>;
      const segments = (trkObj['trkseg'] as unknown[]) ?? [];
      for (const seg of segments) {
        const segObj = seg as Record<string, unknown>;
        const trkpts = (segObj['trkpt'] as unknown[]) ?? [];
        for (const pt of trkpts) {
          const ptObj = pt as Record<string, unknown>;
          const lat = parseFloat(ptObj['@_lat'] as string);
          const lng = parseFloat(ptObj['@_lon'] as string);
          const ele = parseFloat((ptObj['ele'] as string | undefined) ?? '0');
          if (!isNaN(lat) && !isNaN(lng)) {
            rawPoints.push({ lat, lng, ele: isNaN(ele) ? 0 : ele });
          }
        }
      }
    }

    if (rawPoints.length === 0) {
      throw new Error('GPX file contains no track points');
    }

    // Smooth elevation to reduce GPS noise
    const smoothed = smoothElevation(rawPoints.map((p) => p.ele));

    // Build cumulative distance array
    let totalKm = 0;
    const withDistance = rawPoints.map((p, i) => {
      if (i > 0) {
        totalKm += haversine(rawPoints[i - 1].lat, rawPoints[i - 1].lng, p.lat, p.lng);
      }
      return { lat: p.lat, lng: p.lng, ele: smoothed[i], distanceKm: totalKm };
    });

    // Elevation stats (based on smoothed)
    let gainM = 0;
    let lossM = 0;
    for (let i = 1; i < smoothed.length; i++) {
      const diff = smoothed[i] - smoothed[i - 1];
      if (diff > 0) gainM += diff;
      else lossM += Math.abs(diff);
    }

    const maxEle = Math.max(...smoothed);
    const minEle = Math.min(...smoothed);

    // Bounding box
    const lats = rawPoints.map((p) => p.lat);
    const lngs = rawPoints.map((p) => p.lng);
    const boundingBox: BoundingBox = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };

    // Sample to at most 1500 points for storage/transfer efficiency
    const trackPoints = sampleArray(withDistance, 1500);

    return {
      trackPoints,
      totalDistanceKm: Math.round(totalKm * 100) / 100,
      elevationGainM: Math.round(gainM),
      elevationLossM: Math.round(lossM),
      maxElevationM: Math.round(maxEle),
      minElevationM: Math.round(minEle),
      boundingBox,
    };
  }
}
