'use client';

import Link from 'next/link';
import type { SavedRouteSummaryDto } from '@/api/generated/models/savedRouteSummaryDto';

const SURFACE_LABELS: Record<string, { label: string; icon: string }> = {
  auto: { label: 'Auto', icon: '🚲' },
  paved: { label: 'Asfalt', icon: '🛣️' },
  unpaved: { label: 'Grus', icon: '🪨' },
};

// ─── Shared stat pills used by both modes ─────────────────────────────────────

function RouteStats({ route }: { route: SavedRouteSummaryDto }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
      <span className="font-semibold text-gray-900">{route.totalDistanceKm} km</span>
      <span className="text-green-700">↑ {route.elevationGainM} m</span>
      <span className="text-red-600">↓ {route.elevationLossM} m</span>
    </div>
  );
}

// ─── Link mode (routes list page) ─────────────────────────────────────────────

interface RouteCardLinkProps {
  mode: 'link';
  route: SavedRouteSummaryDto;
  onDelete?: (e: React.MouseEvent) => void;
  deleting?: boolean;
}

// ─── Selectable mode (route pickers) ──────────────────────────────────────────

interface RouteCardSelectableProps {
  mode: 'selectable';
  route: SavedRouteSummaryDto;
  selected: boolean;
  onSelect: () => void;
}

type RouteCardProps = RouteCardLinkProps | RouteCardSelectableProps;

export function RouteCard(props: RouteCardProps) {
  const { route } = props;
  const surface = SURFACE_LABELS[route.surface] ?? SURFACE_LABELS.auto;

  // ── Inner content (shared layout) ──
  const inner = (
    <div className="flex items-start gap-3 min-w-0">
      {/* Surface icon */}
      <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
        {surface.icon}
      </span>

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-semibold text-gray-900 truncate">{route.name}</span>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
            {surface.label}
          </span>
        </div>
        {route.description && (
          <p className="text-sm text-gray-500 truncate mb-1">{route.description}</p>
        )}
        <RouteStats route={route} />
      </div>
    </div>
  );

  // ── Link mode ──
  if (props.mode === 'link') {
    return (
      <Link
        href={`/routes/${route.id}`}
        className="card hover:shadow-md transition-shadow block group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 [&_.font-semibold]:group-hover:text-brand-600 [&_.font-semibold]:transition-colors">
            {inner}
          </div>

          {props.onDelete && (
            <button
              onClick={props.onDelete}
              disabled={props.deleting}
              className="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 mt-0.5"
              title="Slet rute"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </Link>
    );
  }

  // ── Selectable mode ──
  return (
    <button
      onClick={props.onSelect}
      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
        props.selected
          ? 'border-brand-500 bg-brand-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* Checkbox indicator */}
        <span
          className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            props.selected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
          }`}
        >
          {props.selected && (
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </span>

        {/* Surface icon */}
        <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
          {surface.icon}
        </span>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-semibold text-gray-900 truncate">{route.name}</span>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
              {surface.label}
            </span>
          </div>
          {route.description && (
            <p className="text-sm text-gray-500 truncate mb-1">{route.description}</p>
          )}
          <RouteStats route={route} />
        </div>
      </div>
    </button>
  );
}
