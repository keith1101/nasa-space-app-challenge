import os
import io
import time
import numpy as np
import pytest
import astropy.io.fits as fits

from app.irsa_service import (
    FITSCacheManager,
    IRSACutoutClient,
    SampleFITSManager,
    get_spherex_cutout,
    compute_spectral_profile,
    parse_mef_fits,
    is_irsa_online
)


def test_fits_cache_manager():
    """Verify SHA-256 caching stores and retrieves FITS bytes accurately."""
    ra, dec, ch, ep = 12.3456, 78.9012, 10, "survey-test"
    
    bio = io.BytesIO()
    fits.HDUList([fits.PrimaryHDU(data=np.ones((8, 8), dtype=np.float32))]).writeto(bio)
    test_bytes = bio.getvalue()

    key = FITSCacheManager.put(ra, dec, ch, ep, test_bytes)
    assert len(key) == 64  # SHA-256 hex string

    retrieved = FITSCacheManager.get(ra, dec, ch, ep)
    assert retrieved == test_bytes


def test_fits_cache_ttl_and_lru():
    """Verify TTL expiration and LRU eviction policies protect disk storage."""
    bio = io.BytesIO()
    fits.HDUList([fits.PrimaryHDU(data=np.ones((4, 4), dtype=np.float32))]).writeto(bio)
    test_bytes = bio.getvalue()

    # Test TTL expiration with very short TTL
    key = FITSCacheManager.put(10.0, 20.0, 1, "ttl-test", test_bytes)
    assert FITSCacheManager.get(10.0, 20.0, 1, "ttl-test") is not None
    
    # Passing ttl_seconds=-1 forces immediate expiration
    expired_result = FITSCacheManager.get(10.0, 20.0, 1, "ttl-test", ttl_seconds=-1.0)
    assert expired_result is None

    # Test LRU eviction: insert multiple entries and enforce limit
    for i in range(5):
        FITSCacheManager.put(10.0 + i, 20.0, i + 1, "lru-test", test_bytes)

    evicted = FITSCacheManager.enforce_lru(max_entries=3)
    stats = FITSCacheManager.get_cache_stats()
    assert stats["total_entries"] <= 3


def test_sample_fits_manager():
    """Verify pre-bundled sample FITS has valid 7-HDU MEF structure with IMAGE extension."""
    ra, dec, ch, ep = 304.6935, 42.4437, 50, "survey-1"
    fits_bytes = SampleFITSManager.get_sample(ra, dec, ch, ep)
    assert len(fits_bytes) > 2880

    with fits.open(io.BytesIO(fits_bytes)) as hdul:
        assert len(hdul) == 7
        hdu_names = [h.name for h in hdul]
        assert "PRIMARY" in hdu_names
        assert "IMAGE" in hdu_names
        assert "FLAGS" in hdu_names
        assert "VARIANCE" in hdu_names
        assert "ZODI" in hdu_names
        assert "PSF" in hdu_names
        assert "WCS-WAVE" in hdu_names

    data, wcs, meta = parse_mef_fits(fits_bytes)
    assert data.shape == (128, 128)
    assert meta["telescope"] == "SPHEREx"
    assert meta["channel_id"] == 50
    assert meta["total_hdus"] == 7


def test_resilience_fallback_hierarchy():
    """Verify get_spherex_cutout returns valid data with real data_source tag."""
    # Query an arbitrary coordinate - returns live IRSA, cached FITS, or real sample FITS
    data, wcs, meta, source = get_spherex_cutout(150.0, 30.0, 60, "survey-1")
    assert data.ndim == 2
    assert data.shape[0] > 0 and data.shape[1] > 0
    assert source in ["nasa_irsa_live", "local_cache", "offline_sample"]
    assert meta["telescope"] == "SPHEREx"
    assert meta["channel_id"] == 60


def test_spectral_profile_generation():
    """Verify 102-point spectral SED curve generation from real photometry."""
    dummy_data = np.ones((128, 128), dtype=np.float32) * 5.0
    profile = compute_spectral_profile(dummy_data, 60)
    assert len(profile) == 102
    assert profile[0]["wavelength_um"] == pytest.approx(0.75, abs=0.01)
    assert profile[-1]["wavelength_um"] == pytest.approx(5.00, abs=0.01)

    for pt in profile:
        assert pt["flux_density"] > 0
        assert 1 <= pt["channel_id"] <= 102
        assert 1 <= pt["band_id"] <= 6


def test_siav2_discovery_client():
    """Verify IRSACutoutClient initialization and cached URL discovery handling."""
    client = IRSACutoutClient(timeout_sec=5.0)
    # Test cached or out-of-coverage query handling
    cached_key = "304.6935_42.4437_2_survey-1"
    client._sia_cache[cached_key] = "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/test.fits"
    url = client.discover_access_url(304.6935, 42.4437, 2, "survey-1")
    assert url == "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/test.fits"
