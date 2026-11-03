import io
import numpy as np
import pytest
import astropy.io.fits as fits
from astropy.coordinates import SkyCoord
import astropy.units as u

from app.fits_engine import (
    ALL_CHANNELS,
    DETECTOR_BANDS,
    get_channel_by_id,
    create_astropy_wcs,
    simulate_spherex_field,
    export_fits_bytes,
    array_to_base64_png
)
from app.difference_engine import compute_difference_matrix, detect_moving_candidates


def test_channel_catalog_completeness():
    """Verify all 102 SPHEREx channels are accurately generated across 6 bands."""
    assert len(ALL_CHANNELS) == 102
    assert len(DETECTOR_BANDS) == 6

    # Verify monotonic wavelength progression
    wavelengths = [ch["wavelength_um"] for ch in ALL_CHANNELS]
    assert wavelengths[0] == pytest.approx(0.75, abs=0.01)
    assert wavelengths[-1] == pytest.approx(5.00, abs=0.01)

    # Check band 1 through 6
    band_counts = {}
    for ch in ALL_CHANNELS:
        b = ch["band_id"]
        band_counts[b] = band_counts.get(b, 0) + 1
    for b in range(1, 7):
        assert band_counts[b] == 17


def test_wcs_astrometric_roundtrip():
    """Verify WCS transforms pixel coordinates to celestial and back within 0.01 arcsec."""
    ra_center, dec_center = 120.5, -15.2
    wcs = create_astropy_wcs(ra_center, dec_center, width=128, height=128)

    test_pixels = [(64.0, 64.0), (10.0, 20.0), (115.5, 98.2)]
    for px, py in test_pixels:
        sky = wcs.pixel_to_world(px, py)
        px_rt, py_rt = wcs.world_to_pixel(sky)
        assert px_rt == pytest.approx(px, abs=1e-4)
        assert py_rt == pytest.approx(py, abs=1e-4)


def test_fits_generation_and_headers():
    """Verify FITS bytes adhere to astronomical standards with proper headers."""
    data, wcs, meta = simulate_spherex_field(64.5, 12.8, channel_id=50, epoch_id="survey-1")
    fits_bytes = export_fits_bytes(data, wcs, meta)

    bio = io.BytesIO(fits_bytes)
    with fits.open(bio) as hdul:
        assert len(hdul) == 1
        header = hdul[0].header
        assert header["TELESCOP"] == "SPHEREx"
        assert header["ORIGIN"] == "IPAC/Caltech"
        assert header["BUNIT"] == "MJy/sr"
        assert header["CHANNEL"] == 50
        assert header["EPOCH"] == "survey-1"
        assert hdul[0].data.shape == (128, 128)


def test_base64_rendering():
    """Verify array to PNG rendering produces valid data URI."""
    arr = np.random.uniform(1.0, 10.0, size=(64, 64))
    uri = array_to_base64_png(arr)
    assert uri.startswith("data:image/png;base64,")
    assert len(uri) > 100


def test_difference_imaging_and_candidate_detection():
    """Verify that shifting object is identified as a moving dipole."""
    data1, wcs, _ = simulate_spherex_field(64.5, 12.8, channel_id=60, epoch_id="survey-1")
    data2, _, _ = simulate_spherex_field(64.5, 12.8, channel_id=60, epoch_id="survey-2")

    diff = compute_difference_matrix(data1, data2)
    assert diff.shape == (128, 128)

    candidates = detect_moving_candidates(diff, wcs, sigma_threshold=3.5)
    assert len(candidates) >= 1

    cand = candidates[0]
    assert "SPX-CAND" in cand["candidate_id"]
    assert cand["confidence_score"] > 0.8
    assert cand["angular_displacement_arcsec"] > 50.0
    assert cand["estimated_motion_arcsec_yr"] > 100.0
