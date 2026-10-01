import math
from types import SimpleNamespace
import numpy as np
import pytest
from rasterio import Affine
from fastapi.testclient import TestClient
from backend.app.models.suitability import SuitabilityRequest,SuitabilityReport,Candidate
from backend.app.models.analysis import CircleArea
from backend.app.services.suitability import screen,destination,centers,fronts
from backend.app.services.regional_analysis import angular_distance
from backend.app.services.atlas import AtlasStore,NumericGrid
from backend.app.services.inspection import TerrainStore
from backend.app.main import create_app
from backend.app.data.catalog import definitions
from backend.app.geospatial.terrain import RADIUS_M


def test_lunar_search_centers_are_distinct_at_poles_and_wrap_longitude():
    for latitude in [-90,90,0]:
        area=CircleArea(latitude_deg=latitude,longitude_deg=359.9,radius_km=25)
        points=centers(area,5)
        assert len(points)==len(set(points)) and len(points)<=227
        for lon,lat in points:
            distance=float(angular_distance(lon,lat,area.longitude_deg,latitude))*RADIUS_M/1000
            assert distance<=25+1e-7 and 0<=lon<360
        for bearing in [0,90,180,270]:
            lon,lat=destination(359.9,latitude,10,bearing)
            assert float(angular_distance(lon,lat,359.9,latitude))*RADIUS_M/1000==pytest.approx(10,abs=1e-6)


def test_tradeoff_fronts_do_not_reward_missing_evidence_or_temperature():
    def candidate(name,terrain,sun,group):
        return Candidate(id=name,latitude_deg=0,longitude_deg=0,radius_km=5,dataset_id='fixture',source_id='synthetic',version='test',spacing_m=1000,
            valid_terrain_fraction=1,low_slope_fraction=terrain,low_slope_area_km2=1,mean_slope_deg=1,solar_visibility=sun,solar_valid_fraction=1 if sun is not None else 0,
            temperature_at_center=None,evidence_group=group,tradeoff_front=0,reasons=[],unknowns=[])
    data=[candidate('flat',.9,.2,'terrain-and-sunlight'),candidate('sunny',.5,.8,'terrain-and-sunlight'),
          candidate('inferior',.4,.1,'terrain-and-sunlight'),candidate('missing',1,None,'terrain-only')]
    result={item.id:item.tradeoff_front for item in fronts(data)}
    assert result=={'flat':1,'sunny':1,'missing':1,'inferior':2}


def test_flat_synthetic_surface_and_nodata_are_explicit_mathematical_tests():
    source=definitions()['gld100'];values=np.zeros((720,1440),dtype=np.int16)
    atlas=SimpleNamespace(grids={'gld100':None},polar=None,environment={},definitions={'gld100':source})
    grid=NumericGrid(values,source);atlas.grid=lambda dataset:grid
    request=SuitabilityRequest(area=CircleArea(latitude_deg=0,longitude_deg=359.9,radius_km=25))
    report=screen(atlas,request)
    assert report.candidates and all(item.low_slope_fraction==1 for item in report.candidates)
    assert all(item.solar_visibility is None and 'terrain-only' in item.evidence_group for item in report.candidates)
    assert all(item.radius_km>=1.5*grid.step_m/1000 for item in report.candidates)
    values[:]=-32768
    assert not screen(atlas,request).candidates


def test_real_candidates_are_reproducible_separated_and_keep_sources():
    atlas=AtlasStore(polar=TerrainStore())
    request=SuitabilityRequest(area=CircleArea(latitude_deg=-89.67,longitude_deg=129.78,radius_km=25))
    first=screen(atlas,request);assert first==screen(atlas,request)
    assert 1<=len(first.candidates)<=10
    assert all(item.dataset_id=='lola-south' for item in first.candidates)
    assert any(item.solar_visibility is not None for item in first.candidates)
    assert {'lola-south','solar-visibility'}<=set(source['id'] for source in first.sources)
    for i,item in enumerate(first.candidates):
        assert 0<=item.low_slope_fraction<=1 and 0<=item.valid_terrain_fraction<=1
        for other in first.candidates[:i]:
            assert float(angular_distance(item.longitude_deg,item.latitude_deg,other.longitude_deg,other.latitude_deg))*RADIUS_M/1000>=min(item.radius_km,other.radius_km)-1e-7
    north=screen(atlas,SuitabilityRequest(area=CircleArea(latitude_deg=90,longitude_deg=0,radius_km=25)))
    assert north.candidates and all(item.solar_visibility is None for item in north.candidates)
    atlas.close()


def test_zero_sunlight_is_valid_and_partial_coverage_cannot_rank_as_sunny():
    sources=definitions();values=np.zeros((720,1440),dtype=np.int16)
    grid=NumericGrid(values,sources['gld100'])
    illumination=SimpleNamespace(source=sources['solar-visibility'],at=lambda lon,lat:np.zeros(lon.shape))
    atlas=SimpleNamespace(grids={'gld100':grid},polar=None,environment={'solar-visibility':illumination},definitions=sources,grid=lambda dataset:grid)
    request=SuitabilityRequest(area=CircleArea(latitude_deg=0,longitude_deg=359.9,radius_km=25))
    zero=screen(atlas,request)
    assert zero.candidates and all(item.solar_visibility==0 for item in zero.candidates)
    assert all(item.evidence_group.endswith('/terrain-and-sunlight') for item in zero.candidates)
    def sliver(lon,lat):
        result=np.full(lon.shape,np.nan);result.flat[0]=1
        return result
    illumination.at=sliver
    partial=screen(atlas,request)
    assert partial.candidates and all(item.solar_visibility is None for item in partial.candidates)
    assert all(item.solar_valid_fraction<.9 for item in partial.candidates)
    assert all(item.evidence_group.endswith('/terrain-only') for item in partial.candidates)


def test_search_work_is_bounded(monkeypatch):
    from backend.app.services import suitability
    grid=NumericGrid(np.zeros((720,1440),dtype=np.int16),definitions()['gld100'])
    atlas=SimpleNamespace(grids={'gld100':grid},polar=None,environment={},grid=lambda dataset:grid)
    monkeypatch.setattr(suitability,'MAX_CELLS',1)
    with pytest.raises(ValueError,match='two million native cells'):
        screen(atlas,SuitabilityRequest(area=CircleArea(latitude_deg=0,longitude_deg=0,radius_km=25)))


def test_suitability_api_validates_inputs_and_returns_no_composite_score(tmp_path):
    with TestClient(create_app(db_path=tmp_path/'missions.sqlite')) as client:
        body={'area':{'latitude_deg':.67,'longitude_deg':23.47,'radius_km':25}}
        response=client.post('/atlas/suitability',json=body);assert response.status_code==200
        report=SuitabilityReport.model_validate(response.json());assert report.candidates
        assert all(item.solar_visibility is None for item in report.candidates)
        assert 'score' not in response.text
        body['max_slope_deg']=-1;assert client.post('/atlas/suitability',json=body).status_code==422
        body['max_slope_deg']=5;body['area']['latitude_deg']=91
        assert client.post('/atlas/suitability',json=body).status_code==422
