import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { fetchJson, isAbortError } from '../lib/api';
import { isAnalytics } from '../lib/validate';

export type RouteId = 'overview' | 'analysis' | 'explorer';

export const ROUTES: ReadonlyArray<{ id: RouteId; label: string; title: string }> = [
  { id: 'overview', label: 'Overview', title: 'Overview' },
  { id: 'analysis', label: 'Analysis', title: 'Analysis Workspace' },
  { id: 'explorer', label: 'Data Explorer', title: 'Data Explorer' },
];

export function routeHref(id: RouteId): string {
  return id === 'overview' ? '#/' : `#/${id}`;
}

function routeFromHash(hash: string): RouteId {
  const first = hash.replace(/^#\/?/, '').split(/[?/]/)[0];
  return first === 'analysis' || first === 'explorer' ? first : 'overview';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** Hash-based routing keeps every view reachable from the existing static/SPA server without new server routes. */
export function useRoute(): RouteId {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return routeFromHash(hash);
}

export type ApiStatus = 'checking' | 'online' | 'offline';

/** Probes the real backend once and lets other hooks report later outcomes. */
export function useApiStatus(): { status: ApiStatus; report: (reachable: boolean) => void } {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson('/api/metrics', isAnalytics, 'Backend API', ctrl.signal)
      .then(() => setStatus('online'))
      .catch((e: unknown) => {
        if (!isAbortError(e)) setStatus('offline');
      });
    return () => ctrl.abort();
  }, []);

  const report = useCallback((reachable: boolean) => setStatus(reachable ? 'online' : 'offline'), []);
  return { status, report };
}
