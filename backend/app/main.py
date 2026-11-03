"""
FastAPI Backend for SPHEREx & Planet X Interactive Sky Tool
Provides REST API endpoints for AstroPy coordinate queries, multi-epoch cutouts,
blink comparison, difference imaging analysis, and citizen-science reporting.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import os
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import astropy
import numpy as np

from app.fits_engine import (
    DETECTOR_BANDS,
    SURVEY_EPOCHS,
    PRESET_TARGETS,
    ALL_CHANNELS,
    get_channel_by_id,
    simulate_spherex_field,
    export_fits_bytes,
    array_to_base64_png
)
from app.difference_engine import (
    compute_difference_matrix,
    detect_moving_candidates,
    render_difference_image_b64
)

app = FastAPI(
    title="NASA SPHEREx Planet X Astrometry API",
    description="Scientific backend service for the NASA Space Apps Challenge 'Planet X and SPHEREx'.",
    version="1.0.0"
)

# Enable CORS for local and web dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FLAGS_STORAGE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "citizen_flags.json")


# Pydantic Schemas
class CutoutRequest(BaseModel):
    ra: float = Field(..., ge=0.0, lt=360.0, description="Right Ascension in degrees (0 to 360)")
    dec: float = Field(..., ge=-90.0, le=90.0, description="Declination in degrees (-90 to +90)")
    channel_id: int = Field(60, ge=1, le=102, description="SPHEREx channel ID (1 to 102)")
    epoch_id: str = Field("survey-1", description="Survey epoch identifier")
    stretch: str = Field("asinh", description="Astronomical stretch: asinh, log, linear")
    colormap: str = Field("magma", description="Colormap: magma, inferno, viridis, gray")


class BlinkRequest(BaseModel):
    ra: float = Field(..., ge=0.0, lt=360.0, description="Right Ascension in degrees (0 to 360)")
    dec: float = Field(..., ge=-90.0, le=90.0, description="Declination in degrees (-90 to +90)")
    channel_id: int = Field(60, ge=1, le=102, description="SPHEREx channel ID (1 to 102)")
    epoch1_id: str = Field("survey-1", description="Baseline epoch")
    epoch2_id: str = Field("survey-2", description="Comparison epoch (+6 months)")
    sigma_threshold: float = Field(4.0, ge=2.0, le=15.0, description="Detection threshold in sigma")
    stretch: str = Field("asinh", description="Image stretch algorithm")
    colormap: str = Field("magma", description="Colormap for single epoch frames")


class CandidateFlag(BaseModel):
    candidate_id: Optional[str] = None
    ra: float
    dec: float
    channel_id: int
    observer_name: str = "Anonymous Citizen Scientist"
    notes: str
    object_classification: str = Field("Planet X / Distant Trans-Neptunian", description="Candidate classification")


@app.get("/api/health")
def health_check():
    """Health status and dependency versions check."""
    return {
        "status": "healthy",
        "service": "SPHEREx Astrometry API",
        "astropy_version": astropy.__version__,
        "numpy_version": np.__version__,
        "server_time": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/api/spherex/bands")
def get_bands():
    """Returns all 102 SPHEREx channels and 6 detector arrays."""
    return {
        "total_channels": len(ALL_CHANNELS),
        "detector_bands": DETECTOR_BANDS,
        "channels": ALL_CHANNELS
    }


@app.get("/api/spherex/epochs")
def get_epochs():
    """Returns available 6-month survey epochs."""
    return {
        "epochs": SURVEY_EPOCHS
    }


@app.get("/api/spherex/targets")
def get_targets():
    """Returns curated preset astronomical targets."""
    return {
        "targets": PRESET_TARGETS
    }


@app.post("/api/spherex/cutout")
def get_cutout(req: CutoutRequest):
    """Simulates/Extracts a single-epoch SPHEREx cutout with WCS astrometry."""
    data, wcs, meta = simulate_spherex_field(
        ra_deg=req.ra,
        dec_deg=req.dec,
        channel_id=req.channel_id,
        epoch_id=req.epoch_id
    )

    image_b64 = array_to_base64_png(data, stretch=req.stretch, colormap=req.colormap)

    return {
        "image_base64": image_b64,
        "metadata": meta,
        "wcs": {
            "crval": list(wcs.wcs.crval),
            "cdelt": list(wcs.wcs.cdelt),
            "ctype": list(wcs.wcs.ctype)
        },
        "stats": {
            "min_flux_mjy_sr": round(float(np.min(data)), 3),
            "max_flux_mjy_sr": round(float(np.max(data)), 3),
            "mean_flux_mjy_sr": round(float(np.mean(data)), 3)
        }
    }


@app.post("/api/spherex/blink")
def get_blink_comparison(req: BlinkRequest):
    """
    Computes a multi-epoch comparison package:
    - Epoch 1 rendered frame
    - Epoch 2 rendered frame
    - Difference frame Delta I = E2 - E1
    - Automated detection of candidate moving bodies with AstroPy WCS coordinates
    """
    data1, wcs, meta1 = simulate_spherex_field(
        ra_deg=req.ra,
        dec_deg=req.dec,
        channel_id=req.channel_id,
        epoch_id=req.epoch1_id
    )

    data2, _, meta2 = simulate_spherex_field(
        ra_deg=req.ra,
        dec_deg=req.dec,
        channel_id=req.channel_id,
        epoch_id=req.epoch2_id
    )

    # 1. Render both single-epoch frames
    img1_b64 = array_to_base64_png(data1, stretch=req.stretch, colormap=req.colormap)
    img2_b64 = array_to_base64_png(data2, stretch=req.stretch, colormap=req.colormap)

    # 2. Compute Difference Matrix and detect moving objects
    diff_matrix = compute_difference_matrix(data1, data2)
    candidates = detect_moving_candidates(
        diff_matrix=diff_matrix,
        wcs=wcs,
        sigma_threshold=req.sigma_threshold
    )

    diff_b64 = render_difference_image_b64(diff_matrix)

    return {
        "ra": req.ra,
        "dec": req.dec,
        "channel_id": req.channel_id,
        "wavelength_um": meta1["wavelength_um"],
        "band_name": meta1["detector_name"],
        "epoch1": {
            "epoch_id": req.epoch1_id,
            "image_base64": img1_b64,
            "stats": {"min": round(float(np.min(data1)), 2), "max": round(float(np.max(data1)), 2)}
        },
        "epoch2": {
            "epoch_id": req.epoch2_id,
            "image_base64": img2_b64,
            "stats": {"min": round(float(np.min(data2)), 2), "max": round(float(np.max(data2)), 2)}
        },
        "difference": {
            "image_base64": diff_b64,
            "min_residual": round(float(np.min(diff_matrix)), 3),
            "max_residual": round(float(np.max(diff_matrix)), 3),
            "std_residual": round(float(np.std(diff_matrix)), 3)
        },
        "candidates_detected": candidates,
        "wcs": {
            "crval": list(wcs.wcs.crval),
            "cdelt": list(wcs.wcs.cdelt),
            "ctype": list(wcs.wcs.ctype)
        }
    }


@app.get("/api/spherex/download-fits")
def download_fits(
    ra: float = Query(..., ge=0.0, lt=360.0),
    dec: float = Query(..., ge=-90.0, le=90.0),
    channel_id: int = Query(60, ge=1, le=102),
    epoch_id: str = Query("survey-1")
):
    """Generates and returns standard astronomical FITS binary file."""
    data, wcs, meta = simulate_spherex_field(ra, dec, channel_id, epoch_id)
    fits_bytes = export_fits_bytes(data, wcs, meta)

    filename = f"spherex_ra{ra:.2f}_dec{dec:.2f}_ch{channel_id}_{epoch_id}.fits"
    return Response(
        content=fits_bytes,
        media_type="application/fits",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.post("/api/spherex/flag-candidate")
def flag_candidate(flag: CandidateFlag):
    """Stores citizen-science flagged candidate celestial objects."""
    os.makedirs(os.path.dirname(FLAGS_STORAGE_PATH), exist_ok=True)
    flags = []
    if os.path.exists(FLAGS_STORAGE_PATH):
        try:
            with open(FLAGS_STORAGE_PATH, "r", encoding="utf-8") as f:
                flags = json.load(f)
        except Exception:
            flags = []

    new_entry = {
        "id": f"FLAG-{int(datetime.utcnow().timestamp())}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ra": flag.ra,
        "dec": flag.dec,
        "channel_id": flag.channel_id,
        "observer_name": flag.observer_name,
        "classification": flag.object_classification,
        "notes": flag.notes
    }
    flags.append(new_entry)

    with open(FLAGS_STORAGE_PATH, "w", encoding="utf-8") as f:
        json.dump(flags, f, indent=2)

    return {"status": "success", "message": "Candidate flagged successfully!", "entry": new_entry}


@app.get("/api/spherex/flags")
def list_flags():
    """Retrieves all citizen-science candidate submissions."""
    if not os.path.exists(FLAGS_STORAGE_PATH):
        return {"total": 0, "flags": []}
    try:
        with open(FLAGS_STORAGE_PATH, "r", encoding="utf-8") as f:
            flags = json.load(f)
        return {"total": len(flags), "flags": flags}
    except Exception:
        return {"total": 0, "flags": []}
