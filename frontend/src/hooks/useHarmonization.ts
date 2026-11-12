import { useEffect, useMemo, useRef, useState } from 'react';
import { buildHarmonizeQuery, fetchJson, isAbortError } from '../lib/api';
import { harmonizeClientSide } from '../lib/harmonize';
import { isHarmonizeResponse } from '../lib/validate';
import type { AnalysisParams, Datasets, HarmonizationResult } from '../types/harmonization';

export type ComputeNotice = { tone: 'info' | 'error'; text: string };

export const DEFAULT_PARAMS: AnalysisParams = {
  epsKm: 1.25,
  timeWindowHours: 3,
  useFootprint: true,
  vietnamOnly: false,
  dateFilter: 'all',
  dayNight: 'all',
};

export function isDefaultParams(p: AnalysisParams): boolean {
  return (
    Math.abs(p.epsKm - DEFAULT_PARAMS.epsKm) < 0.01 &&
    Math.abs(p.timeWindowHours - DEFAULT_PARAMS.timeWindowHours) < 0.01 &&
    p.useFootprint === DEFAULT_PARAMS.useFootprint &&
    !p.vietnamOnly &&
    p.dateFilter === 'all' &&
    p.dayNight === 'all'
  );
}

function runBrowserEngine(datasets: Datasets, p: AnalysisParams): HarmonizationResult {
  const keep = (props: { in_vietnam: boolean; acq_date: string; daynight: string }): boolean => {
    if (p.vietnamOnly && !props.in_vietnam) return false;
    if (p.dateFilter !== 'all' && props.acq_date !== p.dateFilter) return false;
    if (p.dayNight !== 'all' && props.daynight && props.daynight !== p.dayNight) return false;
    return true;
  };
  const result = harmonizeClientSide(
    datasets.modis.features.filter((f) => keep(f.properties)),
    datasets.viirs.features.filter((f) => keep(f.properties)),
    { epsKm: p.epsKm, timeWindowHours: p.timeWindowHours, useFootprint: p.useFootprint },
  );
  return { geojson: result.harmonizedGeojson, metrics: result.metrics, source: 'browser' };
}

interface HarmonizationState {
  result: HarmonizationResult;
  computing: boolean;
  notice: ComputeNotice | null;
}

/**
 * Resolves the harmonization result for the current parameters.
 * Default parameters use the precomputed catalog. Anything else is recomputed by the live API,
 * falling back to the in-browser engine when the API is unreachable or returns malformed data.
 */
export function useHarmonization(
  datasets: Datasets,
  params: AnalysisParams,
  onApiResult?: (reachable: boolean) => void,
): HarmonizationState {
  const precomputed = useMemo<HarmonizationResult>(
    () => ({ geojson: datasets.harmonized, metrics: datasets.analytics.metrics, source: 'precomputed' }),
    [datasets],
  );

  const useDefault = isDefaultParams(params);
  const [shown, setShown] = useState<HarmonizationResult>(precomputed);
  const [computing, setComputing] = useState(false);
  const [notice, setNotice] = useState<ComputeNotice | null>(null);
  const onApiResultRef = useRef(onApiResult);
  onApiResultRef.current = onApiResult;

  const { epsKm, timeWindowHours, useFootprint, vietnamOnly, dateFilter, dayNight } = params;

  useEffect(() => {
    if (useDefault) {
      setShown(precomputed);
      setComputing(false);
      setNotice(null);
      return;
    }

    const ctrl = new AbortController();
    const current: AnalysisParams = { epsKm, timeWindowHours, useFootprint, vietnamOnly, dateFilter, dayNight };

    const timer = window.setTimeout(async () => {
      setComputing(true);
      try {
        let res: HarmonizationResult;
        try {
          const payload = await fetchJson(
            `/api/harmonize?${buildHarmonizeQuery(current)}`,
            isHarmonizeResponse,
            'Live harmonization API',
            ctrl.signal,
          );
          res = { geojson: payload.harmonized_geojson, metrics: payload.metrics, source: 'api' };
          onApiResultRef.current?.(true);
          setNotice(null);
        } catch (e) {
          if (isAbortError(e)) return;
          onApiResultRef.current?.(false);
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          if (ctrl.signal.aborted) return;
          res = runBrowserEngine(datasets, current);
          setNotice({
            tone: 'info',
            text: 'The live API is unavailable, so this result was recomputed in your browser using the same algorithm.',
          });
        }
        if (!ctrl.signal.aborted) setShown(res);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          setNotice({
            tone: 'error',
            text: `Recomputation failed: ${e instanceof Error ? e.message : 'unknown error'}. Showing the previous result.`,
          });
        }
      } finally {
        if (!ctrl.signal.aborted) setComputing(false);
      }
    }, 180);

    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [useDefault, precomputed, datasets, epsKm, timeWindowHours, useFootprint, vietnamOnly, dateFilter, dayNight]);

  return { result: useDefault ? precomputed : shown, computing, notice };
}
