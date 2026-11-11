export interface DetectorBand {
  band_id: number;
  name: string;
  lambda_min: number;
  lambda_max: number;
  R: number;
  channels: number;
}

export interface ChannelInfo {
  channel_id: number;
  band_id: number;
  detector_name: string;
  wavelength_um: number;
  resolving_power: number;
  channel_in_band: number;
}

export interface PresetTarget {
  id: string;
  name: string;
  ra: number;
  dec: number;
  fov_arcmin: number;
  description: string;
}

export interface MovingCandidate {
  candidate_id: string;
  type: string;
  confidence_score: number;
  epoch1: {
    pixel: [number, number];
    ra_deg: number;
    dec_deg: number;
    hms: string;
    dms: string;
  } | null;
  epoch2: {
    pixel: [number, number];
    ra_deg: number;
    dec_deg: number;
    hms: string;
    dms: string;
  };
  angular_displacement_arcsec: number;
  estimated_motion_arcsec_yr: number;
  snr: number;
  flux_delta?: number;
}

export interface SpectralPoint {
  channel_id: number;
  wavelength_um: number;
  band_id: number;
  flux_density: number;
}

export interface BlinkResponse {
  ra: number;
  dec: number;
  channel_id: number;
  wavelength_um: number;
  band_name: string;
  data_source: 'nasa_irsa_live' | 'local_cache' | 'offline_sample';
  epoch1: {
    epoch_id: string;
    data_source?: string;
    image_base64: string;
    stats: { min: number; max: number };
  };
  epoch2: {
    epoch_id: string;
    data_source?: string;
    image_base64: string;
    stats: { min: number; max: number };
  };
  difference: {
    image_base64: string;
    min_residual: number;
    max_residual: number;
    std_residual: number;
  };
  spectral_profile?: SpectralPoint[];
  candidates_detected: MovingCandidate[];
  wcs: {
    crval: [number, number];
    cdelt: [number, number];
    ctype: [string, string];
  };
}

export type ObservationMode = 'blink' | 'side_by_side' | 'difference' | 'spectral' | 'candidates';

export interface CandidateFlagSubmission {
  candidate_id?: string;
  ra: number;
  dec: number;
  channel_id: number;
  observer_name: string;
  notes: string;
  object_classification: string;
}
