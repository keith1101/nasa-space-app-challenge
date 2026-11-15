"""
Fast Opaque Text-Box Styling for NASA FIRMS Pitch Deck.
Applies solid background fills matching the exact local slide/card canvas to every text box.
Guarantees 100% masking of any legacy underlying text without modifying background images.
Zero-collision layout with exact Inter presentation typography.
"""

from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKUP_PATH = ROOT_DIR / "docs" / "NASA FIRMS Harmonization Platform.backup.pptx"
TARGET_PATH = ROOT_DIR / "docs" / "NASA FIRMS Harmonization Platform.pptx"

# Exact canvas colors
BG_NAVY = RGBColor(1, 28, 54)      # General slide background
BG_CARD = RGBColor(4, 42, 82)      # Card interior background
BG_DARK = RGBColor(0, 24, 48)      # Deep contrast background


def apply_opaque_box(shape, specs, fill_color=None, left=None, top=None, width=None, height=None):
    """
    Sets text, explicit Inter font styling, geometry, and an opaque solid fill
    to completely cover and mask any legacy text beneath the text box.
    """
    if not shape.has_text_frame:
        return
        
    if left is not None: shape.left = Inches(left)
    if top is not None: shape.top = Inches(top)
    if width is not None: shape.width = Inches(width)
    if height is not None: shape.height = Inches(height)
    
    # Apply solid background fill to completely mask any ghost text beneath
    if fill_color is not None:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
        
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.06)
    tf.margin_right = Inches(0.06)
    tf.margin_top = Inches(0.04)
    tf.margin_bottom = Inches(0.04)
    
    if specs and isinstance(specs[0], dict):
        specs = [specs]
        
    while len(tf.paragraphs) > 1:
        extra = tf.paragraphs[-1]
        extra._p.getparent().remove(extra._p)
        
    p0 = tf.paragraphs[0]
    p0.text = ""
    
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


