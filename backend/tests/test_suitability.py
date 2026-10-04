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


def test_fronts_rank_terrain_only_within_a_terrain_source():
    def candidate(name,terrain,sun,group):
        return Candidate(id=name,latitude_deg=0,longitude_deg=0,radius_km=5,dataset_id='fixture',source_id='synthetic',version='test',spacing_m=1000,
            valid_terrain_fraction=1,low_slope_fraction=terrain,low_slope_area_km2=1,mean_slope_deg=1,solar_visibility=sun,solar_valid_fraction=1 if sun is not None else 0,
            temperature_at_center=None,evidence_group=group,tradeoff_front=0,reasons=[],unknowns=[])
    # Solar visibility covers only polar regions, so it never ranks candidates.
    data=[candidate('flat',.9,.2,'lola-south'),candidate('sunny',.5,.8,'lola-south'),
          candidate('inferior',.4,.1,'lola-south'),candidate('global',1,None,'gld100')]
    result={item.id:item.tradeoff_front for item in fronts(data)}
    assert result=={'flat':1,'sunny':2,'inferior':3,'global':1}


def test_flat_synthetic_surface_and_nodata_are_explicit_mathematical_tests():
    source=definitions()['gld100'];values=np.zeros((720,1440),dtype=np.int16)
    atlas=SimpleNamespace(grids={'gld100':None},polar=None,environment={},definitions={'gld100':source})
    grid=NumericGrid(values,source);atlas.grid=lambda dataset:grid
    request=SuitabilityRequest(area=CircleArea(latitude_deg=0,longitude_deg=359.9,radius_km=25))
    report=screen(atlas,request)
    assert report.candidates and all(item.low_slope_fraction==1 for item in report.candidates)
    assert all(item.solar_visibility is None and item.evidence_group=='gld100' for item in report.candidates)
    assert all(item.screening_score==100 and item.data_completeness==pytest.approx(1) for item in report.candidates)
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


def test_sunlight_is_descriptive_and_never_changes_scores():
    sources=definitions();values=np.zeros((720,1440),dtype=np.int16)
    grid=NumericGrid(values,sources['gld100'])
    illumination=SimpleNamespace(source=sources['solar-visibility'],at=lambda lon,lat:np.zeros(lon.shape))
    atlas=SimpleNamespace(grids={'gld100':grid},polar=None,environment={'solar-visibility':illumination},definitions=sources,grid=lambda dataset:grid)
    request=SuitabilityRequest(area=CircleArea(latitude_deg=0,longitude_deg=359.9,radius_km=25))
    zero=screen(atlas,request)
    assert zero.candidates and all(item.solar_visibility==0 for item in zero.candidates)
    # Valid zero sunlight is kept as evidence but does not lower or raise the score.
    assert all(item.screening_score==100*item.low_slope_fraction and item.evidence_group=='gld100' for item in zero.candidates)
    without=screen(SimpleNamespace(grids={'gld100':grid},polar=None,environment={},definitions=sources,grid=lambda dataset:grid),request)
    assert [item.screening_score for item in without.candidates]==[item.screening_score for item in zero.candidates]
    def sliver(lon,lat):
        result=np.full(lon.shape,np.nan);result.flat[0]=1
        return result
    illumination.at=sliver
    partial=screen(atlas,request)
    assert partial.candidates and all(item.solar_visibility is None for item in partial.candidates)
    assert all(item.solar_valid_fraction<.9 for item in partial.candidates)
    assert all(item.evidence_group=='gld100' for item in partial.candidates)


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
        # Preliminary screening score: bounded, explained and never a habitability claim.
        assert 'habitab' not in response.text.lower().replace('not habitability','')
        for item in report.candidates:
            assert item.screening_score==pytest.approx(100*item.low_slope_fraction) and item.data_completeness>=.9
            assert [component.criterion for component in item.score_components]==['low_slope_terrain']
        body['max_slope_deg']=-1;assert client.post('/atlas/suitability',json=body).status_code==422
        body['max_slope_deg']=5;body['area']['latitude_deg']=91
        assert client.post('/atlas/suitability',json=body).status_code==422


def test_screening_score_is_terrain_only_with_bands():
    from backend.app.services.screening_score import screening_score,band,WEIGHTS
    # Only criteria prepared for the entire Moon are scored.
    assert WEIGHTS=={'low_slope_terrain':1.0}
    score,name,components=screening_score(.73,5)
    assert score==pytest.approx(73) and name=='promising'
    assert [(c.criterion,c.weight,c.evaluated) for c in components]==[('low_slope_terrain',1.0,True)]
    assert screening_score(1,5)[0]==100 and screening_score(0,5)[0]==0
    assert [band(value) for value in [100,80,79.99,60,59.99,40,39.99,0]]==['strong','strong','promising','promising','mixed','mixed','constrained','constrained']
    for invalid in [1.2,-.1]:
        with pytest.raises(ValueError):screening_score(invalid,5)


