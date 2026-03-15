'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrackPoint {
  lat: number;
  lng: number;
  ele: number;
  distanceKm: number;
}

interface ElevationProfileProps {
  trackPoints: TrackPoint[];
  elevationGainM: number;
  elevationLossM: number;
  maxElevationM: number;
  minElevationM: number;
  hoveredDistKm?: number | null;
  onHoverDistKm?: (km: number | null) => void;
}

// Sample the track points for the chart (max 400 data points for readability)
function sampleForChart(points: TrackPoint[], max = 400): TrackPoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

export default function ElevationProfile({
  trackPoints,
  elevationGainM,
  elevationLossM,
  maxElevationM,
  minElevationM,
  hoveredDistKm,
  onHoverDistKm,
}: ElevationProfileProps) {
  const data = sampleForChart(trackPoints).map((p) => ({
    km: p.distanceKm,
    ele: Math.round(p.ele),
  }));

  const padding = Math.max(10, (maxElevationM - minElevationM) * 0.1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <span className="text-green-600 font-semibold">↑</span>
          {elevationGainM} m stigning
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-500 font-semibold">↓</span>
          {elevationLossM} m fald
        </span>
        <span className="flex items-center gap-1">
          <span className="text-gray-400">▲</span>
          Max {maxElevationM} m
        </span>
        <span className="flex items-center gap-1">
          <span className="text-gray-400">▼</span>
          Min {minElevationM} m
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          onMouseMove={(state: any) => {
            const km = state.activeLabel ?? state.activePayload?.[0]?.payload?.km;
            if (km != null) {
              onHoverDistKm?.(Number(km));
            }
          }}
          onMouseLeave={() => onHoverDistKm?.(null)}
        >
          <defs>
            <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e85d04" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e85d04" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="km"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => `${Math.round(v * 10) / 10} km`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickCount={6}
          />
          <YAxis
            tickFormatter={(v: number) => `${v} m`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            domain={[
              Math.floor(minElevationM - padding),
              Math.ceil(maxElevationM + padding),
            ]}
            width={52}
          />
          <Tooltip
            formatter={(value) => [`${value} m`, 'Højde']}
            labelFormatter={(label) => `${Math.round(Number(label) * 10) / 10} km`}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="ele"
            stroke="#e85d04"
            strokeWidth={2}
            fill="url(#eleGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          {hoveredDistKm != null && (
            <ReferenceLine
              x={hoveredDistKm}
              stroke="#e85d04"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
