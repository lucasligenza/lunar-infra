from io import BytesIO
import json,math,urllib.request,zipfile
import numpy as np
from PIL import Image
import pytest
import shapefile
from fastapi.testclient import TestClient
from backend.app.data.atlas import RAW,OUTPUT,prepare
from backend.app.data.geology import validate_crs,category_table
from backend.app.data.range_archive import RangeArchive,inspect_archive,acquire_members
from backend.app.services.atlas import AtlasStore
from backend.app.services.atlas_tiles import render_tile,colors,tile_bounds
from backend.app.main import create_app


def test_bounded_zip_adapter_checks_ranges_crc_budget_and_member_pins(tmp_path,monkeypatch):
    payload=BytesIO()
    with zipfile.ZipFile(payload,'w',compression=zipfile.ZIP_DEFLATED) as archive:archive.writestr('nested/science.dat',b'synthetic test data'*500)
    data=payload.getvalue();requests=[]
    class Reply(BytesIO):
        def __init__(self,body,headers,status):super().__init__(body);self.headers=headers;self.status=status
    def response(request,timeout):
        requests.append(request)
        if request.get_method()=='HEAD':return Reply(b'',{'Content-Length':str(len(data)),'ETag':'"pinned"'},200)
        first,last=map(int,request.headers['Range'].split('=')[1].split('-'))
        return Reply(data[first:last+1],{'Content-Range':f'bytes {first}-{last}/{len(data)}'},206)
    monkeypatch.setattr(urllib.request,'urlopen',response)
    metadata=inspect_archive('https://verified.test/archive.zip',len(data))
    result=acquire_members('https://verified.test/archive.zip',len(data),metadata,tmp_path)
    assert result['selected_members']==1 and (tmp_path/'science.dat').read_bytes()==b'synthetic test data'*500
    assert all(request.get_method()=='HEAD' or request.headers.get('If-match')=='"pinned"' for request in requests)
    with pytest.raises(ValueError):RangeArchive('https://verified.test/archive.zip',len(data),budget_bytes=1).read(2)
    metadata[0]['crc32']+=1
    with pytest.raises(ValueError):acquire_members('https://verified.test/archive.zip',len(data),metadata,tmp_path)
    monkeypatch.setattr(urllib.request,'urlopen',lambda request,timeout:Reply(data,{'Content-Length':str(len(data))},200))
    with pytest.raises(ValueError,match='exact byte ranges'):RangeArchive('https://verified.test/archive.zip',len(data)).read(10)


def source_class_at(longitude,latitude):
    x=1737400*math.radians((longitude+180)%360-180);y=1737400*math.radians(latitude);unit=None
    with shapefile.Reader(RAW/'GeoUnits.shp') as reader:
        for item in reader.iterShapeRecords(bbox=(x,y,x,y)):
            inside=False;ends=list(item.shape.parts)+[len(item.shape.points)]
            for first,last in zip(ends[:-1],ends[1:]):
                points=np.asarray(item.shape.points[first:last]);a=points;b=np.roll(points,-1,axis=0)
                with np.errstate(divide='ignore',invalid='ignore'):
                    crossed=((a[:,1]>y)!=(b[:,1]>y))&(x<a[:,0]+(y-a[:,1])*(b[:,0]-a[:,0])/(b[:,1]-a[:,1]))
                inside^=bool(np.count_nonzero(crossed)%2)
            if inside:unit=item.record['FIRST_Unit']
    return unit


def test_real_geology_registration_sampling_alignment_and_source_polygon_agreement(tmp_path):
    atlas=AtlasStore();grid=atlas.classifications['usgs-geology']
    table=category_table(RAW);assert len(table)==49
    alias=next(item for item in table if item['code']=='Iohs');assert alias['description_source_code']=='Ios' and alias['source_note']
    for lon,lat in [(23.47,.67),(348.8,-43.3),(339.92,9.62),(180,-53),(359.9,89.5),(0,-89.5),(180,0)]:
        measurement=grid.sample(lon,lat);center_lon,center_lat=measurement.pixel_center
        assert measurement.category['code']==source_class_at(center_lon,center_lat)
        assert measurement==grid.sample(lon-360,lat)
    pinned=json.loads((OUTPUT/'usgs-geology/registry.json').read_text())['artifacts']
    assert prepare('usgs-geology',offline=True)['artifacts']==pinned
    assert validate_crs(RAW).startswith('PROJCS')
    (tmp_path/'GeoUnits.prj').write_text((RAW/'GeoUnits.prj').read_text().replace('1737400.0','6378137.0'))
    with pytest.raises(ValueError):validate_crs(tmp_path)
    atlas.directory=tmp_path
    z,x,y=3,1,3;west,south,east,north=tile_bounds(z,x,y);r,c=87,119
    longitude=west+(c+.5)*(east-west)/256;latitude=north-(r+.5)*(north-south)/256
    sample=grid.sample(longitude,latitude);expected=sample.category['color']
    with Image.open(BytesIO(render_tile(atlas,'usgs-geology','geology',z,x,y))) as image:
        assert list(np.asarray(image)[r,c])==[int(expected[i:i+2],16) for i in (1,3,5)]+[255]
    assert colors(np.array([[0]],dtype=np.uint8),{'categories':table})[0,0,3]==0
    atlas.close()


def test_geology_api_categorical_overlay_and_terrain_measurement_are_independent(tmp_path):
    with TestClient(create_app()) as client:
        point=client.get('/atlas/inspect?latitude=.67&longitude=23.47').json()
        assert point['geology']['status']=='ok' and point['geology']['quantity_kind']=='interpreted_categorical'
        assert point['elevation']['unit']=='m' and point['geology']['unit']=='geological unit'
        layer=next(item for item in client.get('/atlas/layers').json() if item['id']=='geology')
        assert len(layer['categories'])==49 and layer['minimum'] is None
        assert client.get('/atlas/tiles/usgs-geology/geology/0/0/0.png').status_code==200
        assert client.get('/atlas/acquisition/usgs-geology').json()['download_bytes']<90_000_000
    with TestClient(create_app(atlas_dir=tmp_path)) as client:
        assert client.get('/atlas/tiles/usgs-geology/geology/0/0/0.png').status_code==422
        assert client.get('/atlas/inspect?latitude=0&longitude=0').json()['geology'] is None
