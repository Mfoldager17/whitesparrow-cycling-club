'use client';

import { useRef, useState } from 'react';
import { apiClient } from '@/api/axios-instance';

interface RouteUploadProps {
  activityId: string;
  hasRoute: boolean;
  onSuccess: () => void;
}

export default function RouteUpload({ activityId, hasRoute, onSuccess }: RouteUploadProps) {
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
    </div>
  );
}
