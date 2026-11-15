"""
Comprehensive Pitch Deck Typography & Spatial Layout Refiner
NASA Space Apps Challenge 2026 - Track 04 (Data & AI)

Fixes data and text collisions / overlaps across all slides:
1. Slide 7: Eliminates metric collisions between 154K, 87K, 85.7% and their labels by expanding
   bounding box widths (2.4" - 2.6"), optimizing font size (54pt), and vertically spacing labels
   and the benchmark status bar with generous margins (zero wrapping/overlapping).
2. Slide 6: Fixes overlap between '11 × 11 GRID' and '1 km² Cellular Automata' and spaces the 3 bullets cleanly.
3. Slide 3: Fits 4 methodology columns inside their cards without vertical overflow into status tags.
4. Slide 2: Spaces the 3 problem blocks with 0.5" clear margins.
5. All slides: Preserves 100% Inter typeface, presentation scale (15pt - 93.96pt), NASA brand colors,
   and comprehensive speaker notes.
"""

from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKUP_PATH = ROOT_DIR / "docs" / "NASA FIRMS Harmonization Platform.backup.pptx"
TARGET_PATH = ROOT_DIR / "docs" / "NASA FIRMS Harmonization Platform.pptx"


def set_box_geometry(shape, left=None, top=None, width=None, height=None):
    """Safely adjusts shape bounding box in inches."""
    if left is not None:
        shape.left = Inches(left)
    if top is not None:
        shape.top = Inches(top)
    if width is not None:
        shape.width = Inches(width)
    if height is not None:
        shape.height = Inches(height)


def apply_styled_content(shape, specs, left=None, top=None, width=None, height=None):
    """
    Applies structured text runs with explicit typography:
    font family ('Inter', 'Inter Bold', etc.), point size, bold/italic, and RGB color hex.
    Optionally adjusts the shape bounding box to prevent physical overlap.
    """
    if not shape.has_text_frame:
        return
        
    set_box_geometry(shape, left, top, width, height)
        
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.05)
    tf.margin_right = Inches(0.05)
    tf.margin_top = Inches(0.05)
    tf.margin_bottom = Inches(0.05)
    
    # If passed a flat list of dicts, treat as single paragraph
    if specs and isinstance(specs[0], dict):
        specs = [specs]
        
    # Clear extra paragraphs
    while len(tf.paragraphs) > 1:
        extra = tf.paragraphs[-1]
        extra._p.getparent().remove(extra._p)
        
    p0 = tf.paragraphs[0]
    p0.text = "" # Clears all runs
    
    for pi, para_runs in enumerate(specs):
        if pi == 0:
            p = p0
        else:
            p = tf.add_paragraph()
            
        for r_spec in para_runs:
            r = p.add_run()
            r.text = r_spec.get("text", "")
            r.font.name = r_spec.get("font", "Inter")
            if "size" in r_spec and r_spec["size"] is not None:
                r.font.size = Pt(r_spec["size"])
            if "bold" in r_spec and r_spec["bold"] is not None:
                r.font.bold = r_spec["bold"]
            if "italic" in r_spec and r_spec["italic"] is not None:
                r.font.italic = r_spec["italic"]
            if "color" in r_spec and r_spec["color"]:
                r.font.color.rgb = RGBColor.from_string(r_spec["color"])


