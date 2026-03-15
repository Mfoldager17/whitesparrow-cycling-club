'use client';

import { useRef, useState } from 'react';
import { apiClient } from '@/api/axios-instance';

interface RouteUploadProps {
  activityId: string;
  hasRoute: boolean;
  onSuccess: () => void;
  /** 'button' (default): compact label button.
   *  'inline': full-width panel matching Strava/RideWithGPS inline style. */
  mode?: 'button' | 'inline';
  onClose?: () => void;
}

export default function RouteUpload({ activityId, hasRoute, onSuccess, mode = 'button', onClose }: RouteUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setError('Kun GPX-filer er tilladt.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);
    try {
      await apiClient.post(`/activities/${activityId}/route`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Upload fejlede. Prøv igen.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!confirm('Er du sikker på, at du vil slette GPX-ruten?')) return;
    setDeleting(true);
    setError(null);
    try {
      await apiClient.delete(`/activities/${activityId}/route`);
      onSuccess();
    } catch {
      setError('Kunne ikke slette ruten. Prøv igen.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      {mode === 'inline' ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {hasRoute ? 'Udskift GPX-rute' : 'Upload GPX-rute'}
          </p>
          <label
            className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-5 text-sm font-medium text-gray-600 cursor-pointer hover:border-brand-400 hover:text-brand-600 transition-colors ${
              uploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? 'Uploader…' : 'Vælg GPX-fil'}
            <input
              ref={inputRef}
              type="file"
              accept=".gpx,application/gpx+xml"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {onClose && (
            <button onClick={onClose} className="btn-secondary text-sm w-full">
              Annuller
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary text-sm cursor-pointer">
              {uploading ? 'Uploader…' : hasRoute ? 'Udskift GPX-rute' : 'Upload GPX-rute'}
              <input
                ref={inputRef}
                type="file"
                accept=".gpx,application/gpx+xml"
                className="sr-only"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>

            {hasRoute && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger text-sm"
              >
                {deleting ? 'Sletter…' : 'Slet rute'}
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
