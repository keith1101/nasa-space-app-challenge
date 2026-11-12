import type { AnalysisParams } from '../types/harmonization';

export class DataLoadError extends Error {
  readonly resource: string;

  constructor(resource: string, message: string) {
    super(message);
    this.name = 'DataLoadError';
    this.resource = resource;
  }
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** Fetches JSON, rejecting on network failure, HTTP errors, invalid JSON and unexpected structure. */
export async function fetchJson<T>(
  url: string,
  guard: (v: unknown) => v is T,
  label: string,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new DataLoadError(label, `Network error while loading ${label}.`);
  }
  if (!res.ok) throw new DataLoadError(label, `${label} responded with HTTP ${res.status}.`);

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new DataLoadError(label, `${label} did not return valid JSON.`);
  }
  if (!guard(body)) throw new DataLoadError(label, `${label} has an unexpected structure.`);
  return body;
}

/** Query string for GET /api/harmonize. Parameter names match backend/server.py. */
export function buildHarmonizeQuery(p: AnalysisParams): string {
  return new URLSearchParams({
    eps_km: String(p.epsKm),
    time_window_hours: String(p.timeWindowHours),
    use_footprint: String(p.useFootprint),
    vietnam_only: String(p.vietnamOnly),
    date_filter: p.dateFilter,
    daynight: p.dayNight,
  }).toString();
}
