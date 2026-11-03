# SPHEREx & Planet X Fullstack MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, working Fullstack MVP for the NASA Space Apps Challenge "Planet X and SPHEREx", including AstroPy-powered FITS processing, astrometry coordinates, multi-epoch blink comparison / difference imaging, and an interactive web UI.

**Architecture:** Split fullstack architecture: a Python FastAPI backend leveraging AstroPy (`astropy.io.fits`, `astropy.wcs`, `astropy.coordinates`) to generate and parse multi-epoch SPHEREx spectral FITS data with realistic celestial WCS astrometry; coupled with a modern React + Tailwind web frontend providing interactive RA/Dec navigation, 102-band spectral selection, side-by-side epoch viewer, rapid blink comparator, difference frame visualization, and candidate flagging.

**Tech Stack:**
- **Backend:** Python 3.10+ (Conda environment `pds301m`), FastAPI, Uvicorn, AstroPy 6.1+, NumPy 2.2+, SciPy, Matplotlib/Pillow.
- **Frontend:** React 19 / Vite, Tailwind CSS, Lucide Icons, HTML5 Canvas.
- **Docs & Ops:** Markdown, Conda, PowerShell orchestration.

**Spec:** Challenge Statement "Planet X and SPHEREx" (NASA Space Apps Challenge 2026 / 102 NIR bands / 6-month survey epochs / celestial motion & transients discovery).

## Global Constraints
- Python backend executed via Conda environment `pds301m` (`C:\Users\LENOVO\miniconda3\envs\pds301m\python.exe`).
- All scientific data and metadata must strictly adhere to SPHEREx instrument specs (102 bands, 6 detector arrays, 0.75 - 5.0 µm, FITS format with standard WCS headers).
- Open-source MIT License and complete reproducibility for NASA judges.
- No banned shell commands (no git push, no forced deletions, no destructive operations).

## Review Focus
- **Input Validation:** Coordinate bounds for RA ($[0^\circ, 360^\circ)$) and Dec ($[-90^\circ, +90^\circ]$) must be sanitized and normalized.
- **Astrometric Precision:** World Coordinate System (WCS) transformation between pixel coordinates $(x, y)$ and celestial coordinates $(\alpha, \delta)$ must round-trip accurately within $\pm 0.1''$.
- **Blink & Difference Alignment:** Difference frames $\Delta I = I_{E2} - I_{E1}$ must handle floating-point background noise floor and highlight moving objects clearly without blowing out contrast.
- **Detector Band Grouping:** All 102 spectral channels must correctly map to their parent detector arrays (Bands 1 to 6) and corresponding wavelength intervals.
- **Zero-Failure Offline Demo:** Mock SPHEREx FITS generators must generate instant, reproducible survey fields even if external NASA IRSA network endpoints are unreachable during judging.

---

### Task 1: Repository Documentation, Governance & Master Workspace Sync
- [ ] Create `docs/` directory.
- [ ] Sync the 5 Master Google Docs tabs into structured Markdown files:
  - `docs/01_information_and_team.md`
  - `docs/02_resources_and_tech_stack.md`
  - `docs/03_sprint_plan_and_roadmap.md`
  - `docs/04_official_submission_draft.md`
  - `docs/05_pitch_deck_and_video_script.md`
- [ ] Create `docs/spherex_challenge_dossier.md` detailing the SPHEREx mission architecture (LVFs, 6 bands, 102 channels, motion detection theory for Planet X / Kuiper Belt / asteroids).
- [ ] Create root `.gitignore` tailored for Python, Node, Vite, FITS datasets, and Conda.
- [ ] Create `LICENSE` (MIT License).

### Task 2: Backend AstroPy FITS & Astrometry Engine
- [ ] Create `backend/` directory structure (`backend/app/`, `backend/data/`, `backend/tests/`).
- [ ] Create `backend/requirements.txt` and `backend/environment.yml`.
- [ ] Implement `backend/app/fits_engine.py`:
  - AstroPy WCS creation (`astropy.wcs.WCS`) with TAN projection for celestial patches.
  - Multi-epoch synthetic SPHEREx FITS generator (`generate_spherex_field`): creates FITS with Primary HDU + Image HDU, containing background IR stars, noise, and an injected high-proper-motion candidate ("Planet X / Asteroid Candidate") that shifts by several arcseconds between Epoch 1 (2025-04) and Epoch 2 (2025-10).
  - Multi-band spectral variation: simulates brightness variation across SPHEREx's 102 bands (e.g. Methane/Water ice absorption profiles).
  - FITS to image slice converter (PNG/base64 output for web rendering with ZScale or linear/asinh stretch).