def test_real_scores_are_terrain_only_and_rank_within_terrain_sources():
    atlas=AtlasStore(polar=TerrainStore())
    for area in [CircleArea(latitude_deg=-89.67,longitude_deg=129.78,radius_km=25),CircleArea(latitude_deg=.67,longitude_deg=23.47,radius_km=25)]:
        report=screen(atlas,SuitabilityRequest(area=area))
        assert report.model_version=='settlement-screening-v3' and report.score_method=='preliminary-screening-score-v2'
        assert report==screen(atlas,SuitabilityRequest(area=area))
        for item in report.candidates:
            assert item.screening_score==pytest.approx(100*item.low_slope_fraction,abs=1e-9)
            assert item.data_completeness==item.valid_terrain_fraction>=.9
            assert item.evidence_group==item.dataset_id
        for group in {item.evidence_group for item in report.candidates}:
            members=[item for item in report.candidates if item.evidence_group==group]
            assert [item.rank_in_group for item in members]==list(range(1,len(members)+1))
            assert [item.screening_score for item in members]==sorted((item.screening_score for item in members),reverse=True)
    atlas.close()


def test_neighborhood_cells_reproduce_candidate_screening_on_polar_and_global_grids():
    from backend.app.models.suitability import NeighborhoodRequest
    from backend.app.services.suitability import neighborhood
    atlas=AtlasStore(polar=TerrainStore())
    for area in [CircleArea(latitude_deg=-89.67,longitude_deg=129.78,radius_km=25),CircleArea(latitude_deg=.67,longitude_deg=23.47,radius_km=25)]:
        report=screen(atlas,SuitabilityRequest(area=area))
        for candidate in report.candidates[:3]:
            cells=neighborhood(atlas,NeighborhoodRequest(latitude_deg=candidate.latitude_deg,longitude_deg=candidate.longitude_deg,
                radius_km=candidate.radius_km,dataset_id=candidate.dataset_id,max_slope_deg=report.request.max_slope_deg))
            assert cells.dataset_id==candidate.dataset_id and cells.spacing_m==pytest.approx(candidate.spacing_m)
            assert cells.low_slope_fraction==pytest.approx(candidate.low_slope_fraction,abs=1e-12)
            assert cells.valid_terrain_fraction==pytest.approx(candidate.valid_terrain_fraction,abs=1e-12)
            assert cells.solar_valid_fraction==pytest.approx(candidate.solar_valid_fraction,abs=1e-12)
            assert (cells.solar_visibility is None)==(candidate.solar_visibility is None)
            if candidate.solar_visibility is not None:assert cells.solar_visibility==pytest.approx(candidate.solar_visibility,abs=1e-12)
            assert len(cells.cells)>=7
            for cell in cells.cells:
                distance=float(angular_distance(cell.center[0],cell.center[1],candidate.longitude_deg,candidate.latitude_deg))*RADIUS_M/1000
                assert distance<=candidate.radius_km+1e-6
                assert len(cell.polygon)==4 and cell.area_km2>0
                assert cell.low_slope is None or cell.low_slope==(cell.slope_deg<=report.request.max_slope_deg)
                # Cell edges follow native spacing; no finer grid is drawn than the data supports.
                edge=float(angular_distance(*cell.polygon[0],*cell.polygon[1]))*RADIUS_M
                assert edge==pytest.approx(cells.spacing_m*(1 if candidate.dataset_id=='lola-south' else math.cos(math.radians(cell.center[1]))),rel=.05)
    with pytest.raises(ValueError,match='outside the prepared south-pole'):
        neighborhood(atlas,NeighborhoodRequest(latitude_deg=0,longitude_deg=0,radius_km=5,dataset_id='lola-south'))
    atlas.close()


def test_neighborhood_api_is_typed_and_rejects_invalid_requests(tmp_path):
    with TestClient(create_app(db_path=tmp_path/'missions.sqlite')) as client:
        body={'latitude_deg':.67,'longitude_deg':23.47,'radius_km':5,'dataset_id':'gld100'}
        response=client.post('/atlas/suitability/neighborhood',json=body);assert response.status_code==200
        assert response.json()['cells'] and response.json()['source_id']
        assert client.post('/atlas/suitability/neighborhood',json=body|{'dataset_id':'mock'}).status_code==422
        assert client.post('/atlas/suitability/neighborhood',json=body|{'radius_km':0}).status_code==422
