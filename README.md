# 🛰️ Harmonization of MODIS and VIIRS Hot Spots
### NASA Space Apps Challenge 2026 — Track 04 (Data & AI)

[![NASA FIRMS](https://img.shields.io/badge/NASA-FIRMS_Active_Fire-FC3D21.svg)](https://firms.modaps.eosdis.nasa.gov/)
[![Python](https://img.shields.io/badge/Python-3.14-3776AB.svg)](https://www.python.org/)
[![GeoPandas](https://img.shields.io/badge/GeoPandas-1.2.0-green.svg)](https://geopandas.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg)](https://leafletjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162-009688.svg)](https://fastapi.tiangolo.com/)

---

## 📌 1. Executive Summary & Problem Statement
NASA's Fire Information for Resource Management System (**FIRMS**) provides active fire and thermal anomaly detections worldwide across two flagship satellite sensor families:
1. **MODIS (Terra & Aqua):** Nominal spatial resolution of **1 km** at nadir (expanding up to ~2.0 × 4.8 km towards swath edges due to panoramic bow-tie scan distortion). Continuous confidence score $[0 - 100\%]$.
2. **VIIRS (Suomi-NPP, NOAA-20, NOAA-21):** High-resolution **375 m** (I-band channels), detecting active fires $7\times$ to $10\times$ smaller in area than the MODIS threshold. Categorical confidence (`low`, `nominal`, `high`).

### ⚠️ The Core Scientific Challenges
- **Orbital Overlap & Double-Counting:** Aqua, NOAA-20, and NOAA-21 orbit Earth in afternoon sun-synchronous tracks separated by **20 to 50 minutes**. Direct concatenation causes **artificial double-counting (27% to 43%)** of the same active fire front and inflates Fire Radiative Power (FRP).
- **Footprint Scale & Bow-Tie Mismatch:** A single MODIS pixel covers the area of ~7–9 VIIRS 375m pixels at nadir and even more off-nadir (`scan × track`). Naive coordinate merging either degrades spatial accuracy or splits single fire fronts.
- **Incompatible Confidence Metrics:** MODIS outputs numerical percentages ($0\text{–}100\%$), whereas VIIRS outputs categorical tiers (`l`, `n`, `h`).

### 🎯 Our Harmonization Solution
We engineered a scientifically rigorous harmonization pipeline and interactive GIS platform that:
1. **Performs True Anisotropic Elliptical-Footprint Spatio-Temporal DBSCAN (`ST-DBSCAN`):** Groups multi-satellite detections using geodesic Haversine distance and anisotropic cross-track (`scan`, East-West) / along-track (`track`, North-South) bow-tie footprint matching ($\epsilon_{\text{dist}} = 1.25\,\text{km}$) with a continuous sliding temporal window ($\Delta t_{\text{max}} = 3.0\,\text{hours}$), preventing artificial `12:00 UTC` boundary splits, morning/afternoon false merges, and North-South over-merging from elongated off-nadir MODIS pixels.
2. **Upgrades Spatial Resolution via Radiative Flux-Density Weighting:** Localizes multi-hit clusters via radiative flux-density weighted centroids $w_i = \frac{\text{FRP}_i + 0.1}{\max(0.05, \text{scan}_i \times \text{track}_i)}$ of 375m VIIRS detections, retaining **375m ground precision for 85.7% of regional fire events** and prioritizing sharp nadir 375m pixels over smeared swath-edge pixels.
3. **Applies Satellite-Independent Bayesian Confidence Fusion:** Applies Laplace clamping $[0.05, 0.99]$ to MODIS confidence and aggregates detections per distinct satellite pass ($s \in \{\text{Terra}, \text{Aqua}, \text{NOAA-20}, \text{NOAA-21}\}$) before applying independent Bayesian probability fusion, preventing false confidence inflation from adjacent single-pass pixels.
4. **Reconciles Pass-Level Fire Radiative Power (FRP):** Sums sub-kilometer pixel FRP within each individual satellite overpass first, then takes the maximum across overlapping satellites ($\max_s \sum_{i \in s} \text{FRP}_i$) so energy is neither underestimated nor double-counted between NOAA-20 and NOAA-21.
5. **Provides Dual Temporal Analytics with Leave-One-Year-Out Jackknife Z-Scores:** Pairs **100% empirical 7-day daily NASA FIRMS telemetry (Nov 03–10, 2026)** with a **2018–2026 Agro-Ecological ENSO Reference Matrix** across all 63 Vietnam provinces and 7 global macro-regions, using Leave-One-Year-Out (Jackknife) baselines $(\mu_{m,-y}, \sigma_{m,-y})$ so extreme El Niño drought years do not mask their own anomaly Z-scores.

---

## 🧠 2. Mathematical Formulation

```
[Raw MODIS 1km CSV]             [Raw VIIRS 375m CSVs (NOAA-20 & NOAA-21)]
         │                                         │
         ▼                                         ▼
 [Schema Standardization, Bow-Tie Footprint & UTC Timestamp Parsing]
         │                                         │
         └────────────────────┬────────────────────┘
                              ▼
     [Anisotropic Elliptical-Footprint Spatio-Temporal DBSCAN]
      ((Δx/a_EW)² + (Δy/b_NS)² ≤ 1, ε = 1.25 km, Δt ≤ 3.0 h)
                              │
                              ▼
       [375m VIIRS Radiative Flux-Density Weighted Centroid]
                              │
                              ▼
    [Pass-Reconciled FRP & Independent Satellite Bayesian Fusion]
                              │
                              ▼
            [Unified Harmonized Fire Event Catalog]
              (Exported to GeoJSON & Live REST API)
```

### 2.1 Anisotropic Elliptical-Footprint Spatio-Temporal Clustering (ST-DBSCAN)
Two detections $p_i = (\phi_i, \lambda_i, t_i)$ and $p_j = (\phi_j, \lambda_j, t_j)$ with cross-track width $\text{scan}_k$ and along-track height $\text{track}_k$ belong to the same physical fire event iff their local tangent-plane offsets $\Delta x = 111.195 \cos\bar{\phi}\,\Delta\lambda$ and $\Delta y = 111.195\,\Delta\phi$ satisfy:
$$\mathcal{D}_{\text{haversine}}(p_i, p_j) \le \epsilon_{\text{dist}} \quad \text{or} \quad \left(\frac{\Delta x}{a_{\text{EW}}}\right)^2 + \left(\frac{\Delta y}{b_{\text{NS}}}\right)^2 \le 1.0$$
where $a_{\text{EW}} = \min(\epsilon_{\max},\, \max(\epsilon_{\text{dist}},\, 0.5(\text{scan}_i + \text{scan}_j) + 0.35))$ and $b_{\text{NS}} = \min(\epsilon_{\max},\, \max(\epsilon_{\text{dist}},\, 0.5(\text{track}_i + \text{track}_j) + 0.55))$, subject to the sliding temporal window constraint:
$$|t_i - t_j| \le \Delta t_{\text{max}} \quad \text{and} \quad (t_{\max} - t_{\min}) \le \Delta t_{\text{max}} \quad (\Delta t_{\text{max}} = 3.0\,\text{hours})$$

### 2.2 Radiative Flux-Density Weighted Spatial Centroid (375m Refinement)
For each cluster $C_k$, let $R_k$ be the subset of 375m VIIRS detections in $C_k$ (or all detections if MODIS-only). Weighting each pixel by its radiative flux density $w_i = \frac{\text{FRP}_i + 0.1}{\max(0.05,\, \text{scan}_i \times \text{track}_i)}$ yields:
$$\bar{\mathbf{x}}_k = \frac{\sum_{i \in R_k} w_i \cdot \mathbf{x}_i}{\sum_{i \in R_k} w_i}$$

### 2.3 Satellite-Independent Bayesian Confidence Fusion & Pass-Reconciled FRP
Let $S_k$ be the set of distinct satellites observing cluster $C_k$. For each satellite $s \in S_k$ with pass confidence $P_s = \max_{i \in s} C_{\text{norm}, i}$ (with MODIS confidence Laplace-clamped to $[0.05, 0.99]$):
$$P_{\text{harm}}(C_k) = 1 - \prod_{s \in S_k} (1 - P_s)$$
$$\text{FRP}_{\text{harm}}(C_k) = \max_{s \in S_k} \left( \sum_{i \in C_{k,s}} \text{FRP}_i \right)$$

---

## 📊 3. Verified Quantitative Harmonization Results

| Scope / Dataset | Raw MODIS | Raw VIIRS (N20+N21) | Total Raw | Harmonized Events | Deduplication Rate | 375m Precision Ratio | Multi-Sat / Dual Verified | Reconciled Total FRP |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Regional BBox (7-Day)** | 198 | 1,324 | 1,522 | **1,078** | **29.17%** | **85.7%** | **120** (12 MODIS+VIIRS) | **7,831.8 MW** (7.27 MW/event) |
| **Vietnam Strict Borders (7-Day)** | 144 | 790 | 934 | **680** | **27.19%** | **83.1%** | **58** (6 MODIS+VIIRS) | **5,539.7 MW** (8.15 MW/event) |
| **Global 24-Hour Feed** | 13,457 | 140,491 | 153,948 | **87,311** | **43.29%** | **87.0%** | **962** MODIS+VIIRS | **1,749,272.1 MW** (20.03 MW/event) |

---

## 🗺️ 4. Interactive GIS Dashboard Features

Access the live platform at **[http://localhost:8000](http://localhost:8000)**:
- **Live ST-DBSCAN Parameter Tuning (`/api/harmonize`):** Adjust $\epsilon_{\text{dist}}$ (`0.25–5.0 km`), $\Delta t_{\text{max}}$ (`0.5–24.0 h`), bow-tie footprint matching, acquisition date, and day/night orbital pass in real time.
- **Regional BBox vs. Strict Vietnam Borders Toggle:** Switch seamlessly between the regional Indochina bounding box (`1,522` raw $\to$ `1,078` harmonized) and strict Vietnam administrative polygons (`934` raw $\to$ `680` harmonized).
- **4 Real-Time View Modes:** Harmonized Catalog, MODIS Only (1km), VIIRS Only (375m), and Comparative Multi-Layer Overlay with ground-scale sensor footprint circles (`1km+` vs `375m`).
- **Spotlight Dual-Verified Cluster:** One-click camera fly-to and popup inspection of the highest-energy MODIS+VIIRS corroborated fire front.
- **7-Day Empirical Telemetry + 2018–2026 Climatological Calendar:** Inspect day-by-day observed FIRMS counts alongside the 108-month ENSO anomaly matrix across 63 Vietnam provinces and 7 global macro-regions.

---

## 🚀 5. Quickstart & Verification Guide

### 1. Install Dependencies (Optional — Pure-Python Fallback Built-In)
```bash
pip install -r requirements.txt
```
*(Note: `backend/harmonizer.py`, `backend/build_dataset.py`, and `backend/server.py` also include a zero-dependency Python standard-library execution mode if `pandas`/`geopandas`/`fastapi` are not installed).*

### 2. Run Scientific Unit Tests
```bash
python -m unittest backend/test_harmonizer.py
```

### 3. Rebuild All Harmonized Datasets (Regional + Global)
```bash
python backend/build_dataset.py
python backend/build_global_dataset.py
```

### 4. Launch the Live Application Server
```bash
python backend/server.py
```
👉 Open browser: **http://localhost:8000**  
👉 Live Harmonization API: **http://localhost:8000/api/harmonize?eps_km=1.25&time_window_hours=3.0&use_footprint=true**

---

## 📁 6. Repository Layout
```text
├── backend/
│   ├── harmonizer.py            # Core ST-DBSCAN, Footprint & Bayesian Fusion engine
│   ├── build_dataset.py         # Regional 7d & unified multi-year calendar pipeline
│   ├── build_global_dataset.py  # Global 24h harmonization pipeline
│   ├── server.py                # FastAPI / HTTP server hosting REST API & React client
│   └── test_harmonizer.py       # Unit tests for ST-DBSCAN, footprints & FRP reconciliation
├── data/
│   ├── raw/                     # Raw NASA FIRMS CSV feeds (MODIS & VIIRS 7d + Global 24h)
│   └── geojson/                 # Vietnam administrative boundary GeoJSON
├── frontend/
│   ├── public/data/             # Harmonized GeoJSONs, analytics summary & calendar matrix
│   ├── src/components/          # React 19 UI components (Header, MapViewer, Calendar, etc.)
│   └── dist/                    # Production-compiled bundle
├── notebooks/
│   └── Harmonization_MODIS_VIIRS.ipynb # Scientific Jupyter notebook
├── requirements.txt             # Python dependencies
└── README.md                    # Documentation & hackathon guide
```