def run_typography_refinement():
    if not BACKUP_PATH.exists():
        raise FileNotFoundError(f"Missing backup PPTX at: {BACKUP_PATH}")
        
    print(f"Loading pristine template from: {BACKUP_PATH}")
    prs = Presentation(BACKUP_PATH)
    
    # =========================================================================
    # SLIDE 1: Title & Executive Vision
    # =========================================================================
    s1 = prs.slides[0]
    for shape in s1.shapes:
        if shape.name == "TextBox 7":
            apply_styled_content(shape, [
                {"text": "NASA FIRMS", "font": "Inter Bold", "size": 93.96, "bold": True, "color": "F6F4F4"}
            ])
        elif shape.name == "TextBox 8":
            apply_styled_content(shape, [
                {"text": "GLOBAL MULTI-SENSOR ACTIVE-FIRE HARMONIZATION", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F6F4F4"}
            ])
        elif shape.name == "TextBox 9":
            apply_styled_content(shape, [
                {"text": "Harmonization Platform & Decision Support", "font": "Inter Bold", "size": 52.0, "bold": True, "color": "F6F4F4"}
            ])
        elif shape.name == "TextBox 10":
            apply_styled_content(shape, [
                {"text": "NASA Space Apps Challenge 2026 — Track 04: Data & AI", "font": "Inter Semi-Bold", "size": 20.0, "bold": True, "color": "1ED8F2"}
            ])
        elif shape.name == "TextBox 11":
            apply_styled_content(shape, [
                {"text": "One unified, physically coherent picture of active fire fronts with 375m spatial precision.", "font": "Inter", "size": 26.0, "bold": False, "color": "F6F4F4"}
            ])
        elif shape.name == "TextBox 12":
            apply_styled_content(shape, [
                {"text": "Team: ", "font": "Inter Bold", "size": 21.85, "bold": True, "color": "F6F4F4"},
                {"text": "Bé Dâu Vui Vẻ", "font": "Inter Italics", "size": 21.85, "bold": False, "color": "1ED8F2"}
            ])
            
    s1.notes_slide.notes_text_frame.text = (
        "EXECUTIVE SUMMARY & JUDGE REVIEW NOTES (SLIDE 1):\n"
        "- Project: Harmonization of MODIS and VIIRS Hot Spots (NASA Space Apps Challenge 2026, Track 04: Data & AI).\n"
        "- Team: Bé Dâu Vui Vẻ.\n"
        "- Mission: Global active fire management relies on NASA FIRMS thermal anomaly feeds. However, MODIS (1km) and VIIRS (375m) "
        "have differing overpass times, footprint geometries, and confidence formats. Concatenating raw feeds causes 27% to 43% "
        "double-counting of identical fire events and miscalculates total Fire Radiative Power (FRP).\n"
        "- Solution: An end-to-end mathematical harmonization pipeline featuring Anisotropic ST-DBSCAN clustering, Radiative "
        "Flux-Density Centroid refinement (retaining 375m resolution for 85.7% of events), Pass-Reconciled FRP, a 2018–2026 ENSO "
        "Fire Regime Matrix, and AI Tactical Decision Support verified on N = 50 real active fire events."
    )

    # =========================================================================
    # SLIDE 2: Why Multi-Sensor Harmonization Matters (Zero-Collision Layout)
    # =========================================================================
    s2 = prs.slides[1]
    for shape in s2.shapes:
        if shape.name == "TextBox 8":
            apply_styled_content(shape, [
                {"text": "Why multi-sensor harmonization matters", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "F8F8F8"}
            ], top=1.80, width=12.0)
        elif shape.name == "TextBox 9":
            apply_styled_content(shape, [
                [{"text": "Spatial Bow-Tie Distortion", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "00CCF5"}],
                [{"text": "MODIS (1 km nadir) expands to ~2.0 × 4.8 km at scan edges vs VIIRS 375m. A single edge MODIS pixel covers 10+ VIIRS detections.", "font": "Inter", "size": 17.0, "bold": False, "color": "F8F8F8"}]
            ], top=4.00, width=10.5, height=1.35)
        elif shape.name == "TextBox 10":
            apply_styled_content(shape, [
                [{"text": "Incompatible Confidence Scoring", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "00CCF5"}],
                [{"text": "MODIS continuous percentage [0%–100%] vs VIIRS categorical (low, nominal, high). Simple numerical averaging is mathematically invalid.", "font": "Inter", "size": 17.0, "bold": False, "color": "F8F8F8"}]
            ], top=5.75, width=10.5, height=1.35)
        elif shape.name == "TextBox 11":
            apply_styled_content(shape, [
                [{"text": "Orbital Overlap & Severe Double-Counting", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "F97305"}],
                [{"text": "Afternoon satellites (Aqua, NOAA-20/21) orbit 20–50 min apart. Naive concatenation creates 27% to 43% duplicate reports of identical fire fronts.", "font": "Inter", "size": 17.0, "bold": False, "color": "F8F8F8"}]
            ], top=7.50, width=10.5, height=1.35)
        elif shape.name == "TextBox 12":
            apply_styled_content(shape, [{"text": "MODIS", "font": "Inter Bold", "size": 21.21, "bold": True, "color": "00CCF5"}], left=12.70, top=8.75)
        elif shape.name == "TextBox 13":
            apply_styled_content(shape, [{"text": "27% – 43%\nDuplicates", "font": "Inter Bold", "size": 14.0, "bold": True, "color": "FF6B1B"}], left=14.00, top=8.60, width=1.70, height=0.65)
        elif shape.name == "TextBox 14":
            apply_styled_content(shape, [{"text": "VIIRS", "font": "Inter Bold", "size": 21.21, "bold": True, "color": "F97305"}], left=16.15, top=8.75)

    s2.notes_slide.notes_text_frame.text = (
        "CORE PROBLEM STATEMENT & SCIENTIFIC DISCREPANCIES (SLIDE 2):\n"
        "1. Spatial Geometry Discrepancy:\n"
        "   MODIS pixels grow from 1.0 km at nadir to nearly 2.0 km cross-track by 4.8 km along-track at scan edges. "
        "   In contrast, VIIRS uses 375m I-band pixels with on-board aggregation limiting growth to 0.8 km at scan edges. "
        "   A single edge MODIS pixel can cover 10+ VIIRS pixels.\n"
        "2. Temporal & Overpass Overlap:\n"
        "   Aqua (MODIS), NOAA-20 (VIIRS), and NOAA-21 (VIIRS) follow sun-synchronous afternoon orbits separated by only 20–50 min. "
        "   Both sensors observe the exact same advancing flame front, causing 27%–43% duplicate reports.\n"
        "3. Confidence Metric Incompatibility:\n"
        "   MODIS confidence is based on contextual thermal contrast (0-100%). VIIRS is rule-based categorical (low, nominal, high). "
        "   They cannot be concatenated or averaged without probabilistic harmonization."
    )

    # =========================================================================
    # SLIDE 3: 4-Step Mathematical Harmonization Methodology
    # =========================================================================
    s3 = prs.slides[2]
    for shape in s3.shapes:
        if shape.name == "TextBox 3":
            apply_styled_content(shape, [
                {"text": "A transparent, physically grounded harmonization path", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F8F8F8"}
            ], top=0.90, width=15.0)
        elif shape.name == "TextBox 5":
            apply_styled_content(shape, [{"text": "1", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], top=3.75)
        elif shape.name == "TextBox 6":
            apply_styled_content(shape, [
                [{"text": "Standardize", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Parse UTC timestamps and project coordinates into local tangent-plane geodesic offsets (Δx, Δy).", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], left=1.15, top=4.70, width=2.90, height=2.00)
        elif shape.name == "TextBox 8":
            apply_styled_content(shape, [{"text": "MODIS", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "00CCF5"}], top=7.25)
        elif shape.name == "TextBox 10":
            apply_styled_content(shape, [{"text": "VIIRS", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "F97305"}], top=8.20)
        elif shape.name == "TextBox 12":
            apply_styled_content(shape, [{"text": "2", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], top=3.75)
        elif shape.name == "TextBox 13":
            apply_styled_content(shape, [
                [{"text": "Match (ST-DBSCAN)", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Dynamic elliptical footprints: (Δx/a_EW)² + (Δy/b_NS)² ≤ 1.0 with continuous sliding window Δt ≤ 3.0h.", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], left=5.10, top=4.70, width=2.90, height=2.00)
        elif shape.name == "TextBox 19":
            apply_styled_content(shape, [{"text": "3", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], top=3.75)
        elif shape.name == "TextBox 20":
            apply_styled_content(shape, [
                [{"text": "Reconcile (375m & FRP)", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Flux-density centroid (85.7% at 375m). Pass-reconciled FRP: max_s (Σ FRP_i) avoids double-counting.", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], left=8.95, top=4.70, width=2.90, height=2.00)
        elif shape.name == "TextBox 24":
            apply_styled_content(shape, [{"text": "4", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], top=3.75)
        elif shape.name == "TextBox 25":
            apply_styled_content(shape, [
                [{"text": "Enrich (Land Cover)", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Sample MODIS MCD12Q1 land cover and apply independent Bayesian confidence fusion [0.05, 0.99].", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], left=12.85, top=4.70, width=2.90, height=2.00)
        elif shape.name == "TextBox 27":
            apply_styled_content(shape, [{"text": "MODIS MCD12Q1 LC Type 1", "font": "Inter Semi-Bold", "size": 18.0, "bold": True, "color": "F8F8F8"}], top=7.30)
        elif shape.name == "TextBox 30":
            apply_styled_content(shape, [{"text": "Land cover status:", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "F8F8F8"}])
        elif shape.name == "TextBox 32":
            apply_styled_content(shape, [{"text": "covered", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "10E8FA"}])
        elif shape.name == "TextBox 34":
            apply_styled_content(shape, [{"text": "unknown", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "FF6B1B"}])

    s3.notes_slide.notes_text_frame.text = (
        "MATHEMATICAL METHODOLOGY (SLIDE 3):\n"
        "1. Anisotropic ST-DBSCAN:\n"
        "   We model pixel footprint elongation with semi-axes:\n"
        "   a_EW = min(eps_max, max(eps_dist, 0.5*(scan_i + scan_j) + 0.35))\n"
        "   b_NS = min(eps_max, max(eps_dist, 0.5*(track_i + track_j) + 0.55))\n"
        "   Clustering condition: (Δx/a_EW)^2 + (Δy/b_NS)^2 <= 1.0 within Δt <= 3.0 hours.\n"
        "2. 375m Resolution Refinement:\n"
        "   Rather than simple arithmetic centroiding, we weight by radiative flux density w_i = (FRP_i + 0.1) / (scan_i * track_i). "
        "   Nadir 375m VIIRS pixels dominate over blurred 2x4.8km swath-edge pixels, preserving 375m ground precision for 85.7% of clusters.\n"
        "3. Pass-Reconciled FRP:\n"
        "   Sub-kilometer pixels within the same satellite overpass are summed, but energy across overlapping satellites is reconciled "
        "   using max_s(Σ FRP) to avoid doubling energy between NOAA-20 and NOAA-21."
    )

    # =========================================================================
    # SLIDE 4: The Harmonized Calendar & Regime Matrix
    # =========================================================================
    s4 = prs.slides[3]
    for shape in s4.shapes:
        if shape.name == "TextBox 12":
            apply_styled_content(shape, [
                {"text": "The harmonized calendar & regime matrix is the ", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F8F8F8"},
                {"text": "core solution", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "2AE2FF"}
            ])
        elif shape.name == "TextBox 5":
            apply_styled_content(shape, [
                {"text": "Leave-One-Year-Out (Jackknife) Z-Scores & MCD12Q1 Land Cover Filtering", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}
            ])
        elif shape.name == "TextBox 6":
            apply_styled_content(shape, [
                {"text": "Unified 2018–2026 Fire Regime Baseline (108-Month Agro-Ecological Matrix)", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}
            ])
        elif shape.name == "TextBox 11":
            apply_styled_content(shape, [
                {"text": "Interactive Global 3D Map with FIRMS Live Feeds & Footprint Circles", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}
            ])

    s4.notes_slide.notes_text_frame.text = (
        "CORE SOLUTION & CLIMATOLOGICAL ANALYTICS (SLIDE 4):\n"
        "- Dual Temporal Framework: Pairs 100% empirical 7-day daily FIRMS observations with a 108-month agro-ecological baseline (2018-2026).\n"
        "- Jackknife (Leave-One-Year-Out) Z-Score Formulation:\n"
        "  Z_m,y = (Count_m,y - μ_m,-y) / σ_m,-y where baseline statistics exclude year y. "
        "  This prevents catastrophic El Niño drought fire seasons (e.g. 2019, 2023) from skewing their own reference mean and hiding anomalies.\n"
        "- Interactive UI: Multi-layer overlay showing ground-scale footprints (1km+ vs 375m circles), MODIS/VIIRS toggle, and dual-confirmed cluster inspection."
    )

    # =========================================================================
    # SLIDE 5: Production Architecture & Operational Boundaries
    # =========================================================================
    s5 = prs.slides[4]
    for shape in s5.shapes:
        if shape.name == "TextBox 16":
            apply_styled_content(shape, [{"text": "01", "font": "Inter Bold", "size": 150.0, "bold": True, "color": "25D6F8"}])
        elif shape.name == "TextBox 17":
            apply_styled_content(shape, [
                [{"text": "A working product", "font": "Inter Bold", "size": 52.0, "bold": True, "color": "F8F8F8"}],
                [{"text": "with clear access limits", "font": "Inter Bold", "size": 52.0, "bold": True, "color": "25D6F8"}]
            ])
        elif shape.name == "TextBox 11":
            apply_styled_content(shape, [
                {"text": "The complete production architecture and harmonization pipeline are fully operational.", "font": "Inter Medium", "size": 23.0, "bold": True, "color": "FFFFFF"}
            ])
        elif shape.name == "TextBox 18":
            apply_styled_content(shape, [
                [{"text": "NASA FIRMS API", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "& Offline Cache", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}]
            ])
        elif shape.name == "TextBox 19":
            apply_styled_content(shape, [
                [{"text": "Python FastAPI", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "Backend Core", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}]
            ])
        elif shape.name == "TextBox 20":
            apply_styled_content(shape, [
                [{"text": "ST-DBSCAN Clustering", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "& GeoTIFF Lookup", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}]
            ])
        elif shape.name == "TextBox 21":
            apply_styled_content(shape, [
                [{"text": "React 19 / MapLibre 3D", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "& Cockpit HUD", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}]
            ])
        elif shape.name == "TextBox 22":
            apply_styled_content(shape, [
                {"text": "Live access depends on NASA FIRMS API availability (automated 15-min disk cache & offline CSV fallback).", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}
            ])
        elif shape.name == "TextBox 23":
            apply_styled_content(shape, [
                {"text": "Raster-derived context (MCD12Q1 biome & DEM elevation) is bounded by spatial tile coverage.", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}
            ])

    s5.notes_slide.notes_text_frame.text = (
        "SYSTEM ARCHITECTURE & PRODUCTION RESILIENCE (SLIDE 5):\n"
        "- Tier 1: Live FIRMS Ingestion with exponential backoff, 15-minute disk caching, and zero-dependency local CSV fallback for disconnected operation.\n"
        "- Tier 2: Asynchronous Python FastAPI engine running optimized ST-DBSCAN (scipy KDTree/spatial index O(N log N)), GeoTIFF raster sampling, "
        "Jackknife statistical baselines, and local Forward Operating Base (FOB) flight distance routing.\n"
        "- Tier 3: React 19 client with MapLibre GL v6 3D Terrain, real-time GPU hillshading (CORS-enabled DEM tiles), ECharts analytics, and Tactical Cockpit HUD.\n"
        "- Transparency: Clear engineering limits are acknowledged—we explicitly state dependency on API uptime and spatial raster bounds."
    )

    # =========================================================================
    # SLIDE 6: Multi-Horizon Simulation & AI Decision Support (Zero-Collision)
    # =========================================================================
    s6 = prs.slides[5]
    for shape in s6.shapes:
        if shape.name == "TextBox 3":
            apply_styled_content(shape, [
                {"text": "Multi-horizon spread simulation & calibrated tactical decision support", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "FFFFFF"}
            ], top=0.25, width=15.20)
        elif shape.name == "TextBox 4":
            apply_styled_content(shape, [{"text": "11 × 11 GRID", "font": "Inter Semi-Bold", "size": 32.0, "bold": True, "color": "FFFFFF"}], top=2.50, width=3.20, height=0.40)
        elif shape.name == "TextBox 5":
            apply_styled_content(shape, [{"text": "1 km² Cellular Automata", "font": "Inter", "size": 16.0, "bold": False, "color": "FFFFFF"}], top=2.95, width=3.20, height=0.35)
        elif shape.name == "TextBox 9":
            apply_styled_content(shape, [{"text": "Inputs", "font": "Inter Semi-Bold", "size": 30.0, "bold": True, "color": "00C9F1"}], top=2.76)
        elif shape.name == "TextBox 11":
            apply_styled_content(shape, [{"text": "wind", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}])
        elif shape.name == "TextBox 26":
            apply_styled_content(shape, [{"text": "humidity", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}])
        elif shape.name == "TextBox 14":
            apply_styled_content(shape, [{"text": "rain", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}])
        elif shape.name == "TextBox 16":
            apply_styled_content(shape, [{"text": "vegetation", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}])
        elif shape.name == "TextBox 18":
            apply_styled_content(shape, [{"text": "6 / 12 / 24-hour", "font": "Inter Semi-Bold", "size": 30.0, "bold": True, "color": "00C9F1"}], top=5.25)
        elif shape.name == "TextBox 19":
            apply_styled_content(shape, [{"text": "relative spread & persistence indices", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}], top=5.75)
        elif shape.name == "TextBox 20":
            apply_styled_content(shape, [
                {"text": "• 11×11 Cellular Automata: Modeling relative spread potential across 6h, 12h, and 24h horizons.", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}
            ], left=8.14, top=6.65, width=10.50, height=0.45)
        elif shape.name == "TextBox 21":
            apply_styled_content(shape, [
                {"text": "• Tactical SITREP Support: Calibrated 5-KPI military/forestry guidance via Edge LoRA & Cloud Frontier.", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}
            ], left=8.14, top=7.25, width=10.50, height=0.45)
        elif shape.name == "TextBox 22":
            apply_styled_content(shape, [
                {"text": "• Dynamic Telemetry Inputs: Open-Meteo wind vectors, relative humidity, rainfall, and fuel flammability.", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}
            ], left=8.14, top=7.85, width=10.50, height=0.45)
        elif shape.name == "TextBox 24":
            apply_styled_content(shape, [{"text": "OPERATIONAL SAFETY GUARDRAILS", "font": "Inter Bold", "size": 26.0, "bold": True, "color": "FF6B1B"}], top=9.40, width=3.0, height=0.65)
        elif shape.name == "TextBox 25":
            apply_styled_content(shape, [
                {"text": "CAUTION: Uncalibrated conditional physical scenarios — not statistical spread probabilities, confirmed active fires, or remaining burn hours. Forward slope and wind alignment strictly validated before predicting spread direction.", "font": "Inter", "size": 17.0, "bold": False, "color": "FFFFFF"}
            ], left=4.40, top=9.35, width=14.0, height=0.85)
        elif shape.name == "TextBox 27":
            apply_styled_content(shape, [{"text": "11 cells", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}])
        elif shape.name == "TextBox 28":
            apply_styled_content(shape, [{"text": "11 cells", "font": "Inter", "size": 16.0, "bold": False, "color": "FFFFFF"}])

    s6.notes_slide.notes_text_frame.text = (
        "TACTICAL SIMULATION & DECISION SUPPORT (SLIDE 6):\n"
        "- 11x11 Simulation Grid: Each cell (~1 km2) evaluates local spread potential using wind vectors (Open-Meteo), fuel type (MCD12Q1), "
        "and moisture conditions across 6h, 12h, and 24h horizons.\n"
        "- Decision Support Engine: Integrates LLM decision support producing military/forestry standard Tactical Situation Reports (SITREPs) "
        "with containment line recommendations and airbase flight scrambles.\n"
        "- Scientific Integrity & Anti-Hallucination: Models are strictly constrained by telemetry—unsubstantiated machine learning models "
        "(e.g. unverified XGBoost) are explicitly omitted in favor of physics-bounded cellular automata and verified ground-truth telemetry."
    )

    # =========================================================================
    # SLIDE 7: Quantitative Benchmark Verification & Mission Impact (Zero-Collision)
    # =========================================================================
    s7 = prs.slides[6]
    for shape in s7.shapes:
        if shape.name == "TextBox 3":
            apply_styled_content(shape, [
                {"text": "Empirically verified results & hackathon mission impact", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F4F4F4"}
            ], top=0.30, width=15.0)
        elif shape.name == "TextBox 4":
            apply_styled_content(shape, [
                {"text": "Proven Deduplication & Mission Readiness Across 153,000+ NASA FIRMS Observations", "font": "Inter Semi-Bold", "size": 30.0, "bold": True, "color": "05DCF9"}
            ], top=2.30, width=12.56)
        elif shape.name == "TextBox 6":
            apply_styled_content(shape, [{"text": "Global 24h Telemetry Feed:", "font": "Inter Bold", "size": 26.0, "bold": True, "color": "F4F4F4"}], left=1.16, top=3.60, width=3.50, height=0.50)
            
        # Metric 1: Raw Detections
        elif shape.name == "TextBox 7":
            apply_styled_content(shape, [{"text": "154K", "font": "Inter Bold", "size": 54.0, "bold": True, "color": "05DCF9"}], left=1.16, top=4.30, width=2.40, height=0.90)
        elif shape.name == "TextBox 8":
            apply_styled_content(shape, [
                [{"text": "raw detections", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "NASA FIRMS", "font": "Inter", "size": 15.0, "bold": False, "color": "05DCF9"}]
            ], left=1.16, top=5.25, width=2.40, height=0.90)
            
        # Metric 2: Harmonized Events
        elif shape.name == "TextBox 10":
            apply_styled_content(shape, [{"text": "87K", "font": "Inter Bold", "size": 54.0, "bold": True, "color": "05DCF9"}], left=4.10, top=4.30, width=2.40, height=0.90)
        elif shape.name == "TextBox 11":
            apply_styled_content(shape, [
                [{"text": "harmonized events", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "(43.3% deduplicated)", "font": "Inter Semi-Bold", "size": 16.0, "bold": True, "color": "05DCF9"}]
            ], left=4.10, top=5.25, width=2.40, height=0.90)
            
        # Metric 3: Spatial Retention
        elif shape.name == "TextBox 12":
            apply_styled_content(shape, [{"text": "85.7%", "font": "Inter Bold", "size": 54.0, "bold": True, "color": "05DCF9"}], left=6.95, top=4.30, width=2.60, height=0.90)
        elif shape.name == "TextBox 13":
            apply_styled_content(shape, [
                [{"text": "at 375m precision", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "(120 dual-verified)", "font": "Inter Semi-Bold", "size": 16.0, "bold": True, "color": "05DCF9"}]
            ], left=6.95, top=5.25, width=2.60, height=0.90)
            
        # Benchmark Status Banner (inside Freeform 5 with clean margin)
        elif shape.name == "TextBox 9":
            apply_styled_content(shape, [
                [{"text": "N = 50 FIRMS System Reliability Benchmark:", "font": "Inter Bold", "size": 16.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "100% Valid Schema  |  100% Kinematic Fidelity  |  100% 6h Spread Distance Feasible", "font": "Inter Semi-Bold", "size": 14.0, "bold": True, "color": "05DCF9"}]
            ], left=1.16, top=6.55, width=8.40, height=1.05)
            
        # Right Column: Next Steps
        elif shape.name == "TextBox 15":
            apply_styled_content(shape, [{"text": "Next steps:", "font": "Inter Bold", "size": 30.0, "bold": True, "color": "F4F4F4"}], left=10.63, top=3.60, width=3.50, height=0.50)
        elif shape.name == "TextBox 25":
            apply_styled_content(shape, [{"text": "1.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], left=10.63, top=4.35, width=0.60, height=0.55)
        elif shape.name == "TextBox 16":
            apply_styled_content(shape, [{"text": "Verify incident outcomes with forestry field telemetry", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], left=11.35, top=4.40, width=7.50, height=0.50)
        elif shape.name == "TextBox 17":
            apply_styled_content(shape, [{"text": "2.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], left=10.63, top=5.15, width=0.60, height=0.55)
        elif shape.name == "TextBox 18":
            apply_styled_content(shape, [{"text": "Ingest real-time airborne perimeter polygons (GeoJSON)", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], left=11.35, top=5.20, width=7.50, height=0.50)
        elif shape.name == "TextBox 19":
            apply_styled_content(shape, [{"text": "3.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], left=10.63, top=5.95, width=0.60, height=0.55)
        elif shape.name == "TextBox 20":
            apply_styled_content(shape, [{"text": "Broaden global SRTM 30m DEM terrain coverage", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], left=11.35, top=6.00, width=7.50, height=0.50)
        elif shape.name == "TextBox 21":
            apply_styled_content(shape, [{"text": "4.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], left=10.63, top=6.75, width=0.60, height=0.55)
        elif shape.name == "TextBox 22":
            apply_styled_content(shape, [{"text": "Conduct multi-region operational incident evaluation", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], left=11.35, top=6.80, width=7.50, height=0.50)
        elif shape.name == "TextBox 24":
            apply_styled_content(shape, [{"text": "Make every observation count toward a clearer, safer picture of active fire activity.", "font": "Inter Semi-Bold", "size": 26.0, "bold": True, "color": "F4F4F4"}], left=1.76, top=10.15, width=16.11, height=0.55)

    s7.notes_slide.notes_text_frame.text = (
        "QUANTITATIVE BENCHMARK & MISSION IMPACT (SLIDE 7):\n"
        "1. Verified Deduplication Results:\n"
        "   - Regional Indochina (7-Day): 1,522 raw -> 1,078 harmonized (29.17% deduplication), 85.7% 375m retention, 120 multi-sat confirmed.\n"
        "   - Vietnam Strict Borders (7-Day): 934 raw -> 680 harmonized (27.19% deduplication), 5,539.7 MW pass-reconciled FRP.\n"
        "   - Global Feed (24-Hour): 153,948 raw -> 87,311 harmonized (43.29% deduplication), 1,749,272 MW reconciled.\n"
        "2. 5-KPI System Reliability Benchmark (N = 50 real active fire events from NASA FIRMS):\n"
        "   - KPI 1 (Schema Validity): 100.0% (50/50 valid JSON responses, zero parse failure).\n"
        "   - KPI 2 (Kinematic Fidelity): 100.0% (predicted spread direction matches ground-truth telemetry, zero direction hallucination).\n"
        "   - KPI 3 (6h Spread Feasibility): 100.0% (predicted distances within physical limits ROS * 6h * slope multiplier).\n"
        "   - KPI 4 (Risk Calibration): 100.0% (calibrated against empirical FRP thresholds).\n"
        "   - KPI 5 (Tactical Actionability): 100.0% actionable containment lines and local Forward Operating Base (FOB) scrambles."
    )

    prs.save(TARGET_PATH)
    print(f"Successfully refined pitch deck typography and zero-collision layout: {TARGET_PATH}")


if __name__ == "__main__":
    run_typography_refinement()
