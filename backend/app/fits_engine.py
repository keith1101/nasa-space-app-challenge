"""
SPHEREx FITS & Astrometry Engine
Handles SPHEREx 102-band near-infrared spectrophotometry, WCS astrometry,
multi-epoch simulation, and FITS cutout rendering using AstroPy.
"""

from typing import List, Dict, Any, Tuple, Optional
import io
import base64
import numpy as np
from PIL import Image

import astropy.io.fits as fits
from astropy.wcs import WCS
from astropy.coordinates import SkyCoord
import astropy.units as u


# SPHEREx Instrument Parameters
SPHEREX_PIXEL_SCALE_ARCSEC = 6.15  # 6.15 arcsec per pixel
SPHEREX_PIXEL_SCALE_DEG = SPHEREX_PIXEL_SCALE_ARCSEC / 3600.0

DETECTOR_BANDS = [
    {"band_id": 1, "name": "Band 1 (SWIR)", "lambda_min": 0.75, "lambda_max": 1.09, "R": 39, "channels": 17},
    {"band_id": 2, "name": "Band 2 (SWIR)", "lambda_min": 1.10, "lambda_max": 1.62, "R": 41, "channels": 17},
    {"band_id": 3, "name": "Band 3 (SWIR)", "lambda_min": 1.63, "lambda_max": 2.41, "R": 41, "channels": 17},
    {"band_id": 4, "name": "Band 4 (MWIR)", "lambda_min": 2.42, "lambda_max": 3.82, "R": 35, "channels": 17},
    {"band_id": 5, "name": "Band 5 (MWIR)", "lambda_min": 3.83, "lambda_max": 4.41, "R": 112, "channels": 17},
    {"band_id": 6, "name": "Band 6 (MWIR)", "lambda_min": 4.40, "lambda_max": 5.00, "R": 128, "channels": 17},
]

SURVEY_EPOCHS = [
    {"epoch_id": "survey-1", "name": "Survey 1 (Epoch 1)", "observation_date": "2025-04-15", "desc": "First all-sky coverage"},
    {"epoch_id": "survey-2", "name": "Survey 2 (Epoch 2)", "observation_date": "2025-10-15", "desc": "+6 months baseline"},
    {"epoch_id": "survey-3", "name": "Survey 3 (Epoch 3)", "observation_date": "2026-04-15", "desc": "+12 months baseline"},
    {"epoch_id": "survey-4", "name": "Survey 4 (Epoch 4)", "observation_date": "2026-10-15", "desc": "+18 months baseline"},
]

PRESET_TARGETS = [
    {
        "id": "planet-x-candidate",
        "name": "Planet X Search Field (High Parallax)",
        "ra": 64.5000,
        "dec": 12.8000,
        "fov_arcmin": 13.1,
        "description": "Simulated field containing a cold trans-Neptunian candidate shifting ~26 pixels between epochs with peak flux in MWIR (Bands 4-6)."
    },
    {
        "id": "kuiper-belt-beltway",
        "name": "Kuiper Belt Deep Survey Patch",
        "ra": 182.4200,
        "dec": -3.2500,
        "fov_arcmin": 13.1,
        "description": "Dense ecliptic plane field with slow-moving icy planetesimals exhibiting water ice absorption at 3.05 µm (Band 4)."
    },
    {
        "id": "fast-asteroid-transient",
        "name": "Near-Earth Asteroid Flyby",
        "ra": 210.1500,
        "dec": 25.4000,
        "fov_arcmin": 13.1,
        "description": "High proper motion solar system object with visible elongation and substantial position displacement across 6 months."
    },
    {
        "id": "barnards-star",
        "name": "Barnard's Star (High Stellar Proper Motion)",
        "ra": 269.4520,
        "dec": 4.6933,
        "fov_arcmin": 13.1,
        "description": "Nearby red dwarf (M4V) exhibiting detectable stellar proper motion (10.3 arcsec/year) between SPHEREx surveys."
    }
]


def generate_channel_catalog() -> List[Dict[str, Any]]:
    """Builds metadata for all 102 SPHEREx spectral channels."""
    channels = []
    chan_idx = 1
    for band in DETECTOR_BANDS:
        w_min = band["lambda_min"]
        w_max = band["lambda_max"]
        num_ch = band["channels"]
        w_steps = np.linspace(w_min, w_max, num_ch)
        for i, w in enumerate(w_steps):
            channels.append({
                "channel_id": chan_idx,
                "band_id": band["band_id"],
                "detector_name": band["name"],
                "wavelength_um": round(float(w), 4),
                "resolving_power": band["R"],
                "channel_in_band": i + 1
            })
            chan_idx += 1
    return channels


