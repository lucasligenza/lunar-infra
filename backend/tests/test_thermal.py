import json
import numpy as np
import pytest
from backend.app.data.thermal import crop_chunks,prepare,STEP,NAME,validate_labels
from backend.app.data.atlas import RAW
from backend.app.geospatial.terrain import RADIUS_M,unproject
from backend.app.services.atlas import AtlasStore


def record(x,y,temp=80.):
    lon,lat=unproject(x,y)
    if lon>180:lon-=360
    return [x/RADIUS_M,y/RADIUS_M,lon,lat,temp]


def test_thermal_native_bins_preserve_omissions_zero_and_coordinate_validation():
    data=np.array([record(0,0,0),record(STEP,0,100.)])
    values,metadata=crop_chunks([data],2)
    assert values[200,200]==0 and values[200,201]==100
    assert np.isnan(values[200,199]) and metadata['registered_cells']==2
    with pytest.raises(ValueError,match='Duplicate'):crop_chunks([data,data])
    with pytest.raises(ValueError,match='record count'):crop_chunks([data],3)
    bad=data.copy();bad[1,2]+=10
    with pytest.raises(ValueError,match='projection'):crop_chunks([bad])
    bad=data.copy();bad[1,:]=record(STEP+2,0)
    with pytest.raises(ValueError,match='lattice'):crop_chunks([bad])


def test_thermal_rejects_changed_label(tmp_path):
    for suffix in ['.lbl','.xml']:(tmp_path/(NAME+suffix)).write_bytes((RAW/(NAME+suffix)).read_bytes())
    validate_labels(tmp_path)
    path=tmp_path/(NAME+'.lbl');path.write_text(path.read_text().replace('240 <m/pix>','120 <m/pix>'))
    with pytest.raises(ValueError,match='MAP_SCALE'):validate_labels(tmp_path)


def test_real_thermal_is_reproducible_and_integrity_checked(tmp_path):
    first=prepare(output=tmp_path,offline=True)
    assert first==prepare(output=tmp_path,offline=True)
    assert first['source_records']==3604300 and first['registered_cells']==122389
    assert first['acquisition']['download_bytes']<300000000
    grid=AtlasStore(tmp_path).environment['diviner-polar-midnight']
    assert grid.sample(0,0).status=='unavailable'
    # Independent fixed-record reference from the original published table.
    with (RAW/(NAME+'.tab')).open('rb') as stream:
        stream.seek((1457752+1)*59)
        native=np.fromstring(stream.read(59).decode('ascii'),sep=',')
    assert native[2]==-135 and native[4]==73.90419
    assert grid.sample(native[2],native[3]).value==pytest.approx(native[4],rel=1e-6)
    registry=json.loads((tmp_path/'diviner-polar-midnight'/'registry.json').read_text())
    assert registry['source']['period']['local_time_max_hours']==.25
    path=tmp_path/'diviner-polar-midnight'/'temperature.npy';path.write_bytes(b'corrupt')
    assert 'diviner-polar-midnight' not in AtlasStore(tmp_path).environment
