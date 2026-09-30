import math
from io import BytesIO
import numpy as np
from PIL import Image
import pytest
from backend.app.data.catalog import definitions
from backend.app.geospatial.global_terrain import RADIUS, slope_rows, slope_at
from backend.app.services.atlas import NumericGrid, AtlasStore
from backend.app.services.atlas_tiles import colors, STYLES, tile_bounds, tile_values, render_tile


@pytest.mark.parametrize('ppd',[1,4,16])
def test_spherical_slope_matches_analytic_surface_at_multiple_resolutions(ppd):
    lat=np.radians(90-(np.arange(180*ppd)+.5)/ppd)
    lon=np.radians((np.arange(360*ppd)+.5)/ppd)
    # Synthetic spherical harmonic; exact derivatives independently known.
    a,b=10000,7000
    height=a*np.cos(lat[:,None])*np.sin(lon[None,:])+b*np.sin(lat[:,None])
    row,col=round(45*ppd),round(73*ppd)
    actual=slope_at(height,ppd,row,col)
    dx=a*math.cos(lon[col])/RADIUS
    dy=(-a*math.sin(lat[row])*math.sin(lon[col])+b*math.cos(lat[row]))/RADIUS
    expected=math.degrees(math.atan(math.hypot(dx,dy)))
    assert actual==pytest.approx(expected,rel=6e-5)
    derived=slope_rows(height,ppd,row,row+1)
    assert float(derived[0,col])==pytest.approx(actual,rel=1e-6)
    for seam in [0,360*ppd-1]:assert float(derived[0,seam])==pytest.approx(slope_at(height,ppd,row,seam),rel=1e-6)
    assert slope_at(height,ppd,0,0) is None


def test_slope_nodata_flat_surface_and_polar_boundaries():
    data=np.zeros((180,360),dtype=np.int16)
    assert slope_at(data,1,90,0)==0
    data[89,0]=-32765
    assert slope_at(data,1,90,0) is None
    assert np.isnan(slope_rows(data,1,90,91)[0,0])
    assert np.isnan(slope_rows(data,1,0,1)).all()
    assert np.isnan(slope_rows(data,1,179,180)).all()


def test_geographic_tiles_wrap_and_colors_match_numeric_queries(tmp_path):
    atlas=AtlasStore()
    grid=atlas.grid('gld100')
    assert grid.sample(23.47,.67).slope.status=='ok'
    for z,x,y in [(0,0,0),(0,1,0),(3,15,2),(5,0,16),(5,63,31)]:
        west,south,east,north=tile_bounds(z,x,y)
        for layer in ['elevation','slope']:
            values=tile_values(grid,layer,z,x,y)
            row,col=100,120
            latitude=north-(row+.5)*(north-south)/256
            longitude=west+(col+.5)*(east-west)/256
            sample=grid.sample(longitude,latitude)
            expected=getattr(sample,layer).value
            assert values[row,col]==pytest.approx(expected,rel=1e-6) if expected is not None else np.isnan(values[row,col])
            atlas.directory=tmp_path
            payload=render_tile(atlas,'gld100',layer,z,x,y)
            assert payload==render_tile(atlas,'gld100',layer,z,x,y)
            with Image.open(BytesIO(payload)) as image:
                assert image.size==(256,256)
                assert np.array_equal(np.asarray(image)[row,col],colors(values,STYLES[layer])[row,col])
    with pytest.raises(ValueError):tile_bounds(6,0,0)
    with pytest.raises(ValueError):tile_bounds(1,4,0)
    assert colors(np.array([[np.nan,0.]]),STYLES['slope'])[0,0,3]==0
    atlas.close()
