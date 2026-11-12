import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  Table,
} from 'lucide-react';
import { displayPlace, fmtInt, fmtNum } from '../lib/format';
import type {
  ClusterClassification,
  Datasets,
  GeoJsonFeature,
  HarmonizedFireProperties,
} from '../types/harmonization';
import {
  Badge,
  Card,
  DataKindTag,
  EmptyState,
  PanelHeader,
  Segmented,
  buttonSecondary,
} from './ui';

type SortKey = 'frp' | 'confidence' | 'raw_count' | 'date';
type ClassFilter = 'ALL' | ClusterClassification;

export interface DataExplorerPageProps {
  datasets: Datasets;
  activeFeatures: Array<GeoJsonFeature<HarmonizedFireProperties>>;
  onInspectProvinceInWorkspace: (provinceKey: string) => void;
}

export function DataExplorerPage({
  datasets,
  activeFeatures,
  onInspectProvinceInWorkspace,
}: DataExplorerPageProps) {
  const { analytics, provinces } = datasets;
  const { provenance } = analytics;

  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<ClassFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('frp');
  const [limit, setLimit] = useState(50);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = activeFeatures.filter((f) => {
      const p = f.properties;
      if (classFilter !== 'ALL' && p.classification !== classFilter) return false;
      if (!q) return true;
      const placeEn = displayPlace(p.province).toLowerCase();
      return (
        placeEn.includes(q) ||
        p.satellites.toLowerCase().includes(q) ||
        p.acq_date.toLowerCase().includes(q) ||
        String(p.cluster_id).includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const pa = a.properties;
      const pb = b.properties;
      if (sortKey === 'frp') return pb.harmonized_frp - pa.harmonized_frp;
      if (sortKey === 'confidence') return pb.harmonized_confidence - pa.harmonized_confidence;
      if (sortKey === 'raw_count') return pb.raw_count - pa.raw_count;
      return `${pb.acq_date} ${pb.acq_time}`.localeCompare(`${pa.acq_date} ${pa.acq_time}`);
    });
  }, [activeFeatures, query, classFilter, sortKey]);

  const activeProvinces = useMemo(() => {
    return [...provinces.features]
      .filter((f) => f.properties.harmonized_fires_7d > 0 || f.properties.modis_fires_7d > 0 || f.properties.viirs_fires_7d > 0)
      .sort((a, b) => b.properties.harmonized_fires_7d - a.properties.harmonized_fires_7d);
  }, [provinces]);

  const exportCsv = () => {
    const headers = [
      'cluster_id',
      'classification',
      'corroboration',
      'latitude',
      'longitude',
      'acq_date_utc',
      'acq_time_utc',
      'satellites',
      'sensors',
      'raw_count',
      'modis_count',
      'viirs_count',
      'harmonized_confidence_pct',
      'harmonized_frp_mw',
      'spatial_resolution_m',
      'region',
    ];
    const rows = filteredEvents.map((f) => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      return [
        p.cluster_id,
        p.classification,
        p.corroboration,
        lat.toFixed(5),
        lon.toFixed(5),
        p.acq_date,
        p.acq_time,
        `"${p.satellites}"`,
        `"${p.sensors}"`,
        p.raw_count,
        p.modis_count,
        p.viirs_count,
        p.harmonized_confidence,
        p.harmonized_frp,
        p.spatial_resolution_m,
        `"${displayPlace(p.province)}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firms_harmonized_events_${filteredEvents.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportGeoJson = () => {
    const payload = {
      type: 'FeatureCollection',
      metadata: provenance,
      features: filteredEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firms_harmonized_events_${filteredEvents.length}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Formal NASA EOSDIS Data Provenance & Attribution */}
      <Card aria-labelledby="provenance-heading">
        <PanelHeader
          icon={Database}
          eyebrow="Scientific Traceability & Licensing Attribution"
          title="NASA EOSDIS / LANCE FIRMS Dataset Provenance & Processing Lineage"
          titleId="provenance-heading"
          right={
            <>
              <DataKindTag kind="observed" detail="Level-2P Active Fire" />
              <Badge tone="cyan">{provenance.processing_version}</Badge>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-12">
          {/* Left: Dataset DOIs & Source Metadata */}
          <div className="space-y-3 lg:col-span-6">
            <div className="rounded-xl border border-line bg-ink-900/80 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">Primary Data Source</span>
                <a
                  href={provenance.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-cyan-300 hover:underline"
                >
                  <span>{provenance.source_url}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
              <div className="text-sm font-bold text-white">{provenance.dataset_name}</div>
              <div className="text-slate-400">
                Retrieval Timestamp: <span className="font-mono text-slate-200">{provenance.retrieval_timestamp}</span>
              </div>

              <dl className="mt-2 space-y-1.5 border-t border-line pt-2.5">
                <div>
                  <dt className="text-[11px] font-semibold text-rose-300">MODIS Collection 6.1 (Terra / Aqua)</dt>
                  <dd className="font-mono text-[11px] text-slate-300">{provenance.dataset_identifiers.MODIS_C6_1}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold text-amber-300">VIIRS NOAA-20 (JPSS-1) Collection 2</dt>
                  <dd className="font-mono text-[11px] text-slate-300">{provenance.dataset_identifiers.VIIRS_NOAA20_C2}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold text-amber-300">VIIRS NOAA-21 (JPSS-2) Collection 2</dt>
                  <dd className="font-mono text-[11px] text-slate-300">{provenance.dataset_identifiers.VIIRS_NOAA21_C2}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold text-sky-300">Administrative Boundaries</dt>
                  <dd className="font-mono text-[11px] text-slate-300">{provenance.dataset_identifiers.boundaries}</dd>
                </div>
              </dl>
            </div>

            {/* Sensor Fleet Summary */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {analytics.sensors.map((s) => (
                <div key={s.name} className="rounded-lg border border-line bg-ink-900/70 p-3 text-xs">
                  <div className="font-bold text-white">{s.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Resolution: <span className="font-mono text-slate-200">{s.spatial_resolution}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-400">7d Raw Hits</span>
                    <span className="num text-base font-bold text-cyan-300">{fmtInt(s.detection_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Preprocessing & Harmonization Lineage Steps */}
          <div className="rounded-xl border border-line bg-ink-900/80 p-4 lg:col-span-6">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="eyebrow">Audited Preprocessing &amp; Harmonization Pipeline</span>
              <Badge tone="emerald">Deterministic · Zero Data Leakage</Badge>
            </div>
            <ol className="space-y-2 text-xs text-slate-300">
              {provenance.preprocessing_steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-line bg-ink-850 p-2.5"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>

      {/* Active Vietnam Provincial Summary Table */}
      <Card aria-labelledby="province-summary-heading">
        <PanelHeader
          icon={MapPin}
          eyebrow="Administrative Spatial Join (Ray-Casting Point-in-Polygon)"
          title="Vietnam Provincial 7-Day Fire Harmonization Summary"
          titleId="province-summary-heading"
          right={<DataKindTag kind="derived" detail={`${activeProvinces.length} active provinces`} />}
        />
        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-4">Province</th>
                <th className="px-3 py-2 text-right">MODIS Raw (1 km)</th>
                <th className="px-3 py-2 text-right">VIIRS Raw (375 m)</th>
                <th className="px-3 py-2 text-right">Harmonized Events</th>
                <th className="px-3 py-2 text-right">Dual-Sensor</th>
                <th className="px-3 py-2 text-right">Duplicates Removed</th>
                <th className="px-3 py-2 text-right">Reconciled FRP (MW)</th>
                <th className="py-2 pl-3 text-right">Workspace Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activeProvinces.map((feat) => {
                const p = feat.properties;
                return (
                  <tr key={p.shapeISO || p.shapeName} className="hover:bg-ink-700/40">
                    <td className="py-2.5 pr-4 font-semibold text-white">
                      {displayPlace(p.shapeName)} Province
                    </td>
                    <td className="num px-3 py-2.5 text-right text-rose-300">{fmtInt(p.modis_fires_7d)}</td>
                    <td className="num px-3 py-2.5 text-right text-amber-300">{fmtInt(p.viirs_fires_7d)}</td>
                    <td className="num px-3 py-2.5 text-right font-bold text-cyan-300">
                      {fmtInt(p.harmonized_fires_7d)}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-emerald-300">
                      {fmtInt(p.dual_confirmed_7d)}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-slate-300">
                      −{fmtInt(p.dedup_savings_7d)} ({fmtNum(p.dedup_pct, 1)}%)
                    </td>
                    <td className="num px-3 py-2.5 text-right font-semibold text-slate-100">
                      {fmtNum(p.total_frp_mw, 1)} MW
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectProvinceInWorkspace(p.shapeName)}
                        className="rounded-md border border-line-strong bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-ink-700"
                      >
                        Inspect on Map
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Searchable, Filterable Harmonized Event Catalog */}
      <Card aria-labelledby="event-catalog-heading">
        <PanelHeader
          icon={Table}
          eyebrow="Harmonized Fire Event Catalog"
          title={`Resolved Fire Event Records (${fmtInt(filteredEvents.length)} of ${fmtInt(activeFeatures.length)} events)`}
          titleId="event-catalog-heading"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportCsv} className={`${buttonSecondary} !px-2.5 !py-1 !text-xs`}>
                <Download className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                <span>Export CSV</span>
              </button>
              <button type="button" onClick={exportGeoJson} className={`${buttonSecondary} !px-2.5 !py-1 !text-xs`}>
                <Download className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                <span>Export GeoJSON</span>
              </button>
            </div>
          }
        />

        <div className="space-y-4 p-4">
          {/* Controls Strip */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by region (e.g., Dak Lak, Gia Lai), satellite, date, or cluster ID…"
                aria-label="Filter harmonized fire events by keyword"
                className="w-full rounded-lg border border-line-strong bg-ink-900 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="md:col-span-4">
              <Segmented<ClassFilter>
                label="Filter by sensor classification"
                value={classFilter}
                onChange={setClassFilter}
                options={[
                  { value: 'ALL', label: 'All Events' },
                  { value: 'HARMONIZED_DUAL', label: 'Dual-Sensor' },
                  { value: 'VIIRS_EXCLUSIVE', label: 'VIIRS Only' },
                  { value: 'MODIS_EXCLUSIVE', label: 'MODIS Only' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-3">
              <Filter className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <label htmlFor="catalog-sort" className="text-xs text-slate-400">
                Sort:
              </label>
              <select
                id="catalog-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="flex-1 rounded-lg border border-line-strong bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-cyan-400"
              >
                <option value="frp">Highest Reconciled FRP (MW)</option>
                <option value="confidence">Highest Fused Confidence (%)</option>
                <option value="raw_count">Most Raw Detections Fused</option>
                <option value="date">Most Recent Acquisition (UTC)</option>
              </select>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No matching harmonized fire events"
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setClassFilter('ALL');
                  }}
                  className={buttonSecondary}
                >
                  Reset Filters
                </button>
              }
            >
              Adjust your search keyword or sensor classification filter to inspect matching clusters.
            </EmptyState>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-3">Cluster ID</th>
                      <th className="px-3 py-2">Classification</th>
                      <th className="px-3 py-2">Centroid (Lat, Lon)</th>
                      <th className="px-3 py-2">UTC Pass Window</th>
                      <th className="px-3 py-2">Satellites</th>
                      <th className="px-3 py-2 text-right">Raw Hits (M/V)</th>
                      <th className="px-3 py-2 text-right">Fused Conf.</th>
                      <th className="px-3 py-2 text-right">Reconciled FRP</th>
                      <th className="py-2 pl-3">Region</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredEvents.slice(0, limit).map((f) => {
                      const p = f.properties;
                      const [lon, lat] = f.geometry.coordinates;
                      const tone =
                        p.classification === 'HARMONIZED_DUAL'
                          ? 'emerald'
                          : p.classification === 'VIIRS_EXCLUSIVE'
                            ? 'amber'
                            : 'rose';
                      return (
                        <tr key={p.cluster_id} className="hover:bg-ink-700/40">
                          <td className="num py-2 pr-3 font-semibold text-slate-300">#{p.cluster_id}</td>
                          <td className="px-3 py-2">
                            <Badge tone={tone}>{p.classification}</Badge>
                          </td>
                          <td className="num px-3 py-2 text-slate-200">
                            {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                          </td>
                          <td className="num px-3 py-2 text-slate-300">
                            {p.acq_date} {p.acq_time}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-300">{p.satellites}</td>
                          <td className="num px-3 py-2 text-right text-cyan-300">
                            {p.raw_count} ({p.modis_count}/{p.viirs_count})
                          </td>
                          <td className="num px-3 py-2 text-right font-bold text-emerald-300">
                            {fmtNum(p.harmonized_confidence, 1)}%
                          </td>
                          <td className="num px-3 py-2 text-right font-bold text-amber-300">
                            {fmtNum(p.harmonized_frp, 1)} MW
                          </td>
                          <td className="py-2 pl-3 text-slate-200">{displayPlace(p.province)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredEvents.length > limit && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + 100)}
                    className={buttonSecondary}
                  >
                    Show More Events ({fmtInt(filteredEvents.length - limit)} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
