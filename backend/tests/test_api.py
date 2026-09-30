from io import BytesIO
import json

from fastapi.testclient import TestClient
import numpy as np
from PIL import Image
import pytest
from pydantic import ValidationError
import rasterio

from backend.app.data.pipeline import PROCESSED, SHAPE, TRANSFORM, write_raster, source_manifest
from backend.app.main import create_app
from backend.app.models.schemas import Measurement, SiteInspection
from backend.app.services.inspection import TerrainStore
from lunaros.dataset import checksum


@pytest.fixture
def synthetic_data(tmp_path):
    # Mathematical/API fixture only. This directory is never loaded by the running app.
    elevation = np.full(SHAPE, 120.5)
    slope = np.zeros(SHAPE)
    light = np.zeros(SHAPE)
    elevation[200, 200] = np.nan
    slope[200, 200] = np.nan
    light[200, 200] = np.nan
    write_raster(tmp_path / "terrain.tif", [elevation, slope], ["elevation_m", "slope_deg"])
    write_raster(tmp_path / "illumination.tif", [light], ["solar_visibility_fraction"])
    registry = {"schema_version": 1, "region_id": "south-pole",
                "sources": source_manifest()["sources"],
                "artifacts": {name: {"sha256": checksum(tmp_path / name)}
                              for name in ["terrain.tif", "illumination.tif"]}}
    (tmp_path / "registry.json").write_text(json.dumps(registry), encoding="utf-8")
    return tmp_path


def test_api_contracts_sampling_zero_and_nodata(synthetic_data):
    with TestClient(create_app(synthetic_data)) as client:
        assert client.get("/health").json()["status"] == "ready"
        assert client.get("/datasets").json()[0]["unit"] == "m"
        regions = client.get("/regions").json()
        assert regions[0]["bounds_m"] == [-48000, -48000, 48000, 48000]
        response = client.get("/sites/inspect", params={"longitude": 0, "latitude": -89.5})
        assert response.status_code == 200
        result = SiteInspection.model_validate(response.json())
        assert result.elevation.value == 120.5
        assert result.solar_visibility.value == 0
        assert result.solar_visibility.status == "ok"
        missing = client.get("/sites/inspect", params={"longitude": 0, "latitude": -90}).json()
        assert missing["elevation"]["value"] is None
        assert missing["elevation"]["status"] == "nodata"
        assert missing["coordinates"]["longitude_defined"] is False
        assert missing["slope"]["value"] is None
        image_response = client.get("/regions/south-pole/layers/elevation.png")
        image = Image.open(BytesIO(image_response.content))
        assert image.size == (400, 400)
        assert image.getpixel((200, 200))[3] == 0
        assert client.get("/regions/unknown/layers/slope.png").status_code == 404
        assert client.get("/regions/south-pole/layers/unknown.png").status_code == 422
        schema = client.get("/openapi.json").json()
        assert "SiteInspection" in schema["components"]["schemas"]


@pytest.mark.parametrize("params, status", [
    ({"longitude": 0, "latitude": -80}, 404),
    ({"longitude": 0, "latitude": -91}, 422),
    ({"longitude": 361, "latitude": -89}, 422),
    ({"longitude": "nan", "latitude": -89}, 422),
    ({"longitude": 0, "latitude": "inf"}, 422), ({}, 422),
])
def test_invalid_and_outside_queries(synthetic_data, params, status):
    with TestClient(create_app(synthetic_data)) as client:
        assert client.get("/sites/inspect", params=params).status_code == status


def test_missing_and_corrupt_data_do_not_use_fallback(tmp_path, synthetic_data):
    for path in [tmp_path / "missing", synthetic_data]:
        if path == synthetic_data:
            (path / "terrain.tif").write_bytes(b"corrupt")
        with TestClient(create_app(path)) as client:
            assert client.get("/health").status_code == 503
            assert client.get("/sites/inspect", params={"longitude": 0, "latitude": -89}).status_code == 503
            assert client.get("/datasets").json()[0]["available"] is False


def test_measurement_rejects_nonfinite_and_inconsistent_status():
    base = dict(unit="m", quantity_kind="measured_gridded", source_id="synthetic-test",
                method="test", notes="Synthetic mathematical fixture", resolution_m=240, support_m=240)
    for value, status in [(float("nan"), "ok"), (1, "nodata"), (None, "ok")]:
        with pytest.raises(ValidationError):
            Measurement(**base, value=value, status=status)


@pytest.mark.skipif(not (PROCESSED / "registry.json").exists(), reason="Run real-data pipeline first")
def test_real_api_value_matches_registered_geotiff():
    with TestClient(create_app()) as client:
        response = client.get("/sites/inspect", params={"longitude": 0, "latitude": -89.5})
        assert response.status_code == 200
        result = response.json()
        with rasterio.open(PROCESSED / "terrain.tif") as raster:
            row, column = raster.index(result["coordinates"]["x_m"], result["coordinates"]["y_m"])
            assert result["sample"]["row"] == row
            assert result["sample"]["column"] == column
            assert result["elevation"]["value"] == float(raster.read(1)[row, column])
        assert result["elevation"]["source_id"] == "LDEM_75S_240M"
