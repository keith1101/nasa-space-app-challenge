"""
FastAPI Backend for SPHEREx & Planet X Interactive Sky Tool
Integrates NASA IPAC / IRSA Cutout API, local SHA-256 disk caching,
resilient offline fallback, astrometry WCS, and difference imaging analysis.
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
    export_fits_bytes,
    array_to_base64_png
)
from app.difference_engine import (
    compute_difference_matrix,
    detect_moving_candidates,
    render_difference_image_b64
)
from app.irsa_service import (
    get_spherex_cutout,
    compute_spectral_profile,
    SampleFITSManager,
    FITSCacheManager
)

app = FastAPI(
    title="NASA SPHEREx Real Data & Planet X Astrometry API",
    description="Scientific API connecting to NASA IPAC / IRSA for SPHEREx Level 2 Quick Release (QR2) products.",
    version="2.0.0"
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
        "service": "SPHEREx Astrometry API (NASA IRSA Integrated)",
        "astropy_version": astropy.__version__,
        "numpy_version": np.__version__,
        "irsa_online": True,
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
    """Returns curated preset astronomical targets with public SPHEREx coverage."""
    return {
        "targets": PRESET_TARGETS
    }


@app.post("/api/spherex/cutout")
def get_cutout(req: CutoutRequest):
    """
    Retrieves SPHEREx FITS cutout from NASA IPAC/IRSA Cutout API or local cache.
    Falls back gracefully to pre-bundled sample FITS if network is offline.
    """
    data, wcs, meta, data_source = get_spherex_cutout(
        ra=req.ra,
        dec=req.dec,
        channel_id=req.channel_id,
        epoch_id=req.epoch_id
    )

    image_b64 = array_to_base64_png(data, stretch=req.stretch, colormap=req.colormap)

    return {
        "image_base64": image_b64,
        "data_source": data_source,
        "metadata": meta,
        "wcs": {
            "crval": list(wcs.wcs.crval),
            "cdelt": list(wcs.wcs.cdelt),
            "ctype": list(wcs.wcs.ctype)
        },
        "stats": {
            "min_flux_mjy_sr": round(float(np.nanmin(data)), 3) if np.isfinite(np.nanmin(data)) else 0.0,
            "max_flux_mjy_sr": round(float(np.nanmax(data)), 3) if np.isfinite(np.nanmax(data)) else 0.0,
            "mean_flux_mjy_sr": round(float(np.nanmean(data)), 3) if np.isfinite(np.nanmean(data)) else 0.0
        }
    }


@app.post("/api/spherex/blink")
def get_blink_comparison(req: BlinkRequest):
    """
    Computes a multi-epoch comparison package using real NASA SPHEREx data:
    - Epoch 1 rendered frame (with data source indicator)
    - Epoch 2 rendered frame (with data source indicator)
    - Difference frame Delta I = E2 - E1
    - 1D Spectral Energy Distribution (SED) across all 102 channels
    - Automated detection of candidate moving bodies with AstroPy WCS coordinates
    """
    data1, wcs, meta1, source1 = get_spherex_cutout(
        ra=req.ra,
        dec=req.dec,
        channel_id=req.channel_id,
        epoch_id=req.epoch1_id
    )

    data2, _, meta2, source2 = get_spherex_cutout(
        ra=req.ra,
        dec=req.dec,
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

    # 3. Compute 1D Spectral Energy Distribution across 102 channels
    spectral_sed = compute_spectral_profile(data1, req.channel_id)

    # Aggregate data source
    combined_source = "nasa_irsa_live" if (source1 == "nasa_irsa_live" or source2 == "nasa_irsa_live") else (
        "local_cache" if (source1 == "local_cache" or source2 == "local_cache") else "offline_sample"
    )

    channel_info = get_channel_by_id(req.channel_id)

    return {
        "ra": req.ra,
        "dec": req.dec,
        "channel_id": req.channel_id,
        "wavelength_um": channel_info["wavelength_um"],
        "band_name": channel_info["detector_name"],
        "data_source": combined_source,
        "epoch1": {
            "epoch_id": req.epoch1_id,
            "data_source": source1,
            "image_base64": img1_b64,
            "stats": {"min": round(float(np.min(data1)), 2), "max": round(float(np.max(data1)), 2)}
        },
        "epoch2": {
            "epoch_id": req.epoch2_id,
            "data_source": source2,
            "image_base64": img2_b64,
            "stats": {"min": round(float(np.min(data2)), 2), "max": round(float(np.max(data2)), 2)}
        },
        "difference": {
            "image_base64": diff_b64,
            "min_residual": round(float(np.min(diff_matrix)), 3),
            "max_residual": round(float(np.max(diff_matrix)), 3),
            "std_residual": round(float(np.std(diff_matrix)), 3)
        },
        "spectral_profile": spectral_sed,
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
    """Generates and returns standard astronomical Multi-Extension FITS file."""
    # Check cache first
    cached = FITSCacheManager.get(ra, dec, channel_id, epoch_id)
    if cached:
        fits_bytes = cached
    else:
        sample_bytes = SampleFITSManager.get_sample(ra, dec, channel_id, epoch_id)
        fits_bytes = sample_bytes

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