- [ ] Implement `backend/app/difference_engine.py`:
  - Computes difference matrix $\Delta I = \text{Epoch}_2 - \text{Epoch}_1$.
  - Runs threshold-based blob centroiding to extract pixel coordinates of shifting objects and transforms them back to celestial coordinates $(\alpha, \delta)$ via AstroPy WCS.

### Task 3: Backend FastAPI Service & Endpoints
- [ ] Implement `backend/app/main.py`:
  - CORS middleware enabled for frontend integration.
  - `GET /api/health`: Service status and AstroPy environment check.
  - `GET /api/spherex/bands`: Returns metadata for all 102 SPHEREx channels grouped into 6 detector arrays (SWIR 1-3, MWIR 4-6) with central wavelengths.
  - `GET /api/spherex/targets`: Preset notable sky coordinates for instant exploration (e.g., Planet X Candidate Search Field, Barnard's Star Proper Motion, Kuiper Belt Deep Patch).
  - `POST /api/spherex/cutout`: Queries coordinate (RA, Dec, band_id, epoch) and returns high-resolution rendered slice, FITS header summary, and celestial bounding box.
  - `POST /api/spherex/blink`: Takes RA, Dec, band_id and returns Epoch 1, Epoch 2, Difference frame, and auto-detected candidate moving objects with detected RA/Dec.
  - `POST /api/spherex/flag-candidate`: Saves citizen science candidate observations to local log.

### Task 4: Backend Automated Verification & Unit Tests
- [ ] Implement `backend/tests/test_fits_engine.py`:
  - Test WCS round-trip coordinate transformation (pixel $\leftrightarrow$ celestial).
  - Test FITS file generation and validity via `astropy.io.fits.verify()`.
  - Test difference engine detection accuracy for simulated moving objects.
- [ ] Implement `backend/tests/test_api.py`:
  - Test FastAPI endpoints using `TestClient`.
- [ ] Run test suite with pytest using `C:\Users\LENOVO\miniconda3\envs\pds301m\python.exe -m pytest backend/tests`.

### Task 5: Frontend Web Application
- [ ] Scaffold Vite + React + Tailwind frontend in `frontend/`.
- [ ] Create UI components:
  - `Navbar.tsx`: Header with NASA Space Apps branding, SPHEREx mission info badge, and quick links.
  - `CoordinateSearch.tsx`: RA/Dec inputs, preset target picker, Field of View (FOV) selector.
  - `BandSelector.tsx`: Interactive selector for 102 SPHEREx channels categorized into 6 detector arrays (Bands 1 to 6) with wavelength slider (0.75 µm to 5.0 µm).
  - `SkyViewer.tsx`: Canvas & image viewer supporting:
    - **Side-by-Side Mode**: Side-by-side visual inspection of Epoch 1 vs Epoch 2.
    - **Blink Comparator Mode**: Rapid periodic toggle between Epoch 1 and Epoch 2 with speed control (1 - 5 Hz) replicating Clyde Tombaugh's discovery method.
    - **Difference Frame Mode ($\Delta I$)**: Direct subtracted matrix highlighting flux shifts.
  - `AstrometryPanel.tsx`: Displays celestial coordinates under cursor, detected candidates list with click-to-center functionality.
  - `CandidateFlagModal.tsx`: Citizen science reporting form allowing users to submit new candidate celestial objects.
- [ ] Build and verify frontend compilation (`npm run build`).

### Task 6: Orchestration, Comprehensive README & Verification
- [ ] Create `run_dev.ps1` PowerShell script to launch both FastAPI backend and Vite frontend with a single command.
- [ ] Update root `README.md` with:
  - Project Overview & Scientific Motivation.
  - Interactive Web Tool Architecture (Mermaid Diagram).
  - Quickstart Guide (Conda + Node setup).
  - SPHEREx 102-Band Near-Infrared Spectrophotometry Guide.
  - Hackathon Deliverables checklist & Team credits.
- [ ] Commit all changes to branch `feat/spherex-fullstack-mvp`.
- [ ] Final verification of all deliverables.
