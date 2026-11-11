"""
SPHEREx Difference Imaging & Moving Object Detection Engine
Performs astrometric subtraction Delta I = I_E2 - I_E1 and detects candidate
solar system bodies / Planet X candidates with subpixel centroiding and AstroPy WCS.
"""

from typing import Dict, Any, List, Tuple
import io
import base64
import numpy as np
from PIL import Image
from scipy import ndimage
from astropy.wcs import WCS
from astropy.coordinates import SkyCoord
import astropy.units as u


def compute_difference_matrix(
    data_epoch1: np.ndarray,
    data_epoch2: np.ndarray
) -> np.ndarray:
    """Computes direct algebraic difference matrix Delta I = Epoch2 - Epoch1."""
    d1 = data_epoch1.astype(np.float64)
    d2 = data_epoch2.astype(np.float64)

    if d1.shape != d2.shape:
        zoom_factors = (d1.shape[0] / max(1, d2.shape[0]), d1.shape[1] / max(1, d2.shape[1]))
        d2 = ndimage.zoom(d2, zoom_factors, order=1)

    return d2 - d1


def detect_moving_candidates(
    diff_matrix: np.ndarray,
    wcs: WCS,
    sigma_threshold: float = 4.0,
    min_pixels: int = 3
) -> List[Dict[str, Any]]:
    """
    Detects significant flux residuals indicating moved celestial objects.
    Extracts positive peaks (Epoch 2 appearance) and negative peaks (Epoch 1 disappearance).
    """
    # Robust background noise estimation using median absolute deviation
    med = np.median(diff_matrix)
    mad = np.median(np.abs(diff_matrix - med))
    sigma_est = 1.4826 * mad if mad > 1e-6 else float(np.std(diff_matrix))
    if sigma_est < 1e-6:
        sigma_est = 0.1

    candidates = []

    # 1. Detect Positive Peak (where object is in Epoch 2)
    pos_mask = (diff_matrix - med) > (sigma_threshold * sigma_est)
    labeled_pos, num_features_pos = ndimage.label(pos_mask)

    # 2. Detect Negative Peak (where object was in Epoch 1)
    neg_mask = (diff_matrix - med) < (-sigma_threshold * sigma_est)
    labeled_neg, num_features_neg = ndimage.label(neg_mask)

    # Extract positive centroids
    pos_centroids = []
    for f in range(1, num_features_pos + 1):
        feature_mask = (labeled_pos == f)
        pixel_count = int(np.sum(feature_mask))
        if pixel_count >= min_pixels:
            weights = (diff_matrix - med) * feature_mask
            total_weight = np.sum(weights)
            if total_weight > 0:
                y_idx, x_idx = np.indices(diff_matrix.shape)
                cx = float(np.sum(x_idx * weights) / total_weight)
                cy = float(np.sum(y_idx * weights) / total_weight)
                max_snr = float(np.max(diff_matrix[feature_mask]) / sigma_est)
                pos_centroids.append((cx, cy, max_snr, pixel_count))

    # Extract negative centroids
    neg_centroids = []
    for f in range(1, num_features_neg + 1):
        feature_mask = (labeled_neg == f)
        pixel_count = int(np.sum(feature_mask))
        if pixel_count >= min_pixels:
            weights = np.abs(diff_matrix - med) * feature_mask
            total_weight = np.sum(weights)
            if total_weight > 0:
                y_idx, x_idx = np.indices(diff_matrix.shape)
                cx = float(np.sum(x_idx * weights) / total_weight)
                cy = float(np.sum(y_idx * weights) / total_weight)
                max_snr = float(np.max(np.abs(diff_matrix[feature_mask])) / sigma_est)
                neg_centroids.append((cx, cy, max_snr, pixel_count))

    # Pair positive and negative centroids into moving dipole candidates
    cand_idx = 1
    used_neg = set()

    for pcx, pcy, psnr, pcount in pos_centroids:
        # Find closest negative counterpart (dipole signature of motion)
        matched_neg = None
        min_dist = float("inf")
        matched_idx = -1

        for idx, (ncx, ncy, nsnr, ncount) in enumerate(neg_centroids):
            if idx in used_neg:
                continue
            dist = np.hypot(pcx - ncx, pcy - ncy)
            # Distance must be at least 3 pixels (real motion) and within the cutout
            if 3.0 <= dist < min_dist:
                min_dist = dist
                matched_neg = (ncx, ncy, nsnr, ncount)
                matched_idx = idx

        # Convert pixel coordinates to Celestial Coordinates (RA, Dec) via AstroPy WCS
        sky_pos_e2 = wcs.pixel_to_world(pcx, pcy)
        ra_e2 = float(sky_pos_e2.ra.deg)
        dec_e2 = float(sky_pos_e2.dec.deg)

        if matched_neg:
            used_neg.add(matched_idx)
            ncx, ncy, nsnr, ncount = matched_neg
            sky_pos_e1 = wcs.pixel_to_world(ncx, ncy)
            ra_e1 = float(sky_pos_e1.ra.deg)
            dec_e1 = float(sky_pos_e1.dec.deg)

            # Compute angular separation using AstroPy SkyCoord
            c1 = SkyCoord(ra=ra_e1 * u.deg, dec=dec_e1 * u.deg)
            c2 = SkyCoord(ra=ra_e2 * u.deg, dec=dec_e2 * u.deg)
            separation_arcsec = float(c1.separation(c2).arcsec)
            # 6-month survey interval -> proper motion rate in arcsec/year
            motion_rate_arcsec_yr = round(separation_arcsec / 0.5, 2)

            candidates.append({
                "candidate_id": f"SPX-CAND-{cand_idx:03d}",
                "type": "Moving Body Dipole (High Confidence)",
                "confidence_score": round(min(0.99, (psnr / 10.0) * 0.9), 2),
                "epoch1": {
                    "pixel": [round(ncx, 2), round(ncy, 2)],
                    "ra_deg": round(ra_e1, 6),
                    "dec_deg": round(dec_e1, 6),
                    "hms": c1.to_string("hmsdms").split()[0],
                    "dms": c1.to_string("hmsdms").split()[1]
                },
                "epoch2": {
                    "pixel": [round(pcx, 2), round(pcy, 2)],
                    "ra_deg": round(ra_e2, 6),
                    "dec_deg": round(dec_e2, 6),
                    "hms": c2.to_string("hmsdms").split()[0],
                    "dms": c2.to_string("hmsdms").split()[1]
                },
                "angular_displacement_arcsec": round(separation_arcsec, 2),
                "estimated_motion_arcsec_yr": motion_rate_arcsec_yr,
                "snr": round(psnr, 1),
                "flux_delta": round(float(psnr * sigma_est), 2)
            })
            cand_idx += 1
        else:
            # Monopolar transient (e.g. asteroid appearing, supernova, or variable)
            candidates.append({
                "candidate_id": f"SPX-TRANS-{cand_idx:03d}",
                "type": "New Transient Appearance (Unpaired)",
                "confidence_score": round(min(0.85, (psnr / 12.0) * 0.8), 2),
                "epoch1": None,
                "epoch2": {
                    "pixel": [round(pcx, 2), round(pcy, 2)],
                    "ra_deg": round(ra_e2, 6),
                    "dec_deg": round(dec_e2, 6),
                    "hms": sky_pos_e2.to_string("hmsdms").split()[0],
                    "dms": sky_pos_e2.to_string("hmsdms").split()[1]
                },
                "angular_displacement_arcsec": 0.0,
                "estimated_motion_arcsec_yr": 0.0,
                "snr": round(psnr, 1),
                "flux_delta": round(float(psnr * sigma_est), 2)
            })
            cand_idx += 1

    return candidates


