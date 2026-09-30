"""Synthetic protocol fixtures; these tests do not claim scientific measurements."""
from io import BytesIO
import json
from urllib.error import URLError
import pytest
from fastapi.testclient import TestClient
from backend.app.data import discovery
from backend.app.main import create_app

IDENTIFIER='urn:nasa:pds:test:synthetic_collection'


def document():
    return {'summary':{'hits':30},'data':[{'id':IDENTIFIER+':synthetic_product::1.0','title':'Synthetic protocol test',
        'type':'Product_Observational','metadata':{'label_url':'https://pds.nasa.gov/test.xml','version':'1.0'},
        'start_date_time':'2009-01-01T00:00:00Z','properties':{
            'ops:Data_File_Info.ops:file_ref':['https://pds.nasa.gov/test.tab'],
            'ops:Data_File_Info.ops:file_size':['113'],'ops:Data_File_Info.ops:md5_checksum':['0'*32],
            'geom:Surface_Geometry_Min_Max.geom:minimum_latitude':[0],
            'geom:Surface_Geometry_Min_Max.geom:maximum_latitude':[10]}}]}


class Response(BytesIO):
    def __init__(self,payload):super().__init__(payload);self.headers={}


def test_discovery_preserves_metadata_and_hashes_cache_without_fetching_products(tmp_path,monkeypatch):
    calls=[]
    def opened(request,timeout):
        calls.append(request.full_url);assert timeout==10;return Response(json.dumps(document()).encode())
    monkeypatch.setattr(discovery,'urlopen',opened)
    result=discovery.discover(IDENTIFIER,cache_dir=tmp_path)
    assert result.total_products==30 and len(result.products)==1
    assert result.products[0].indexed_coverage['south']==0
    assert result.products[0].files[0].bytes==113
    assert result.products[0].files[0].md5=='0'*32
    assert not result.numerical_queries and not result.overlay_available
    assert discovery.discover(IDENTIFIER,cache_dir=tmp_path,offline=True)==result
    assert len(calls)==1 and '/members?limit=10' in calls[0]
    path=next(tmp_path.glob('*.json'));saved=json.loads(path.read_text());saved['raw_json']+=' '
    path.write_text(json.dumps(saved))
    with pytest.raises(ValueError,match='integrity'):discovery.discover(IDENTIFIER,cache_dir=tmp_path)
    with pytest.raises(ValueError,match='No cached'):discovery.discover(IDENTIFIER,limit=5,cache_dir=tmp_path,offline=True)


def test_discovery_rejects_unbounded_or_unrelated_provider_results(tmp_path,monkeypatch):
    with pytest.raises(ValueError):discovery.collection_url('https://localhost/secrets',10)
    with pytest.raises(ValueError):discovery.collection_url(IDENTIFIER,21)
    fixture=document();fixture['data'][0]['id']='urn:nasa:pds:other:unrelated'
    monkeypatch.setattr(discovery,'urlopen',lambda *args,**kw:Response(json.dumps(fixture).encode()))
    with pytest.raises(ValueError,match='unrelated'):discovery.discover(IDENTIFIER,cache_dir=tmp_path)
    fixture['data']=document()['data']*2
    with pytest.raises(ValueError,match='limit'):discovery.discover(IDENTIFIER,limit=1,cache_dir=tmp_path)
    monkeypatch.setattr(discovery,'urlopen',lambda *args,**kw:Response(b'x'*(discovery.MAX_BYTES+1)))
    with pytest.raises(ValueError,match='budget'):discovery.discover(IDENTIFIER,cache_dir=tmp_path)
    assert not list(tmp_path.iterdir())


def test_discovery_refuses_ambiguous_files_and_api_failure_is_explicit(tmp_path,monkeypatch):
    fixture=document();fixture['data'][0]['properties']['ops:Data_File_Info.ops:file_size']=[]
    monkeypatch.setattr(discovery,'urlopen',lambda *args,**kw:Response(json.dumps(fixture).encode()))
    with pytest.raises(ValueError,match='unambiguously'):discovery.discover(IDENTIFIER,cache_dir=tmp_path)
    monkeypatch.setattr(discovery,'CACHE',tmp_path)
    def unavailable(*args,**kw):raise URLError('Synthetic connection failure')
    monkeypatch.setattr(discovery,'urlopen',unavailable)
    with TestClient(create_app(db_path=tmp_path/'test.sqlite')) as client:
        providers=client.get('/atlas/providers').json();assert providers[0]['id']=='diviner-gcp'
        assert client.get('/atlas/discovery/unknown').status_code==404
        response=client.get('/atlas/discovery/diviner-gcp')
        assert response.status_code==503 and 'no numerical data' in response.json()['detail']
        assert client.get('/atlas/discovery/diviner-gcp?limit=500').status_code==422
        assert next(item for item in client.get('/atlas/datasets').json() if item['id']=='diviner-temperature')['numerical_queries'] is False
