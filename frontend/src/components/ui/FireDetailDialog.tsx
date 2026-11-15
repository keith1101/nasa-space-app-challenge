import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Activity,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Globe2,
  Layers,
  Satellite,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Language } from '../../lib/i18n';
import { fmtNum } from '../../lib/format';
import type { GlobalHarmonizedPoint, GlobalCountryInfo } from '../../types/harmonization';
import { cx } from '../ui';

export interface FireDetailDialogProps {
  point: GlobalHarmonizedPoint | null;
  country: GlobalCountryInfo | null;
  lang: Language;
  onClose: () => void;
  riskPersistence?: number;
}

export function FireDetailDialog({
  point,
  country,
  lang,
  onClose,
  riskPersistence,
}: FireDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const isVi = lang === 'vi';

  if (!point) return null;

  const lat = point[0];
  const lon = point[1];
  const frp = point[2];
  const conf = point[3];
  const isDual = point[4] === 1;
  const rawScans = point[5];

  const handleCopyCoords = async () => {
    try {
      await navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <Dialog.Root open={!!point} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line-strong bg-ink-950 p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div
                className={cx(
                  'grid h-11 w-11 place-items-center rounded-xl border',
                  isDual
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                    : frp >= 25
                    ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                    : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
                )}
              >
                {isDual ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : frp >= 25 ? (
                  <Flame className="h-6 w-6" />
                ) : (
                  <Activity className="h-6 w-6" />
                )}
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-white flex items-center gap-2">
                  <span>{isVi ? 'Chi Tiết Điểm Cháy Hợp Nhất' : 'Harmonized Active Fire Telemetry'}</span>
                  {isDual && (
                    <span className="rounded bg-emerald-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                      DUAL CORROBORATED
                    </span>
                  )}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-400">
                  {isVi
                    ? 'Dữ liệu viễn thám chuẩn hóa không - thời gian ST-DBSCAN v2.2'
                    : 'Spatio-temporal normalized remote sensing telemetry (ST-DBSCAN v2.2)'}
                </Dialog.Description>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800 hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body Telemetry Cards */}
          <div className="space-y-4 py-4 text-xs">
            {/* Coordinates & Copy */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-ink-900/80 p-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-400">
                  {isVi ? 'Tọa độ trắc địa WGS-84' : 'Geodesic Coordinates (WGS-84)'}
                </span>
                <span className="font-mono text-sm font-bold text-cyan-300">
                  {fmtNum(lat, 5)}° N, {fmtNum(lon, 5)}° E
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-400 hover:text-white transition-colors"
                title="Sao chép tọa độ"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">{isVi ? 'Đã chép' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{isVi ? 'Sao chép' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Metrics 3-Col Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-line bg-ink-900/60 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  FRP
                </span>
                <div className="text-base font-extrabold text-white font-mono">
                  {fmtNum(frp, 1)} <span className="text-[11px] font-normal text-slate-400">MW</span>
                </div>
                <div className="text-[10px] text-amber-300">
                  {frp >= 25 ? (isVi ? 'Cường độ cao' : 'High energy') : (isVi ? 'Mức tiêu chuẩn' : 'Moderate')}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-ink-900/60 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {isVi ? 'Độ tin cậy' : 'Confidence'}
                </span>
                <div className="text-base font-extrabold text-emerald-300 font-mono">
                  {conf}%
                </div>
                <div className="text-[10px] text-slate-400">
                  {conf >= 80 ? (isVi ? 'Rất cao (≥80%)' : 'High confidence') : (isVi ? 'Đạt chuẩn' : 'Standard')}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-ink-900/60 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {isVi ? 'Lượt quét' : 'Raw Scans'}
                </span>
                <div className="text-base font-extrabold text-cyan-300 font-mono">
                  {rawScans}
                </div>
                <div className="text-[10px] text-slate-400">
                  {rawScans > 1 ? (isVi ? 'Đa quan sát' : 'Multi-pass') : (isVi ? 'Đơn quan sát' : 'Single-pass')}
                </div>
              </div>
            </div>

            {/* Country and Biome Info */}
            <div className="rounded-xl border border-line bg-ink-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
                  {isVi ? 'Vị trí địa lý / Quốc gia:' : 'Geographic Jurisdiction:'}
                </span>
                <span className="font-semibold text-white">
                  {country ? `${country.name} (${country.continent})` : isVi ? 'Vùng biển / Biên giới' : 'Border / Offshore'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Satellite className="h-3.5 w-3.5 text-emerald-400" />
                  {isVi ? 'Cảm biến viễn thám:' : 'Sensor Footprint:'}
                </span>
                <span className="font-mono text-emerald-300">
                  {isDual ? 'MODIS 1000m + VIIRS 375m' : 'VIIRS 375m I-band'}
                </span>
              </div>
              {riskPersistence != null && (
                <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    {isVi ? 'Chỉ số bền vững lan truyền:' : 'Persistence Index:'}
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {riskPersistence.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-line pt-4">
            <Link
              to="/methodology"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isVi ? 'Xem công thức Bayesian & ST-DBSCAN' : 'View Bayesian Equations'}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-xl bg-ink-800 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-700 transition-colors"
              >
                {isVi ? 'Đóng cửa sổ' : 'Close'}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
