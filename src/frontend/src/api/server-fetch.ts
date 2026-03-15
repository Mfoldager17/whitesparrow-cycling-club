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

/**
 * Orval mutator for the `whitesparrow_server` output.
 *
 * Called as `serverFetch<T>(url, options)` by orval's fetch client.
 * Reads the `accessToken` cookie written by `AuthContext` on login, attaches it
 * as a Bearer token and forwards the request to the NestJS backend.
 *
 * The backend wraps all successful responses as `{ data: T }`, so the raw
 * `data` field is unwrapped before returning.
 */
export const serverFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const headers = new Headers(options?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
    // Never cache authenticated data; each server render should be fresh.
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `API ${options?.method ?? 'GET'} ${url} → ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as { data?: T } | T;
  // The NestJS backend wraps every successful response in `{ data: T }`.
  // Unwrap that envelope; fall back to the raw value for any endpoint that
  // returns a plain body (e.g., health-check or non-standard endpoints).
  return ((json as { data?: T }).data ?? json) as T;
};
