import math
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.app.data.atlas import prepare, acquisition_plan, RAW
from backend.app.data.catalog import definitions
from backend.app.main import create_app
from backend.app.models.atlas import AtlasPoint, CatalogEntry
from backend.app.services.atlas import AtlasStore, NumericGrid


def test_real_gld_preparation_native_samples_and_reproducibility(tmp_path):
    first=prepare(output=tmp_path,offline=True)
    assert first==prepare(output=tmp_path,offline=True)
    store=AtlasStore(tmp_path)
    native=np.memmap(RAW/'WAC_GLD100_E000N1800_032P.IMG',dtype='<i2',offset=23040,shape=(5760,11520),mode='r')
    assert np.array_equal(store.grids['gld100'].values,native)
    grid=store.grid()
    for row,col in [(0,0),(5759,11519),(2858,751),(4265,11162),(2880,0)]:
        point=grid.sample((col+.5)/32,90-(row+.5)/32)
        assert (point.sample_row,point.sample_column)==(row,col)
        assert point.elevation.value==int(native[row,col])
    assert grid.sample(360,0).sample_column==0
    assert grid.sample(-.01,90).sample_column==11519
    assert grid.sample(0,-90).sample_row==5759
    store.close()  # Release the read-only mapping before deliberate corruption on Windows.
    (tmp_path/'gld100'/'elevation.npy').write_bytes(b'corrupt')
    assert 'gld100' not in AtlasStore(tmp_path).grids


def test_numeric_grid_nodata_spacing_and_invalid_coordinates():
    # Pure mathematical fixture, not observations.
    values=np.zeros((180,360),dtype='<i2');values[90,0]=-32766
    grid=NumericGrid(values,definitions()['gld100'])
    assert grid.sample(0,0).elevation.value is None
    point=grid.sample(90,60)
    assert point.elevation.value==0
    assert point.elevation.spacing_east_m==pytest.approx(grid.step_m*math.cos(math.radians(59.5)))
    for latitude in [91,math.nan,math.inf]:
        with pytest.raises(ValueError):grid.sample(0,latitude)
    with pytest.raises(ValueError):grid.sample(math.nan,0)
    with pytest.raises(ValueError,match='budget'):acquisition_plan('gld100',budget=1024)


def test_atlas_catalog_query_contract_and_missing_data(tmp_path):
    with TestClient(create_app(db_path=tmp_path/'missions.sqlite')) as client:
        catalog=[CatalogEntry.model_validate(value) for value in client.get('/atlas/datasets').json()]
        assert len(catalog)==10
        assert next(value for value in catalog if value.id=='gld100').numerical_queries
        assert not next(value for value in catalog if value.id=='m3').numerical_queries
        for latitude,longitude in [(.67,23.47),(-43.3,348.78),(9.62,339.92),(-56,180),(90,0),(-90,360)]:
            response=client.get('/atlas/inspect',params={'latitude':latitude,'longitude':longitude})
            assert response.status_code==200
            point=AtlasPoint.model_validate(response.json())
            assert point.dataset_id=='gld100' and point.elevation.source_id=='WAC_GLD100_E000N1800_032P'
            assert point.elevation.status=='ok'
        assert client.get('/atlas/inspect?latitude=NaN&longitude=0').status_code==422
        assert client.get('/atlas/inspect?latitude=0&longitude=0&dataset=m3').status_code==503
        assert client.get('/atlas/acquisition/gld100').json()['download_bytes']==132733440
        assert client.get('/atlas/acquisition/unknown').status_code==404
    with TestClient(create_app(tmp_path/'missing',tmp_path/'empty.sqlite',tmp_path/'missing',tmp_path/'missing')) as client:
        assert client.get('/atlas/inspect?latitude=0&longitude=0').status_code==503
        assert not any(value['numerical_queries'] for value in client.get('/atlas/datasets').json())
