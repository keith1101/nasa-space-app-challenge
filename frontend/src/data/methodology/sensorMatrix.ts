export interface SensorMatrixItem {
  id: string;
  specName: string;
  modisSpec: string;
  viirsSpec: string;
  harmonizationImpact: string;
  highlightViirs?: boolean;
  highlightModis?: boolean;
}

export const SENSOR_MATRIX_DATA: SensorMatrixItem[] = [
  {
    id: 'platforms',
    specName: '1. Spacecraft Platforms',
    modisSpec: 'Terra (10:30) & Aqua (13:30)',
    viirsSpec: 'Suomi-NPP (13:30), NOAA-20 (12:40), NOAA-21 (13:10)',
    harmonizationImpact: '20–50 min phase drift generates dual detections',
  },
  {
    id: 'nadir_resolution',
    specName: '2. Nadir Spatial Resolution',
    modisSpec: '1,000 m (1.0 km nominal)',
    viirsSpec: '375 m (I-band I4/I5)',
    harmonizationImpact: 'VIIRS provides 7× finer areal granularity',
    highlightViirs: true,
  },
  {
    id: 'bowtie_distortion',
    specName: '3. Edge-of-Scan Bowtie Distortion',
    modisSpec: '~4.8 km × 2.0 km (Expansion ~10×)',
    viirsSpec: '~0.8 km × 0.8 km (Pixel aggregation 3:1)',
    harmonizationImpact: 'Demands anisotropic elliptical matching semi-axes',
    highlightModis: true,
  },
  {
    id: 'swath_width',
    specName: '4. Swath Width & Coverage',
    modisSpec: '2,330 km (Equatorial scan gaps)',
    viirsSpec: '3,040 km (Zero-gap contiguous global coverage)',
    harmonizationImpact: 'Contiguous global scanning without equatorial blind zones',
    highlightViirs: true,
  },
  {
    id: 'thermal_channels',
    specName: '5. Thermal Fire Channels',
    modisSpec: 'Ch 21/22 (3.96 µm) & Ch 31 (11.0 µm)',
    viirsSpec: 'I4 (3.74 µm) & I5 (11.45 µm)',
    harmonizationImpact: 'Optimal Planck peak radiance at 800–1200 K flaming',
  },
  {
    id: 'saturation_temp',
    specName: '6. Brightness Temperature Saturation',
    modisSpec: '~331 K (Ch 22), ~500 K (Ch 21 high-range)',
    viirsSpec: '~367 K (I4 dual-gain mode)',
    harmonizationImpact: 'MODIS Ch 21 captures megafires above 367 K',
  },
  {
    id: 'min_fire_area',
    specName: '7. Minimum Detectable Flaming Area',
    modisSpec: '~100 m² (flaming crown fire)',
    viirsSpec: '~10 – 25 m² (4–10× higher sensitivity)',
    harmonizationImpact: 'VIIRS identifies early smoldering & agricultural burns',
    highlightViirs: true,
  },
  {
    id: 'revisit_frequency',
    specName: '8. Global Daily Revisit Frequency',
    modisSpec: '1–2 overpasses / day / point',
    viirsSpec: '~4 overpasses / day / point (3-satellite constellation)',
    harmonizationImpact: 'Yields high dual-satellite corroboration opportunities',
    highlightViirs: true,
  },
];
