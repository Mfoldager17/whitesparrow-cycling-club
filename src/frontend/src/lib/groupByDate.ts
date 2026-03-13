import { format } from 'date-fns';

/**
 * Groups an array of items by date (yyyy-MM-dd key).
 * Items with a null/undefined date are skipped.
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined,
): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const d = getDate(item);
    if (!d) continue;
    const key = format(new Date(d), 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries());
}