ALL_CHANNELS = generate_channel_catalog()


def get_channel_by_id(channel_id: int) -> Dict[str, Any]:
    """Retrieve channel info by 1-based index (1-102)."""
    idx = max(1, min(102, channel_id)) - 1
    return ALL_CHANNELS[idx]


def create_astropy_wcs(ra_deg: float, dec_deg: float, width: int = 128, height: int = 128) -> WCS:
    """Create a standard AstroPy TAN projection WCS header."""
    w = WCS(naxis=2)
    w.wcs.crpix = [width / 2.0, height / 2.0]
    w.wcs.cdelt = [-SPHEREX_PIXEL_SCALE_DEG, SPHEREX_PIXEL_SCALE_DEG]
    w.wcs.crval = [ra_deg, dec_deg]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.cunit = ["deg", "deg"]
    return w


def _gaussian_psf(shape: Tuple[int, int], x0: float, y0: float, sigma: float = 1.2, amplitude: float = 1.0) -> np.ndarray:
    """Generate a 2D Gaussian point spread function."""
    y, x = np.indices(shape)
    r2 = (x - x0) ** 2 + (y - y0) ** 2
    return amplitude * np.exp(-r2 / (2.0 * (sigma ** 2)))


def simulate_spherex_field(
    ra_deg: float,
    dec_deg: float,
    channel_id: int = 51,
    epoch_id: str = "survey-1",
    width: int = 128,
    height: int = 128,
    random_seed: Optional[int] = None
) -> Tuple[np.ndarray, WCS, Dict[str, Any]]:
    """
    Simulates a 2D SPHEREx spectrophotometric flux matrix in MJy/sr with WCS.
    Injects moving objects for 'planet-x-candidate' or nearby coordinates.
    """
    channel = get_channel_by_id(channel_id)
    wavelength = channel["wavelength_um"]
    band_id = channel["band_id"]

    # Derive reproducible seed based on spatial coordinates
    if random_seed is None:
        base_seed = int((abs(ra_deg) * 1000 + abs(dec_deg) * 100) % 1000000)
    else:
        base_seed = random_seed

    rng = np.random.default_rng(base_seed)

    # 1. Background Zodiacal emission + instrument read noise
    # Zodiacal thermal emission peaks around 3-4 microns (MWIR)
    zodi_level = 1.5 + 2.0 * np.exp(-((wavelength - 3.5) ** 2) / 2.0)
    # Add subtle spatial gradient
    y_grid, x_grid = np.indices((height, width))
    grad = (x_grid / width * 0.2) + (y_grid / height * 0.15)
    noise = rng.normal(loc=0.0, scale=0.15, size=(height, width))
    flux_map = zodi_level + grad + noise

    # 2. Static Background Stars (fixed across epochs)
    num_stars = 24
    star_x = rng.uniform(8, width - 8, size=num_stars)
    star_y = rng.uniform(8, height - 8, size=num_stars)
    # Rayleigh-Jeans tail in IR: flux decays as ~ 1/lambda^2
    star_base_fluxes = rng.exponential(scale=5.0, size=num_stars) + 1.0

    for i in range(num_stars):
        # Hot stars fade into longer wavelengths
        spec_factor = (1.0 / (wavelength / 1.0) ** 1.5)
        f = star_base_fluxes[i] * spec_factor
        flux_map += _gaussian_psf((height, width), star_x[i], star_y[i], sigma=1.1, amplitude=f)

    # 3. Moving Object Injection (Simulated Planet X / Asteroid Candidate)
    # Check if target is near the Planet X candidate search zone or generic injection
    is_target_field = abs(ra_deg - 64.50) < 0.2 and abs(dec_deg - 12.80) < 0.2
    metadata_moving_obj = None

    if is_target_field:
        # Cold body (T ~ 35-45K) -> Thermal flux is tiny in Bands 1-3 (<2.4 um), high in Bands 4-6 (2.4-5.0 um)
        if wavelength < 2.0:
            thermal_flux = 0.2  # Nearly undetectable in SWIR
        elif wavelength < 3.0:
            thermal_flux = 1.8
        else:
            thermal_flux = 7.5 + 3.0 * np.sin(wavelength)  # Strongly visible in MWIR Bands 4, 5, 6

        # Position changes by ~24 pixels between Survey 1 and Survey 2
        if epoch_id == "survey-1":
            obj_x, obj_y = 48.0, 42.0
        elif epoch_id == "survey-2":
            obj_x, obj_y = 74.0, 78.0
        elif epoch_id == "survey-3":
            obj_x, obj_y = 100.0, 114.0
        else:  # survey-4
            obj_x, obj_y = 126.0, 150.0

        if 0 <= obj_x < width and 0 <= obj_y < height:
            flux_map += _gaussian_psf((height, width), obj_x, obj_y, sigma=1.3, amplitude=thermal_flux)

        metadata_moving_obj = {
            "injected": True,
            "name": "Planet X Candidate (PX-2026-SPX)",
            "pixel_pos": [obj_x, obj_y],
            "epoch": epoch_id,
            "thermal_flux_mjy_sr": round(float(thermal_flux), 3),
            "dominant_bands": [4, 5, 6]
        }

    # 4. Generate AstroPy WCS
    wcs = create_astropy_wcs(ra_deg, dec_deg, width, height)

    meta = {
        "ra_center": ra_deg,
        "dec_center": dec_deg,
        "width": width,
        "height": height,
        "epoch_id": epoch_id,
        "channel_id": channel_id,
        "wavelength_um": wavelength,
        "band_id": band_id,
        "detector_name": channel["detector_name"],
        "unit": "MJy/sr",
        "moving_object": metadata_moving_obj
    }

    return flux_map, wcs, meta


