import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from backend.app.data.globe import OUTPUT, prepare
from backend.app.main import create_app
from backend.app.models.globe import Destination, GlobeInspection
from backend.app.services.globe import GlobeStore, inspect
from backend.tests.test_api import synthetic_data
from lunaros.dataset import load, ROOT


def test_preparation_repeats_and_retains_native_global_samples(tmp_path):
    first = prepare(output=tmp_path, offline=True)
    assert first == prepare(output=tmp_path, offline=True)
    grid, samples = load(ROOT / 'data/raw')
    store = GlobeStore(tmp_path)
    assert store.elevation.ravel().tolist() == samples.tolist()
    for row, column in [(0,0),(719,1439),(400,400),(360,0)]:
        lat, lon = grid.center(row, column)
        elevation, sampled_row, sampled_column = store.sample(lon, lat)
        assert (sampled_row, sampled_column) == (row, column)
        assert elevation.value == samples[row * grid.columns + column] * .5
    assert store.sample(0,90)[1:] == (0,0)
    assert store.sample(360,-90)[1:] == (719,0)
    assert store.sample(-.125,0)[2] == 1439
    # Isolated missing-value mathematical fixture; never published as NASA data.
    store.elevation = store.elevation.copy()
    store.elevation[360,0] = -32768
    assert store.sample(0,0)[0].status == 'nodata'
    assert store.sample(0,0)[0].value is None
    (tmp_path / 'elevation.bin').write_bytes(b'corrupt')
    with pytest.raises(ValueError, match='integrity'):
        GlobeStore(tmp_path)


def test_global_api_coverage_destinations_and_unavailable_data(synthetic_data, tmp_path):
    with TestClient(create_app(synthetic_data, tmp_path/'missions.sqlite', OUTPUT)) as client:
        assert client.get('/globe').json()['available']
        assert len(client.get('/globe/elevation.bin').content) == 2073600
        assert client.get('/globe/color-4k.jpg').headers['content-type'] == 'image/jpeg'
        destinations = [Destination.model_validate(d) for d in client.get('/destinations').json()]
        assert len(destinations) == 7
        assert next(d for d in destinations if d.id=='tycho').coordinates.longitude_deg == 348.78
        for latitude, longitude, status in [(-89.5,0,'available'),(90,0,'outside_coverage'),(-80,0,'outside_coverage'),(-90,0,'nodata'),(-89.67,129.78,'available')]:
            response = client.get('/globe/inspect/location', params={'latitude':latitude,'longitude':longitude})
            point = GlobeInspection.model_validate(response.json())
            assert point.elevation.status == 'ok'
            assert point.local_status == status
            assert point.planning == (status == 'available')
            assert point.temporal_illumination is False
        assert client.get('/globe/inspect/location?latitude=91&longitude=0').status_code == 422
        assert client.get('/globe/inspect/location?latitude=NaN&longitude=0').status_code == 422
        assert client.get('/globe/bad').status_code == 422
    with TestClient(create_app(tmp_path/'missing', tmp_path/'empty.sqlite', tmp_path/'missing')) as client:
        assert not client.get('/globe').json()['available']
        assert client.get('/globe/elevation.bin').status_code == 503
        point = client.get('/globe/inspect/location?latitude=-89.5&longitude=0').json()
        assert point['elevation']['value'] is None
        assert point['local_status'] == 'unavailable'
        assert not point['planning']
        assert len(client.get('/destinations').json()) == 7
