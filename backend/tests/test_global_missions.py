from fastapi.testclient import TestClient
from backend.app.main import create_app


def test_global_scenarios_place_assets_reopen_and_simulate_with_immutable_terrain_provenance(tmp_path):
    database=tmp_path/'missions.sqlite'
    with TestClient(create_app(db_path=database)) as client:
        site={'latitude_deg':.67,'longitude_deg':23.47}
        # The original scenario domain retains its actual prepared footprint.
        assert client.post('/scenarios',json={'name':'Invalid polar','site':site}).status_code==422
        response=client.post('/scenarios',json={'name':'Apollo-region hypothetical outpost','region_id':'global-atlas','site':site,
            'mission':{'start':'2027-01-01T00:00:00Z','end':'2027-01-01T02:00:00Z','illumination_factors':[1,0]}})
        assert response.status_code==201,response.text
        scenario=response.json();path='/scenarios/'+scenario['id']
        assert scenario['dataset_identifiers']=={'WAC_GLD100_E000N1800_032P':'v1.4'}
        for kind in ['habitat','solar_array','battery']:
            response=client.post(path+'/assets',json={'revision':scenario['revision'],'asset':{'kind':kind,'name':kind,'location':site}})
            assert response.status_code==201,response.text
            scenario=response.json()
        moved=client.patch(path+'/assets/'+scenario['assets'][0]['id'],json={'revision':scenario['revision'],'changes':{'location':{'latitude_deg':89.5,'longitude_deg':359.9}}})
        assert moved.status_code==200;scenario=moved.json()
        first=client.post(path+'/simulations',json={'revision':scenario['revision']})
        assert first.status_code==201,first.text
        run=first.json();again=client.post(path+'/simulations',json={'revision':scenario['revision']}).json()
        assert run['input_sha256']==again['input_sha256'] and run['result_sha256']==again['result_sha256']
        assert run['result']['input_kind']=='synthetic'
        provenance=run['scientific_provenance']['gld100']
        assert provenance['numeric_artifacts']['elevation.npy']['sha256']
        assert provenance['temporal_illumination_available'] is False
        assert client.post(path+'/duplicate',json={'revision':scenario['revision']}).status_code==201
        assert client.patch(path,json={'revision':scenario['revision'],'site':{'latitude_deg':91,'longitude_deg':1}}).status_code==422
    with TestClient(create_app(db_path=database)) as client:
        assert client.get(path).json()['assets'][0]['location']['latitude_deg']==89.5
        assert client.get('/simulations/'+run['id']).json()['result_sha256']==run['result_sha256']


def test_global_missions_do_not_require_polar_data_and_missing_atlas_is_explicit(tmp_path):
    with TestClient(create_app(data_dir=tmp_path,db_path=tmp_path/'db.sqlite')) as client:
        assert client.post('/scenarios',json={'name':'Global','region_id':'global-atlas','site':{'latitude_deg':0,'longitude_deg':180}}).status_code==201
        assert client.post('/scenarios',json={'name':'Polar','site':{'latitude_deg':-89.5,'longitude_deg':0}}).status_code==503
    with TestClient(create_app(data_dir=tmp_path,globe_dir=tmp_path,atlas_dir=tmp_path,db_path=tmp_path/'missing.sqlite')) as client:
        assert client.post('/scenarios',json={'name':'Missing','region_id':'global-atlas','site':{'latitude_deg':0,'longitude_deg':180}}).status_code==503
