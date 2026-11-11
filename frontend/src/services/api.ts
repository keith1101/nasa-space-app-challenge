import { BlinkResponse, CandidateFlagSubmission, ChannelInfo, DetectorBand, PresetTarget } from '../types';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<{ status: string; astropy_version: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchBands(): Promise<{ total_channels: number; detector_bands: DetectorBand[]; channels: ChannelInfo[] }> {
  const res = await fetch(`${BASE_URL}/spherex/bands`);
  if (!res.ok) throw new Error('Failed to fetch spectral bands');
  return res.json();
}

export async function fetchTargets(): Promise<{ targets: PresetTarget[] }> {
  const res = await fetch(`${BASE_URL}/spherex/targets`);
  if (!res.ok) throw new Error('Failed to fetch preset targets');
  return res.json();
}

export async function fetchBlinkComparison(params: {
  ra: number;
  dec: number;
  channel_id: number;
  epoch1_id?: string;
  epoch2_id?: string;
  sigma_threshold?: number;
  stretch?: string;
  colormap?: string;
}): Promise<BlinkResponse> {
  const res = await fetch(`${BASE_URL}/spherex/blink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ra: params.ra,
      dec: params.dec,
      channel_id: params.channel_id,
      epoch1_id: params.epoch1_id || 'survey-1',
      epoch2_id: params.epoch2_id || 'survey-2',
      sigma_threshold: params.sigma_threshold || 4.0,
      stretch: params.stretch || 'asinh',
      colormap: params.colormap || 'magma'
    })
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        detail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Query failed: ${detail} (${res.status})`);
  }
  return res.json();
}

export async function submitCandidateFlag(data: CandidateFlagSubmission): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/spherex/flag-candidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Submission failed');
  return res.json();
}

export function getFitsDownloadUrl(ra: number, dec: number, channel_id: number, epoch_id: string = 'survey-1'): string {
  return `${BASE_URL}/spherex/download-fits?ra=${ra}&dec=${dec}&channel_id=${channel_id}&epoch_id=${epoch_id}`;
}
