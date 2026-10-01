import math
from io import BytesIO
import numpy as np
import pytest
from PIL import Image
from rasterio import Affine
from backend.app.data.catalog import definitions
from backend.app.geospatial.projected_raster import ProjectedRaster
from backend.app.geospatial.terrain import POLAR_PROJ, unproject
from backend.app.services.inspection import TerrainStore
from backend.app.services.atlas import AtlasStore
from backend.app.services.atlas_tiles import tile_values, render_tile, layers


def test_projected_raster_preserves_zero_nodata_and_real_coverage():
    data=np.array([[0.,np.nan],[.5,1.]])
    grid=ProjectedRaster(data,Affine(240,0,-240,0,-240,240),POLAR_PROJ,
        definitions()['solar-visibility'],'modeled','synthetic isolated test')
    for row,column in [(0,0),(0,1),(1,0),(1,1)]:
        longitude,latitude=unproject(*grid.transform@(column+.5,row+.5))
        quantity=grid.sample(longitude,latitude)
        expected=data[row,column]
        assert quantity.value==expected if math.isfinite(expected) else quantity.value is None
        assert quantity.status==('ok' if math.isfinite(expected) else 'nodata')
    assert grid.sample(0,0).status=='unavailable'
    assert grid.sample(359,90).status=='unavailable'
    with pytest.raises(ValueError):ProjectedRaster(data,grid.transform,'EPSG:3857',grid.source,'modeled','test')


def test_real_solar_overlay_queries_match_original_numeric_cells(tmp_path):
    polar=TerrainStore();atlas=AtlasStore(polar=polar);atlas.directory=tmp_path
    grid=atlas.environment['solar-visibility']
    for lon,lat in [(0,-89.5),(129.78,-89.67),(359.9,-89.8)]:
        assert grid.sample(lon,lat).value==pytest.approx(polar.inspect(lon,lat).solar_visibility.value)
    values=tile_values(grid,'illumination',5,0,31)
    payload=render_tile(atlas,'solar-visibility','illumination',5,0,31)
    with Image.open(BytesIO(payload)) as image:
        alpha=np.asarray(image)[...,3]
        assert np.array_equal(alpha>0,np.isfinite(values))
        assert np.any(alpha==0) and np.any(alpha==255)
    assert any(layer['dataset_id']=='solar-visibility' for layer in layers(atlas))
    assert next(source for source in atlas.catalog() if source.id=='solar-visibility').overlay_available
    atlas.close()


def test_unprepared_layers_are_registered_but_not_reported_as_available(tmp_path):
    atlas=AtlasStore(tmp_path)
    environmental=[layer for layer in layers(atlas) if layer['id'] in ('temperature','illumination')]
    assert len(environmental)==2
    assert all(layer['preparation_status']=='not_prepared' for layer in environmental)
    assert all(layer['angular_spacing_deg'] is None for layer in environmental)
    assert not any(source.overlay_available for source in atlas.catalog())


def test_real_environmental_tiles_preserve_blank_coverage_and_source_values(tmp_path):
    atlas=AtlasStore(polar=TerrainStore());atlas.directory=tmp_path
    for identifier,kind in [('solar-visibility','illumination'),('diviner-polar-midnight','temperature')]:
        grid=atlas.environment[identifier]
        for z,x,y in [(2,0,0),(2,3,3),(5,0,31)]:
            values=tile_values(grid,kind,z,x,y)
            with Image.open(BytesIO(render_tile(atlas,identifier,kind,z,x,y))) as image:
                assert np.array_equal(np.asarray(image)[...,3]>0,np.isfinite(values))
            assert np.any(np.isfinite(values)) if y==2**z-1 else not np.any(np.isfinite(values))
        layer=next(layer for layer in layers(atlas) if layer['dataset_id']==identifier)
        assert layer['preparation_status']=='ready'
        assert layer['source_id']==grid.source.product_id
    atlas.close()