def export_fits_bytes(data: np.ndarray, wcs: WCS, meta: Dict[str, Any]) -> bytes:
    """Creates a scientific FITS HDUList with primary header and WCS, returned as bytes."""
    header = wcs.to_header()
    header["TELESCOP"] = ("SPHEREx", "Spectro-Photometer for History of Universe")
    header["ORIGIN"] = ("IPAC/Caltech", "Infrared Science Archive Pipeline")
    header["BUNIT"] = ("MJy/sr", "Surface brightness unit")
    header["CHANNEL"] = (meta["channel_id"], "Nominal spectral channel (1-102)")
    header["WAVELENG"] = (meta["wavelength_um"], "Central wavelength in micrometers")
    header["BAND_ID"] = (meta["band_id"], "Detector array index (1 to 6)")
    header["EPOCH"] = (meta["epoch_id"], "Survey observation epoch")
    header["OBSDATE"] = ("2025-04-15" if meta["epoch_id"] == "survey-1" else "2025-10-15", "UTC date")
    header["PXSCALE"] = (SPHEREX_PIXEL_SCALE_ARCSEC, "Arcseconds per pixel")

    primary_hdu = fits.PrimaryHDU(data=data.astype(np.float32), header=header)
    hdul = fits.HDUList([primary_hdu])

    bio = io.BytesIO()
    hdul.writeto(bio)
    return bio.getvalue()


def array_to_base64_png(
    data: np.ndarray,
    stretch: str = "asinh",
    colormap: str = "magma"
) -> str:
    """
    Renders 2D scientific matrix into an 8-bit image with astronomical stretch.
    Returns base64 data URI string.
    """
    arr = data.copy()

    # Percentile clipping (0.5% - 99.5%) to remove cosmic ray / noise outliers
    vmin, vmax = np.percentile(arr, [0.5, 99.5])
    if vmax <= vmin:
        vmax = vmin + 1e-5
    arr = np.clip(arr, vmin, vmax)

    if stretch == "asinh":
        # Astronomical asinh stretch preserves both faint background and star cores
        arr = (arr - vmin) / (vmax - vmin)
        arr = np.arcsinh(arr * 10.0) / np.arcsinh(10.0)
    elif stretch == "log":
        arr = np.log10(1.0 + 9.0 * (arr - vmin) / (vmax - vmin))
    else:  # linear
        arr = (arr - vmin) / (vmax - vmin)

    arr = np.clip(arr * 255.0, 0, 255).astype(np.uint8)

    # Use Matplotlib colormap for false-color IR astronomical visualization
    import matplotlib as mpl
    cmap_name = colormap if colormap in ["magma", "inferno", "viridis", "gray", "plasma"] else "magma"
    try:
        cmap = mpl.colormaps[cmap_name]
    except Exception:
        import matplotlib.cm as cm
        cmap = cm.get_cmap(cmap_name)
    colored = (cmap(arr / 255.0)[:, :, :3] * 255).astype(np.uint8)

    img = Image.fromarray(colored)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
