export interface MethodologySectionItem {
  id: string;
  num: string;
  title: string;
}

export const METHODOLOGY_SECTIONS: MethodologySectionItem[] = [
  {
    id: 'sec-01',
    num: '01',
    title: 'Problem Formulation (27%–43%)',
  },
  {
    id: 'sec-02',
    num: '02',
    title: 'End-to-End Modular Pipeline',
  },
  {
    id: 'sec-03',
    num: '03',
    title: 'Mathematical Formulations & Proofs',
  },
  {
    id: 'sec-04',
    num: '04',
    title: 'MODIS vs. VIIRS Sensor Matrix',
  },
  {
    id: 'sec-05',
    num: '05',
    title: 'Empirical Benchmarks & Verification',
  },
  {
    id: 'sec-06',
    num: '06',
    title: 'Neuro-Symbolic LLM Fire Spread Analysis',
  },
  {
    id: 'sec-07',
    num: '07',
    title: 'Feasibility of 3D World Models & Digital Twin',
  },
  {
    id: 'sec-08',
    num: '08',
    title: 'Academic References & BibTeX',
  },
];

export interface RedundancyMechanismItem {
  id: string;
  title: string;
  metric: string;
  metricColor: string;
  description: string;
}

export const REDUNDANCY_MECHANISMS: RedundancyMechanismItem[] = [
  {
    id: 'orbital_drift',
    title: 'Orbital Phase Drift',
    metric: '20–50 min',
    metricColor: 'text-cyan-300',
    description: 'Aqua and Suomi-NPP track identical ground tracks with tight temporal separation.',
  },
  {
    id: 'bowtie_distortion',
    title: 'Bowtie Distortion',
    metric: '4.8×2.0 km',
    metricColor: 'text-amber-300',
    description: 'At 55° scan angle, MODIS pixels expand by ~10× nadir area, creating adjacent swath overlaps.',
  },
  {
    id: 'scale_disparity',
    title: 'Scale Disparity',
    metric: '1:7 ratio',
    metricColor: 'text-emerald-300',
    description: 'A single 1,000 m MODIS footprint encompasses up to 7 distinct 375 m VIIRS pixels.',
  },
];
