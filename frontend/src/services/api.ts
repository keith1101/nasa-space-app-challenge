import { BlinkResponse, CandidateFlagSubmission, ChannelInfo, DetectorBand, PresetTarget } from '../types';

// Normalize BASE_URL safely (supports both local proxy '/api' and external 'https://backend.../api')
function resolveBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!envUrl) return '/api';
  const stripped = envUrl.replace(/\/+$/, '');
  if (stripped.startsWith('http://') || stripped.startsWith('https://')) {
    return stripped.endsWith('/api') ? stripped : `${stripped}/api`;
  }
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

const BASE_URL = resolveBaseUrl();

/**
 * Defensive JSON parser that intercepts empty bodies or HTML error pages
 * before `res.json()` can throw "Unexpected end of JSON input".
 */
async function parseJsonResponse<T>(res: Response, endpoint: string): Promise<T> {
  const text = await res.text();

  if (!text || text.trim() === '') {
    if (!res.ok) {
      throw new Error(`Máy chủ phản hồi rỗng (${res.status} ${res.statusText || 'No Content'}). Backend có thể đang khởi động hoặc gặp sự cố.`);
    }
    throw new Error(
      `Máy chủ trả về phản hồi rỗng (HTTP ${res.status} OK). Frontend chưa kết nối được với Backend Web Service. ` +
      `Nếu đang chạy trên Render, vui lòng kiểm tra biến môi trường VITE_API_BASE_URL hoặc cấu hình Rewrite /api/* trên Static Site.`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    if (text.startsWith('<!DOCTYPE html>') || text.startsWith('<html') || text.includes('<body')) {
      throw new Error(
        `Yêu cầu tới '${endpoint}' nhận về trang HTML thay vì JSON (bị rewrite về index.html). ` +
        `Vui lòng kiểm tra cấu hình URL Backend (VITE_API_BASE_URL) trên môi trường triển khai.`
      );
    }
    throw new Error(`Dữ liệu từ máy chủ không đúng định dạng JSON: ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    const detail = data?.detail 
      ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) 
      : (res.statusText || 'Lỗi không xác định');
    throw new Error(`Yêu cầu thất bại (${res.status}): ${detail}`);
  }

  return data as T;
}

export async function fetchHealth(): Promise<{ status: string; astropy_version: string }> {
  const endpoint = `${BASE_URL}/health`;
  const res = await fetch(endpoint);
  return parseJsonResponse<{ status: string; astropy_version: string }>(res, endpoint);
}

export async function fetchBands(): Promise<{ total_channels: number; detector_bands: DetectorBand[]; channels: ChannelInfo[] }> {
  const endpoint = `${BASE_URL}/spherex/bands`;
  const res = await fetch(endpoint);
  return parseJsonResponse<{ total_channels: number; detector_bands: DetectorBand[]; channels: ChannelInfo[] }>(res, endpoint);
}

export async function fetchTargets(): Promise<{ targets: PresetTarget[] }> {
  const endpoint = `${BASE_URL}/spherex/targets`;
  const res = await fetch(endpoint);
  return parseJsonResponse<{ targets: PresetTarget[] }>(res, endpoint);
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
  const safeRa = ((params.ra % 360) + 360) % 360;
  const safeDec = Math.max(-90, Math.min(90, params.dec));
  const endpoint = `${BASE_URL}/spherex/blink`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ra: safeRa,
      dec: safeDec,
      channel_id: params.channel_id,
      epoch1_id: params.epoch1_id || 'survey-1',
      epoch2_id: params.epoch2_id || 'survey-2',
      sigma_threshold: params.sigma_threshold || 4.0,
      stretch: params.stretch || 'asinh',
      colormap: params.colormap || 'magma'
    })
  });
  return parseJsonResponse<BlinkResponse>(res, endpoint);
}

export async function submitCandidateFlag(data: CandidateFlagSubmission): Promise<{ status: string; message: string }> {
  const safeRa = ((data.ra % 360) + 360) % 360;
  const safeDec = Math.max(-90, Math.min(90, data.dec));
  const endpoint = `${BASE_URL}/spherex/flag-candidate`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      ra: safeRa,
      dec: safeDec
    })
  });
  return parseJsonResponse<{ status: string; message: string }>(res, endpoint);
}

export function getFitsDownloadUrl(ra: number, dec: number, channel_id: number, epoch_id: string = 'survey-1'): string {
  const safeRa = ((ra % 360) + 360) % 360;
  const safeDec = Math.max(-90, Math.min(90, dec));
  return `${BASE_URL}/spherex/download-fits?ra=${safeRa}&dec=${safeDec}&channel_id=${channel_id}&epoch_id=${epoch_id}`;
}
