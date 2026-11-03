# 🌌 NASA SPHEREx Mission & Planet X Challenge Dossier

---

## 🔭 1. SPHEREx Mission Overview
**SPHEREx** (*Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer*) is a NASA Astrophysics Medium-Class Explorer (MIDEX) mission designed to perform the first all-sky near-infrared spectral survey.

- **Primary Archive & Pipeline:** IPAC / Infrared Science Archive (IRSA) at Caltech.
- **Survey Cadence:** SPHEREx maps the entire celestial sphere once every 6 months. Over its 2-year nominal baseline, it completes **4 complete all-sky surveys** (Surveys 1, 2, 3, and 4).
- **Target Population:** Over 1 billion galaxies and more than 100 million stellar and substellar objects within the Milky Way, alongside transient and Solar System objects.

---

## 🌈 2. Optical Architecture & 102 Spectral Bands
Unlike classical filter wheels, SPHEREx mounts **Linear Variable Filters (LVFs)** directly on top of six $2048 \times 2048$ Teledyne H2RG HgCdTe detector arrays (active pixel scale $\approx 6.15^{\prime\prime}/\text{pixel}$). The central wavelength transmitted across the detector varies smoothly along one spatial dimension, allowing the telescope to acquire spectra as it scans across the sky.

A dichroic beamsplitter divides the incoming light into two channels:
1. **Short-Wavelength Channel (SWIR: 0.75 – 2.42 µm)**
2. **Mid-Wavelength Channel (MWIR: 2.42 – 5.00 µm)**

### The 6 Detector Bands & 102 Wavelength Channels

| Detector Array | Wavelength Range ($\lambda$) | Resolving Power ($R = \lambda/\Delta\lambda$) | Nominal Channels | Spectral Features Detected |
| :---: | :---: | :---: | :---: | :--- |
| **Band 1** | $0.75 - 1.09\text{ }\mu\text{m}$ | $R \approx 39$ | 17 channels | Near-IR continuum, early-type stars, high-z Lyman break |
| **Band 2** | $1.10 - 1.62\text{ }\mu\text{m}$ | $R \approx 41$ | 17 channels | $J$-band, Water vapor absorption in Brown Dwarfs |
| **Band 3** | $1.63 - 2.41\text{ }\mu\text{m}$ | $R \approx 41$ | 17 channels | $H$ & $K$-bands, CO bands, Methane ($\text{CH}_4$) features |
| **Band 4** | $2.42 - 3.82\text{ }\mu\text{m}$ | $R \approx 35$ | 17 channels | Polycyclic Aromatic Hydrocarbons (PAHs), Water Ice ($3.05\text{ }\mu\text{m}$) |
| **Band 5** | $3.83 - 4.41\text{ }\mu\text{m}$ | $R \approx 112$ | 17 channels | Carbon Dioxide Ice ($\text{CO}_2$ at $4.27\text{ }\mu\text{m}$), CO gas |
| **Band 6** | $4.40 - 5.00\text{ }\mu\text{m}$ | $R \approx 128$ | 17 channels | Carbon Monoxide Ice ($\text{CO}$ at $4.67\text{ }\mu\text{m}$), Cold Substellar objects |

**Total:** $6 \times 17 = 102$ spectrophotometric channels spanning continuously from $0.75\text{ }\mu\text{m}$ to $5.00\text{ }\mu\text{m}$.

---

## 🪐 3. The Search for Planet X & Moving Celestial Bodies

### Why SPHEREx Can Spot Planet X
1. **Hypothetical Planet Nine / Planet X:**
   - Predicted semi-major axis: $a \approx 300 - 700\text{ AU}$.
   - Apparent magnitude: Extremely faint in optical ($V > 22$), but glows via residual internal thermal heat and reflected sunlight in the mid-infrared ($3 - 5\text{ }\mu\text{m}$), precisely matching SPHEREx Bands 4, 5, and 6.
2. **Parallax and Proper Motion:**
   - Because SPHEREx surveys the full sky every 6 months, an object located within our solar system will exhibit substantial **annual parallax displacement** $\pi$ relative to background stars:
     $$\pi = \frac{1\text{ AU}}{d}$$
     For an object at $d = 400\text{ AU}$, $\pi \approx \frac{1}{400}\text{ rad} \approx 515^{\prime\prime}$ (several tens to hundreds of SPHEREx pixels across opposite sides of Earth's orbit).
   - Fast-moving Kuiper Belt Objects (KBOs), Centaurs, comets, and near-Earth asteroids will exhibit even larger displacements between epochs.
   - Ultra-cool brown dwarfs (Y and T dwarfs) in the solar neighborhood display high proper motion ($\mu \ge 0.5^{\prime\prime}/\text{year}$).

---

## 🔬 4. Core Algorithmic Techniques

### 4.1. Blink Comparator (Tombaugh Technique)
Invented in 1929 by Clyde Tombaugh to discover Pluto at Lowell Observatory:
- Alternating rapidly between two photographic plates/digital frames taken at different times of the identical sky coordinates ($\alpha, \delta$).
- Stationary background stars and distant galaxies remain static.
- Shifting objects (asteroids, planets) visibly "jump" or "blink" back and forth, enabling immediate human cognitive pattern recognition.

### 4.2. Difference Imaging Analysis (DIA)
Difference imaging algebraically subtracts normalized flux matrices:
$$\Delta I(x, y) = I_{\text{Epoch 2}}(x, y) - I_{\text{Epoch 1}}(x, y)$$

- Static stars yield $\Delta I(x, y) \approx 0$ (within Gaussian noise threshold $\sigma$).
- A moving object creates a distinctive bipolar feature:
  - A negative flux deficit (dark hole) at position $(x_1, y_1)$ where it used to be in Epoch 1.
  - A positive flux excess (bright spot) at position $(x_2, y_2)$ where it moved in Epoch 2.
- Candidate detection extracts all centroids where:
  $$\frac{|\Delta I(x, y)|}{\sigma_{\text{bg}}} > \kappa_{\text{threshold}}$$
  (typically $\kappa \ge 4.5\sigma$).

### 4.3. Astrometric Coordinate Transformation (AstroPy WCS)
Mapping between CCD pixel coordinates $(x, y)$ and celestial Right Ascension / Declination $(\alpha, \delta)$:
$$\begin{pmatrix} \xi \\ \eta \end{pmatrix} = \mathbf{CD} \cdot \begin{pmatrix} x - x_{\text{ref}} \\ y - y_{\text{ref}} \end{pmatrix}$$
followed by the tangent plane projection:
$$\alpha = \alpha_0 + \arctan\left(\frac{\xi}{\cos\delta_0 - \eta\sin\delta_0}\right)$$
$$\delta = \arcsin\left(\frac{\sin\delta_0 + \eta\cos\delta_0}{\sqrt{1 + \xi^2 + \eta^2}}\right)$$

---

## 🏆 5. Web Tool Functional Blueprint

```mermaid
flowchart LR
    A["User Inputs (RA, Dec, Band)"] --> B["FastAPI Backend (AstroPy Engine)"]
    B --> C["Extract Cutout Epoch 1 (2025-04)"]
    B --> D["Extract Cutout Epoch 2 (2025-10)"]
    C & D --> E["Difference Engine (Delta I)"]
    E --> F["Moving Candidate Centroid Detection"]
    F --> G["Interactive Sky Viewer (Side-by-Side / Blink / Diff)"]
    G --> H["Citizen Science Flagging (Log RA/Dec & Export)"]
```
