import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "astropy_version" in data


def test_bands_endpoint():
    res = client.get("/api/spherex/bands")
    assert res.status_code == 200
    data = res.json()
    assert data["total_channels"] == 102
    assert len(data["detector_bands"]) == 6


def test_targets_endpoint():
    res = client.get("/api/spherex/targets")
    assert res.status_code == 200
    data = res.json()
    assert len(data["targets"]) >= 3


def test_cutout_endpoint():
    payload = {
        "ra": 64.5,
        "dec": 12.8,
        "channel_id": 40,
        "epoch_id": "survey-1",
        "stretch": "asinh",
        "colormap": "magma"
    }
    res = client.post("/api/spherex/cutout", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["image_base64"].startswith("data:image/png;base64,")
    assert data["metadata"]["channel_id"] == 40


def test_blink_endpoint():
    payload = {
        "ra": 64.5,
        "dec": 12.8,
        "channel_id": 60,
        "epoch1_id": "survey-1",
        "epoch2_id": "survey-2",
        "sigma_threshold": 3.5,
        "stretch": "asinh",
        "colormap": "magma"
    }
    res = client.post("/api/spherex/blink", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "epoch1" in data
    assert "epoch2" in data
    assert "difference" in data
    assert len(data["candidates_detected"]) >= 1


def test_candidate_flag_and_list():
    flag_payload = {
        "ra": 64.5,
        "dec": 12.8,
        "channel_id": 60,
        "observer_name": "Test Astronomer",
        "notes": "Verified parallax motion across 6-month baseline.",
        "object_classification": "Planet X Candidate"
    }
    res = client.post("/api/spherex/flag-candidate", json=flag_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

    res_list = client.get("/api/spherex/flags")
    assert res_list.status_code == 200
    flags_data = res_list.json()
    assert flags_data["total"] >= 1
