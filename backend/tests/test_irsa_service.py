import os
import numpy as np
import pytest

from app.irsa_service import (
    FITSCacheManager,
    SampleFITSManager,
    get_spherex_cutout,
    compute_spectral_profile,
    parse_mef_fits
)


def test_fits_cache_manager():
    """Verify SHA-256 caching stores and retrieves FITS bytes accurately."""
    import io
    import astropy.io.fits as fits
    ra, dec, ch, ep = 12.3456, 78.9012, 10, "survey-test"
    
    bio = io.BytesIO()
    fits.HDUList([fits.PrimaryHDU(data=np.ones((8, 8), dtype=np.float32))]).writeto(bio)
    test_bytes = bio.getvalue()

    key = FITSCacheManager.put(ra, dec, ch, ep, test_bytes)
    assert len(key) == 64  # SHA-256 hex string

    retrieved = FITSCacheManager.get(ra, dec, ch, ep)
    assert retrieved == test_bytes


def test_sample_fits_manager():
    """Verify pre-bundled sample FITS has valid MEF structure with IMAGE extension."""
    ra, dec, ch, ep = 304.6935, 42.4437, 50, "survey-1"
    fits_bytes = SampleFITSManager.get_sample(ra, dec, ch, ep)
    assert len(fits_bytes) > 2880

    data, wcs, meta = parse_mef_fits(fits_bytes)
    assert data.shape == (128, 128)
    assert meta["telescope"] == "SPHEREx"
    assert meta["channel_id"] == 50


def test_resilience_fallback_hierarchy():
    """Verify get_spherex_cutout returns valid data with data_source tag."""
    # Query an arbitrary coordinate - will fallback to sample FITS
    data, wcs, meta, source = get_spherex_cutout(150.0, 30.0, 60, "survey-1")
    assert data.shape == (128, 128)
    assert source in ["nasa_irsa_live", "local_cache", "offline_sample"]


def test_spectral_profile_generation():
    """Verify 102-point spectral SED curve generation."""
    dummy_data = np.ones((128, 128), dtype=np.float32) * 5.0
    profile = compute_spectral_profile(dummy_data, 60)
    assert len(profile) == 102
    assert profile[0]["wavelength_um"] == pytest.approx(0.75, abs=0.01)
    assert profile[-1]["wavelength_um"] == pytest.approx(5.00, abs=0.01)
