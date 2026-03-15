/**
 * Server-side fetch mutator for Orval-generated functions in `src/api/generated-server/`.
 *
 * This module is ONLY imported by Next.js server components and server actions.
 * It reads the JWT access token from an HTTP cookie (set by AuthContext on login)
 * so authenticated API calls work server-side without touching localStorage.
 *
 * Never import this file from a 'use client' component.
 */
import 'server-only';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type RequestConfig = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  /** Query-string params — Orval passes these as an object */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Request body — Orval passes this as the typed DTO */
  data?: unknown;
  signal?: AbortSignal;
};

/**
 * Orval mutator for the `whitesparrow_server` output.
 *
 * Reads the `accessToken` cookie written by `AuthContext` on login, attaches it
 * as a Bearer token and forwards the request to the NestJS backend.
 *
 * The backend wraps all successful responses as `{ data: T }`, so the raw
 * `data` field is unwrapped before returning.
 */
export const serverFetch = async <T>(config: RequestConfig): Promise<T> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const url = new URL(`${BASE_URL}${config.url}`);

  if (config.params) {
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: config.method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...config.headers,
    },
    ...(config.data !== undefined ? { body: JSON.stringify(config.data) } : {}),
    signal: config.signal,
    // Never cache authenticated data; each server render should be fresh.
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `API ${config.method.toUpperCase()} ${config.url} → ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as { data?: T } | T;
  // The NestJS backend wraps every successful response in `{ data: T }`.
  // Unwrap that envelope; fall back to the raw value for any endpoint that
  // returns a plain body (e.g., health-check or non-standard endpoints).
  return ((json as { data?: T }).data ?? json) as T;
};
