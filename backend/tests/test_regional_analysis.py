import math
import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from backend.app.data.catalog import definitions
from backend.app.geospatial.sectors import lookup,sectors,sector
from backend.app.services.atlas import NumericGrid
from backend.app.services.regional_analysis import analyze,profile,selection,angular_distance
from backend.app.models.analysis import AnalysisRequest,ProfileRequest,BoxArea
from backend.app.main import create_app


def test_cube_sectors_cover_all_faces_and_wrap_longitude_without_polar_singularities():
    assert len(sectors(1))==24
    for face,lat,lon in [('near',0,0),('east',0,90),('far',0,180),('west',0,270),('north',90,73),('south',-90,355)]:
        assert lookup(lon,lat)['face']==face
    assert lookup(-1,0)['id']==lookup(359,0)['id']
    for item in sectors(2):
        assert lookup(item['center']['longitude_deg'],item['center']['latitude_deg'],2)['id']==item['id']
        assert item['boundary'][0]==item['boundary'][-1]
        assert all(-90<=point['latitude_deg']<=90 for point in item['boundary'])
    with pytest.raises(ValueError):sector('earth')
    with pytest.raises(ValueError):lookup(float('nan'),0)


def test_exact_spherical_box_weights_seam_poles_nodata_and_weighted_statistics():
    values=np.broadcast_to(np.arange(180)[:,None],(180,360)).astype('int16')
    grid=NumericGrid(values,definitions()['gld100'])
    request=AnalysisRequest(area=BoxArea(south=60,north=90,west=350,east=10))
    rows,columns,weights=selection(grid,request.area)
    expected=1737400**2*math.radians(20)*(1-math.sin(math.radians(60)))
    assert weights.sum()==pytest.approx(expected,rel=1e-12)
    report=analyze(grid,request)
    assert report.selected_cells==600
    assert report.elevation.mean==pytest.approx(np.average(values[np.ix_(rows,columns)],weights=weights))
    assert report.elevation.mean!=pytest.approx(values[np.ix_(rows,columns)].mean())
    assert sum(item['fraction_of_valid_slope_area'] for item in report.slope_distribution)==pytest.approx(1)
    values[0,0]=-32764
    missing=analyze(grid,request)
    assert missing.elevation.valid_cells==599
    assert missing.elevation.valid_area_km2<missing.selected_area_km2
    partial=AnalysisRequest(area=BoxArea(south=60.3,north=89.8,west=359.3,east=.8))
    assert selection(grid,partial.area)[2].sum()==pytest.approx(1737400**2*math.radians(1.5)*(math.sin(math.radians(89.8))-math.sin(math.radians(60.3))),rel=1e-12)


def test_lunar_circle_and_profile_use_reference_sphere_and_native_pixels():
    data=np.zeros((720,1440),dtype='int16');grid=NumericGrid(data,definitions()['lola-global'])
    area={'kind':'circle','latitude_deg':0,'longitude_deg':359.9,'radius_km':100}
    result=analyze(grid,AnalysisRequest(area=area))
    expected=2*math.pi*1737400**2*(1-math.cos(100000/1737400))/1e6
    assert result.selected_area_km2==pytest.approx(expected,rel=.025)
    assert result.elevation.mean==0 and result.slope.mean==0
    req=ProfileRequest(start={'latitude_deg':0,'longitude_deg':359},end={'latitude_deg':0,'longitude_deg':1},samples=9)
    line=profile(grid,req)
    assert line.distance_km==pytest.approx(1737.4*math.radians(2))
    assert line.samples[4]['longitude_deg']==pytest.approx(0,abs=1e-10) or line.samples[4]['longitude_deg']==pytest.approx(360)
    assert all(item['elevation_m']==grid.sample(item['longitude_deg'],item['latitude_deg']).elevation.value for item in line.samples)
    polar=profile(grid,ProfileRequest(start={'latitude_deg':89,'longitude_deg':0},end={'latitude_deg':89,'longitude_deg':180}))
    assert polar.distance_km==pytest.approx(1737.4*math.radians(2))
    data[line.samples[2]['sample_row'],line.samples[2]['sample_column']]=-32768
    assert profile(grid,req).samples[2]['elevation_m'] is None
    with pytest.raises(ValueError):profile(grid,ProfileRequest(start={'latitude_deg':0,'longitude_deg':0},end={'latitude_deg':0,'longitude_deg':180}))
    with pytest.raises(ValidationError):AnalysisRequest(area={'kind':'circle','latitude_deg':91,'longitude_deg':0,'radius_km':5})


def test_real_multi_region_analysis_api_numeric_consistency_bounds_and_unavailable():
    with TestClient(create_app()) as client:
        assert len(client.get('/atlas/sectors?level=1').json())==24
        assert client.get('/atlas/sectors?level=4').status_code==422
        for lat,lon in [(0.67,23.47),(-43.3,348.8),(9.62,339.92),(89.5,180),(-89.5,0)]:
            area={'kind':'circle','latitude_deg':lat,'longitude_deg':lon,'radius_km':25}
            response=client.post('/atlas/analysis',json={'area':area})
            assert response.status_code==200,response.text
            report=response.json();point=client.get(f'/atlas/inspect?latitude={lat}&longitude={lon}').json()
            assert report['elevation']['minimum']<=point['elevation']['value']<=report['elevation']['maximum']
            assert report['source_id']==point['elevation']['source_id']
            line=client.post('/atlas/profile',json={'start':{'latitude_deg':lat,'longitude_deg':lon},'end':{'latitude_deg':lat-0.1,'longitude_deg':lon+.1}}).json()
            assert line['samples'][0]['elevation_m']==point['elevation']['value']
        assert client.post('/atlas/analysis',json={'area':{'kind':'box','south':-90,'north':90,'west':0,'east':360}}).status_code==422
        assert client.post('/atlas/analysis',json={'dataset':'diviner-temperature','area':area}).status_code==503
        assert client.post('/atlas/profile',json={'start':{'latitude_deg':0,'longitude_deg':0},'end':{'latitude_deg':0,'longitude_deg':0}}).status_code==422