def run_fast_text_fix():
    print(f"Loading from backup: {BACKUP_PATH}")
    prs = Presentation(BACKUP_PATH)
    
    # -------------------------------------------------------------
    # SLIDE 1: Title & Executive Vision
    # -------------------------------------------------------------
    s1 = prs.slides[0]
    for sh in s1.shapes:
        if sh.name == "TextBox 7":
            apply_opaque_box(sh, [{"text": "NASA FIRMS", "font": "Inter Bold", "size": 93.96, "bold": True, "color": "F6F4F4"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 8":
            apply_opaque_box(sh, [{"text": "GLOBAL MULTI-SENSOR ACTIVE-FIRE HARMONIZATION", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F6F4F4"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 9":
            apply_opaque_box(sh, [{"text": "Harmonization Platform & Decision Support", "font": "Inter Bold", "size": 52.0, "bold": True, "color": "F6F4F4"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 10":
            apply_opaque_box(sh, [{"text": "NASA Space Apps Challenge 2026 — Track 04: Data & AI", "font": "Inter Semi-Bold", "size": 20.0, "bold": True, "color": "1ED8F2"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 11":
            apply_opaque_box(sh, [{"text": "One unified, physically coherent picture of active fire fronts with 375m spatial precision.", "font": "Inter", "size": 25.0, "bold": False, "color": "F6F4F4"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 12":
            apply_opaque_box(sh, [
                {"text": "Team: ", "font": "Inter Bold", "size": 21.85, "bold": True, "color": "F6F4F4"},
                {"text": "Bé Dâu Vui Vẻ", "font": "Inter Italics", "size": 21.85, "bold": False, "color": "1ED8F2"}
            ], fill_color=BG_NAVY)

    # -------------------------------------------------------------
    # SLIDE 2: Why Multi-Sensor Harmonization Matters
    # -------------------------------------------------------------
    s2 = prs.slides[1]
    for sh in s2.shapes:
        if sh.name == "TextBox 8":
            apply_opaque_box(sh, [{"text": "Why multi-sensor harmonization matters", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "F8F8F8"}], fill_color=BG_NAVY, top=1.80, width=12.0)
        elif sh.name == "TextBox 9":
            apply_opaque_box(sh, [
                [{"text": "Spatial Bow-Tie Distortion", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "00CCF5"}],
                [{"text": "MODIS (1 km nadir) expands to ~2.0 × 4.8 km at scan edges vs VIIRS 375m. A single edge MODIS pixel covers 10+ VIIRS detections.", "font": "Inter", "size": 17.0, "bold": False, "color": "F8F8F8"}]
            ], fill_color=BG_NAVY, top=4.00, width=10.5, height=1.35)
        elif sh.name == "TextBox 10":
            apply_opaque_box(sh, [
                [{"text": "Incompatible Confidence Scoring", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "00CCF5"}],
                [{"text": "MODIS continuous percentage [0%–100%] vs VIIRS categorical (low, nominal, high). Simple numerical averaging is mathematically invalid.", "font": "Inter", "size": 17.0, "bold": False, "color": "F8F8F8"}]
            ], fill_color=BG_NAVY, top=5.75, width=10.5, height=1.35)
        elif sh.name == "TextBox 11":
            apply_opaque_box(sh, [
                [{"text": "Orbital Overlap & Severe Double-Counting", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "F97305"}],
                [{"text": "Afternoon satellites (Aqua, NOAA-20/21) orbit 20–50 min apart. Naive concatenation creates 27% to 43% duplicate reports of identical fire fronts.", "font": "Inter", "size": 17.0, "bold": False, "color": "F8F8F8"}]
            ], fill_color=BG_NAVY, top=7.50, width=10.5, height=1.35)
        elif sh.name == "TextBox 12":
            apply_opaque_box(sh, [{"text": "MODIS", "font": "Inter Bold", "size": 21.21, "bold": True, "color": "00CCF5"}], fill_color=BG_NAVY, left=12.70, top=8.75)
        elif sh.name == "TextBox 13":
            apply_opaque_box(sh, [{"text": "27% – 43%\nDuplicates", "font": "Inter Bold", "size": 14.0, "bold": True, "color": "FF6B1B"}], fill_color=BG_NAVY, left=14.00, top=8.60, width=1.70, height=0.65)
        elif sh.name == "TextBox 14":
            apply_opaque_box(sh, [{"text": "VIIRS", "font": "Inter Bold", "size": 21.21, "bold": True, "color": "F97305"}], fill_color=BG_NAVY, left=16.15, top=8.75)

    # -------------------------------------------------------------
    # SLIDE 3: 4-Step Mathematical Harmonization Methodology
    # -------------------------------------------------------------
    s3 = prs.slides[2]
    for sh in s3.shapes:
        if sh.name == "TextBox 3":
            apply_opaque_box(sh, [{"text": "A transparent, physically grounded harmonization path", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F8F8F8"}], fill_color=BG_NAVY, top=0.90, width=15.0)
        elif sh.name == "TextBox 5":
            apply_opaque_box(sh, [{"text": "1", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], fill_color=BG_CARD, top=3.75)
        elif sh.name == "TextBox 6":
            apply_opaque_box(sh, [
                [{"text": "Standardize", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Parse UTC timestamps & project coordinates to local tangent-plane offsets (Δx, Δy).", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], fill_color=BG_CARD, left=1.15, top=4.70, width=2.90, height=2.00)
        elif sh.name == "TextBox 8":
            apply_opaque_box(sh, [{"text": "MODIS", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "00CCF5"}], fill_color=BG_CARD, top=7.25)
        elif sh.name == "TextBox 10":
            apply_opaque_box(sh, [{"text": "VIIRS", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "F97305"}], fill_color=BG_CARD, top=8.20)
        elif sh.name == "TextBox 12":
            apply_opaque_box(sh, [{"text": "2", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], fill_color=BG_CARD, top=3.75)
        elif sh.name == "TextBox 13":
            apply_opaque_box(sh, [
                [{"text": "Match (ST-DBSCAN)", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Dynamic elliptical footprints: (Δx/a_EW)² + (Δy/b_NS)² ≤ 1.0 with continuous sliding window Δt ≤ 3.0h.", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], fill_color=BG_CARD, left=5.10, top=4.70, width=2.90, height=2.00)
        elif sh.name == "TextBox 19":
            apply_opaque_box(sh, [{"text": "3", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], fill_color=BG_CARD, top=3.75)
        elif sh.name == "TextBox 20":
            apply_opaque_box(sh, [
                [{"text": "Reconcile (375m & FRP)", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Flux-density centroid (85.7% at 375m). Pass-reconciled FRP: max_s (Σ FRP_i) avoids double-counting.", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], fill_color=BG_CARD, left=8.95, top=4.70, width=2.90, height=2.00)
        elif sh.name == "TextBox 24":
            apply_opaque_box(sh, [{"text": "4", "font": "Inter Bold", "size": 56.0, "bold": True, "color": "10E8FA"}], fill_color=BG_CARD, top=3.75)
        elif sh.name == "TextBox 25":
            apply_opaque_box(sh, [
                [{"text": "Enrich (Land Cover)", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "10E8FA"}],
                [{"text": "Sample MODIS MCD12Q1 land cover and apply independent Bayesian confidence fusion [0.05, 0.99].", "font": "Inter", "size": 15.0, "bold": False, "color": "F8F8F8"}]
            ], fill_color=BG_CARD, left=12.85, top=4.70, width=2.90, height=2.00)
        elif sh.name == "TextBox 27":
            apply_opaque_box(sh, [{"text": "MODIS MCD12Q1 LC Type 1", "font": "Inter Semi-Bold", "size": 18.0, "bold": True, "color": "F8F8F8"}], fill_color=BG_CARD, top=7.30)
        elif sh.name == "TextBox 30":
            apply_opaque_box(sh, [{"text": "Land cover status:", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "F8F8F8"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 32":
            apply_opaque_box(sh, [{"text": "covered", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "10E8FA"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 34":
            apply_opaque_box(sh, [{"text": "unknown", "font": "Inter Semi-Bold", "size": 22.0, "bold": True, "color": "FF6B1B"}], fill_color=BG_CARD)

    # -------------------------------------------------------------
    # SLIDE 4: The Harmonized Calendar & Regime Matrix
    # -------------------------------------------------------------
    s4 = prs.slides[3]
    for sh in s4.shapes:
        if sh.name == "TextBox 12":
            apply_opaque_box(sh, [
                {"text": "The harmonized calendar & regime matrix is the ", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F8F8F8"},
                {"text": "core solution", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "2AE2FF"}
            ], fill_color=BG_NAVY)
        elif sh.name == "TextBox 5":
            apply_opaque_box(sh, [{"text": "Leave-One-Year-Out (Jackknife) Z-Scores & MCD12Q1 Land Cover Filtering", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 6":
            apply_opaque_box(sh, [{"text": "Unified 2018–2026 Fire Regime Baseline (108-Month Agro-Ecological Matrix)", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 11":
            apply_opaque_box(sh, [{"text": "Interactive Global 3D Map with FIRMS Live Feeds & Footprint Circles", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_CARD)

    # -------------------------------------------------------------
    # SLIDE 5: Production Architecture & Operational Boundaries
    # -------------------------------------------------------------
    s5 = prs.slides[4]
    for sh in s5.shapes:
        if sh.name == "TextBox 16":
            apply_opaque_box(sh, [{"text": "01", "font": "Inter Bold", "size": 150.0, "bold": True, "color": "25D6F8"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 17":
            apply_opaque_box(sh, [
                [{"text": "A working product", "font": "Inter Bold", "size": 52.0, "bold": True, "color": "F8F8F8"}],
                [{"text": "with clear access limits", "font": "Inter Bold", "size": 52.0, "bold": True, "color": "25D6F8"}]
            ], fill_color=BG_NAVY)
        elif sh.name == "TextBox 11":
            apply_opaque_box(sh, [{"text": "The complete production architecture and harmonization pipeline are fully operational.", "font": "Inter Medium", "size": 23.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 18":
            apply_opaque_box(sh, [
                [{"text": "NASA FIRMS API", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "& Offline Cache", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}]
            ], fill_color=BG_CARD)
        elif sh.name == "TextBox 19":
            apply_opaque_box(sh, [
                [{"text": "Python FastAPI", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "Backend Core", "font": "Inter Bold", "size": 24.0, "bold": True, "color": "FFFFFF"}]
            ], fill_color=BG_CARD)
        elif sh.name == "TextBox 20":
            apply_opaque_box(sh, [
                [{"text": "ST-DBSCAN Clustering", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "& GeoTIFF Lookup", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}]
            ], fill_color=BG_CARD)
        elif sh.name == "TextBox 21":
            apply_opaque_box(sh, [
                [{"text": "React 19 / MapLibre 3D", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}],
                [{"text": "& Cockpit HUD", "font": "Inter Bold", "size": 22.0, "bold": True, "color": "FFFFFF"}]
            ], fill_color=BG_CARD)
        elif sh.name == "TextBox 22":
            apply_opaque_box(sh, [{"text": "Live access depends on NASA FIRMS API availability (automated 15-min disk cache & offline CSV fallback).", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 23":
            apply_opaque_box(sh, [{"text": "Raster-derived context (MCD12Q1 biome & DEM elevation) is bounded by spatial tile coverage.", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_NAVY)

    # -------------------------------------------------------------
    # SLIDE 6: Multi-Horizon Simulation & AI Decision Support
    # -------------------------------------------------------------
    s6 = prs.slides[5]
    for sh in s6.shapes:
        if sh.name == "TextBox 3":
            apply_opaque_box(sh, [{"text": "Multi-horizon spread simulation & calibrated tactical decision support", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_NAVY, top=0.25, width=15.20)
        elif sh.name == "TextBox 4":
            apply_opaque_box(sh, [{"text": "11 × 11 GRID", "font": "Inter Semi-Bold", "size": 32.0, "bold": True, "color": "FFFFFF"}], fill_color=BG_CARD, top=2.50, width=3.20, height=0.40)
        elif sh.name == "TextBox 5":
            apply_opaque_box(sh, [{"text": "1 km² Cellular Automata", "font": "Inter", "size": 16.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_CARD, top=2.95, width=3.20, height=0.35)
        elif sh.name == "TextBox 9":
            apply_opaque_box(sh, [{"text": "Inputs", "font": "Inter Semi-Bold", "size": 30.0, "bold": True, "color": "00C9F1"}], fill_color=BG_CARD, top=2.76)
        elif sh.name == "TextBox 11":
            apply_opaque_box(sh, [{"text": "wind", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 26":
            apply_opaque_box(sh, [{"text": "humidity", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 14":
            apply_opaque_box(sh, [{"text": "rain", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 16":
            apply_opaque_box(sh, [{"text": "vegetation", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_CARD)
        elif sh.name == "TextBox 18":
            apply_opaque_box(sh, [{"text": "6 / 12 / 24-hour", "font": "Inter Semi-Bold", "size": 30.0, "bold": True, "color": "00C9F1"}], fill_color=BG_CARD, top=5.25)
        elif sh.name == "TextBox 19":
            apply_opaque_box(sh, [{"text": "relative spread & persistence indices", "font": "Inter", "size": 22.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_CARD, top=5.75)
        elif sh.name == "TextBox 20":
            apply_opaque_box(sh, [{"text": "• 11×11 Cellular Automata: Modeling relative spread potential across 6h, 12h, and 24h horizons.", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_NAVY, left=8.14, top=6.65, width=10.50, height=0.45)
        elif sh.name == "TextBox 21":
            apply_opaque_box(sh, [{"text": "• Tactical SITREP Support: Calibrated 5-KPI military/forestry guidance via Edge LoRA & Cloud Frontier.", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_NAVY, left=8.14, top=7.25, width=10.50, height=0.45)
        elif sh.name == "TextBox 22":
            apply_opaque_box(sh, [{"text": "• Dynamic Telemetry Inputs: Open-Meteo wind vectors, relative humidity, rainfall, and fuel flammability.", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_NAVY, left=8.14, top=7.85, width=10.50, height=0.45)
        elif sh.name == "TextBox 24":
            apply_opaque_box(sh, [{"text": "OPERATIONAL SAFETY GUARDRAILS", "font": "Inter Bold", "size": 26.0, "bold": True, "color": "FF6B1B"}], fill_color=BG_DARK, top=9.40, width=3.0, height=0.65)
        elif sh.name == "TextBox 25":
            apply_opaque_box(sh, [{"text": "CAUTION: Uncalibrated conditional physical scenarios — not statistical spread probabilities, confirmed active fires, or remaining burn hours. Forward slope and wind alignment strictly validated before predicting spread direction.", "font": "Inter", "size": 17.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_DARK, left=4.40, top=9.35, width=14.0, height=0.85)
        elif sh.name == "TextBox 27":
            apply_opaque_box(sh, [{"text": "11 cells", "font": "Inter", "size": 18.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_NAVY)
        elif sh.name == "TextBox 28":
            apply_opaque_box(sh, [{"text": "11 cells", "font": "Inter", "size": 16.0, "bold": False, "color": "FFFFFF"}], fill_color=BG_NAVY)

    # -------------------------------------------------------------
    # SLIDE 7: Quantitative Benchmark Verification & Mission Impact
    # -------------------------------------------------------------
    s7 = prs.slides[6]
    for sh in s7.shapes:
        if sh.name == "TextBox 3":
            apply_opaque_box(sh, [{"text": "Empirically verified results & hackathon mission impact", "font": "Inter Bold", "size": 48.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_NAVY, top=0.30, width=15.0)
        elif sh.name == "TextBox 4":
            apply_opaque_box(sh, [{"text": "Proven Deduplication & Mission Readiness Across 153,000+ NASA FIRMS Observations", "font": "Inter Semi-Bold", "size": 30.0, "bold": True, "color": "05DCF9"}], fill_color=BG_NAVY, top=2.30, width=12.56)
        elif sh.name == "TextBox 6":
            apply_opaque_box(sh, [{"text": "Global 24h Telemetry Feed:", "font": "Inter Bold", "size": 26.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_CARD, left=1.16, top=3.60, width=3.50, height=0.50)
            
        # Metric 1: Raw Detections (Opaque Card Fill BG_CARD)
        elif sh.name == "TextBox 7":
            apply_opaque_box(sh, [{"text": "154K", "font": "Inter Bold", "size": 54.0, "bold": True, "color": "05DCF9"}], fill_color=BG_CARD, left=1.16, top=4.30, width=2.40, height=0.90)
        elif sh.name == "TextBox 8":
            apply_opaque_box(sh, [
                [{"text": "raw detections", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "NASA FIRMS", "font": "Inter", "size": 15.0, "bold": False, "color": "05DCF9"}]
            ], fill_color=BG_CARD, left=1.16, top=5.25, width=2.40, height=0.90)
            
        # Metric 2: Harmonized Events (Opaque Card Fill BG_CARD)
        elif sh.name == "TextBox 10":
            apply_opaque_box(sh, [{"text": "87K", "font": "Inter Bold", "size": 54.0, "bold": True, "color": "05DCF9"}], fill_color=BG_CARD, left=4.10, top=4.30, width=2.40, height=0.90)
        elif sh.name == "TextBox 11":
            apply_opaque_box(sh, [
                [{"text": "harmonized events", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "(43.3% deduplicated)", "font": "Inter Semi-Bold", "size": 16.0, "bold": True, "color": "05DCF9"}]
            ], fill_color=BG_CARD, left=4.10, top=5.25, width=2.40, height=0.90)
            
        # Metric 3: Spatial Retention (Opaque Card Fill BG_CARD)
        elif sh.name == "TextBox 12":
            apply_opaque_box(sh, [{"text": "85.7%", "font": "Inter Bold", "size": 54.0, "bold": True, "color": "05DCF9"}], fill_color=BG_CARD, left=6.95, top=4.30, width=2.60, height=0.90)
        elif sh.name == "TextBox 13":
            apply_opaque_box(sh, [
                [{"text": "at 375m precision", "font": "Inter Medium", "size": 22.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "(120 dual-verified)", "font": "Inter Semi-Bold", "size": 16.0, "bold": True, "color": "05DCF9"}]
            ], fill_color=BG_CARD, left=6.95, top=5.25, width=2.60, height=0.90)
            
        # Benchmark Status Banner
        elif sh.name == "TextBox 9":
            apply_opaque_box(sh, [
                [{"text": "N = 50 FIRMS System Reliability Benchmark:", "font": "Inter Bold", "size": 16.0, "bold": True, "color": "F4F4F4"}],
                [{"text": "100% Valid Schema  |  100% Kinematic Fidelity  |  100% 6h Spread Distance Feasible", "font": "Inter Semi-Bold", "size": 14.0, "bold": True, "color": "05DCF9"}]
            ], fill_color=BG_CARD, left=1.16, top=6.55, width=8.40, height=1.05)
            
        # Right Column: Next Steps (Opaque Fill BG_CARD)
        elif sh.name == "TextBox 15":
            apply_opaque_box(sh, [{"text": "Next steps:", "font": "Inter Bold", "size": 30.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_CARD, left=10.63, top=3.60, width=3.50, height=0.50)
        elif sh.name == "TextBox 25":
            apply_opaque_box(sh, [{"text": "1.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], fill_color=BG_CARD, left=10.63, top=4.35, width=0.60, height=0.55)
        elif sh.name == "TextBox 16":
            apply_opaque_box(sh, [{"text": "Verify incident outcomes with forestry field telemetry", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_CARD, left=11.35, top=4.40, width=7.50, height=0.50)
        elif sh.name == "TextBox 17":
            apply_opaque_box(sh, [{"text": "2.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], fill_color=BG_CARD, left=10.63, top=5.15, width=0.60, height=0.55)
        elif sh.name == "TextBox 18":
            apply_opaque_box(sh, [{"text": "Ingest real-time airborne perimeter polygons (GeoJSON)", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_CARD, left=11.35, top=5.20, width=7.50, height=0.50)
        elif sh.name == "TextBox 19":
            apply_opaque_box(sh, [{"text": "3.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], fill_color=BG_CARD, left=10.63, top=5.95, width=0.60, height=0.55)
        elif sh.name == "TextBox 20":
            apply_opaque_box(sh, [{"text": "Broaden global SRTM 30m DEM terrain coverage", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_CARD, left=11.35, top=6.00, width=7.50, height=0.50)
        elif sh.name == "TextBox 21":
            apply_opaque_box(sh, [{"text": "4.", "font": "Inter Bold", "size": 36.0, "bold": True, "color": "F97C0C"}], fill_color=BG_CARD, left=10.63, top=6.75, width=0.60, height=0.55)
        elif sh.name == "TextBox 22":
            apply_opaque_box(sh, [{"text": "Conduct multi-region operational incident evaluation", "font": "Inter Medium", "size": 20.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_CARD, left=11.35, top=6.80, width=7.50, height=0.50)
        elif sh.name == "TextBox 24":
            apply_opaque_box(sh, [{"text": "Make every observation count toward a clearer, safer picture of active fire activity.", "font": "Inter Semi-Bold", "size": 26.0, "bold": True, "color": "F4F4F4"}], fill_color=BG_CARD, left=1.76, top=10.15, width=16.11, height=0.55)

    prs.save(TARGET_PATH)
    print(f"Successfully applied opaque masking and saved: {TARGET_PATH}")


if __name__ == "__main__":
    run_fast_text_fix()