def render_difference_image_b64(diff_matrix: np.ndarray) -> str:
    """
    Renders astronomical difference frame into a two-color bipolar representation:
    Red/Orange: Negative flux (Epoch 1 disappearance)
    Cyan/Blue: Positive flux (Epoch 2 appearance)
    Dark Gray: Zero residual
    """
    h, w = diff_matrix.shape
    med = np.median(diff_matrix)
    mad = np.median(np.abs(diff_matrix - med))
    scale = 3.5 * (1.4826 * mad if mad > 1e-6 else 0.5)

    # Normalize to [-1, 1]
    norm_val = np.clip((diff_matrix - med) / scale, -1.0, 1.0)

    # Construct RGB matrix
    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    # Base background luminance
    bg = 28
    rgb[:, :, 0] = bg
    rgb[:, :, 1] = bg
    rgb[:, :, 2] = bg

    # Positive residuals (Epoch 2) -> Cyan/Electric Blue (G + B)
    pos = np.clip(norm_val, 0, 1.0)
    rgb[:, :, 1] = np.clip(rgb[:, :, 1] + pos * 210, 0, 255).astype(np.uint8)
    rgb[:, :, 2] = np.clip(rgb[:, :, 2] + pos * 255, 0, 255).astype(np.uint8)

    # Negative residuals (Epoch 1) -> Vivid Coral/Red (R)
    neg = np.clip(-norm_val, 0, 1.0)
    rgb[:, :, 0] = np.clip(rgb[:, :, 0] + neg * 255, 0, 255).astype(np.uint8)
    rgb[:, :, 1] = np.clip(rgb[:, :, 1] + neg * 60, 0, 255).astype(np.uint8)

    img = Image.fromarray(rgb)
    bio = io.BytesIO()
    img.save(bio, format="PNG")
    b64_str = base64.b64encode(bio.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
