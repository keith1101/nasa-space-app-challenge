export interface AcademicReferenceItem {
  num: string;
  authors: string;
  year: string;
  title: string;
  journal: string;
  doi: string;
  url: string;
  note: string;
}

export const CANONICAL_BIBTEX = `@techreport{nasa_firms_harmonization_2026,
  author      = {NASA Space Apps Challenge Team},
  title       = {Anisotropic Swath Footprint ST-DBSCAN and Pass-Grouped Bayesian Fusion for Multi-Sensor MODIS and VIIRS Thermal Anomaly Harmonization},
  institution = {NASA Technical Memorandum},
  number      = {NASA-TM-2026-ST-DBSCAN-v2.2},
  year        = {2026},
  month       = {November},
  address     = {Washington, D.C.},
  url         = {https://firms.modaps.eosdis.nasa.gov/}
}`;

export const ACADEMIC_REFERENCES: AcademicReferenceItem[] = [
  {
    num: '[1]',
    authors: 'Giglio, L., Schroeder, W., & Justice, C. O.',
    year: '2016',
    title: 'The collection 6 MODIS active fire detection algorithm and fire products.',
    journal: 'Remote Sensing of Environment, 178, 31–41.',
    doi: '10.1016/j.rse.2016.02.054',
    url: 'https://doi.org/10.1016/j.rse.2016.02.054',
    note: 'Canonical MODIS Collection 6.1 active fire algorithm',
  },
  {
    num: '[2]',
    authors: 'Schroeder, W., Oliva, P., Giglio, L., & Csiszar, I. A.',
    year: '2014',
    title: 'The New VIIRS 375 m active fire detection product—Algorithm description and initial assessment.',
    journal: 'Remote Sensing of Environment, 143, 85–96.',
    doi: '10.1016/j.rse.2013.12.008',
    url: 'https://doi.org/10.1016/j.rse.2013.12.008',
    note: 'Scientific baseline for VIIRS 375 m I-band active fire product',
  },
  {
    num: '[3]',
    authors: 'Wooster, M. J., Roberts, G., Perry, G. L. W., & Kaufman, Y. J.',
    year: '2005',
    title: 'Retrieval of biomass combustion rates and totals from fire radiative power observations: FRP derivation and calibration relationships.',
    journal: 'Journal of Geophysical Research: Atmospheres, 110(D24).',
    doi: '10.1029/2005JD006318',
    url: 'https://doi.org/10.1029/2005JD006318',
    note: 'Physical derivation of Fire Radiative Power (FRP) and biomass rate',
  },
  {
    num: '[4]',
    authors: 'Ester, M., Kriegel, H.-P., Sander, J., & Xu, X.',
    year: '1996',
    title: 'A density-based algorithm for discovering clusters in large spatial databases with noise.',
    journal: 'Proceedings of KDD-96, 226–231.',
    doi: '10.5555/3001460.3001507',
    url: 'https://dl.acm.org/doi/10.5555/3001460.3001507',
    note: 'Foundational paper introducing the DBSCAN clustering algorithm',
  },
  {
    num: '[5]',
    authors: 'Birant, D., & Kut, A.',
    year: '2007',
    title: 'ST-DBSCAN: An algorithm for clustering spatial-temporal data.',
    journal: 'Data & Knowledge Engineering, 60(1), 208–221.',
    doi: '10.1016/j.datak.2006.01.013',
    url: 'https://doi.org/10.1016/j.datak.2006.01.013',
    note: 'Spatio-temporal extension of DBSCAN for multi-dimensional clustering',
  },
  {
    num: '[6]',
    authors: 'Wolfe, R. E., Nishihama, M., Fleig, A. J., Kuyper, J. A., Roy, D. P., Storey, J. C., & Patt, F. S.',
    year: '2002',
    title: 'Achieving sub-pixel geolocation accuracy in support of MODIS land science.',
    journal: 'Remote Sensing of Environment, 83(1-2), 31–49.',
    doi: '10.1016/S0034-4257(02)00085-8',
    url: 'https://doi.org/10.1016/S0034-4257(02)00085-8',
    note: 'Geometric geolocation accuracy and scan-angle bowtie expansion',
  },
];
