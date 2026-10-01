"""Bounded, pinned Diviner summer/local-time acquisition; never a mission series."""
import argparse
from itertools import islice
import json
import re
import shutil
import xml.etree.ElementTree as ET
import numpy as np
from rasterio import Affine
from backend.app.data.atlas import RAW, OUTPUT
from backend.app.data.catalog import definitions
from backend.app.geospatial.terrain import FORWARD, RADIUS_M
from lunaros.dataset import checksum, fetch_files, verify_file

IDENTIFIER = 'diviner-polar-midnight'
NAME = 'pcp_avg_tbol_pols_sum_ltim01_240'
STEP = 240.035957
TRANSFORM = Affine(STEP, 0, -200.5*STEP, 0, -STEP, 200.5*STEP)
SHAPE = (401, 401)
METHOD = 'diviner-polar-native-v1'


def plan(raw=RAW):
    source = definitions()[IDENTIFIER]
    size = sum(file.bytes for file in source.files.values())
    if size > 300_000_000:
        raise ValueError('Thermal acquisition exceeds the approved 300 MB total budget')
    if shutil.disk_usage(raw if raw.exists() else OUTPUT.parent).free < size*4:
        raise ValueError('Insufficient disk space for source, temporary download and processing')
    return {'dataset_id':IDENTIFIER, 'download_bytes':size, 'disk_budget_bytes':size*4,
            'subset_method':'One summer/local-time product; native bins cropped to ~96 km polar square'}


def validate_labels(raw):
    label = (raw/(NAME+'.lbl')).read_text(encoding='ascii')
    def field(name):
        matches = re.findall(r'^\s*'+re.escape(name)+r'\s*=\s*([^\r\n]+)', label, re.M)
        if len(matches) != 1:
            raise ValueError(f'Invalid Diviner field {name}')
        return matches[0].strip().strip('"')
    expected = {'TARGET_NAME':'MOON', 'PRODUCT_ID':NAME.upper()+'.TAB', 'PRODUCT_VERSION_ID':'1',
        'MAP_PROJECTION_TYPE':'POLAR STEREOGRAPHIC', 'KEYWORD_LATITUDE_TYPE':'PLANETOCENTRIC',
        'POSITIVE_LONGITUDE_DIRECTION':'EAST', 'RECORD_BYTES':'59', 'FILE_RECORDS':'3604301',
        'ROWS':'3604300', 'COLUMNS':'5', 'MAP_SCALE':'240 <m/pix>',
        'A_AXIS_RADIUS':'1737.4 <km>', 'B_AXIS_RADIUS':'1737.4 <km>', 'C_AXIS_RADIUS':'1737.4 <km>',
        'START_TIME':'2009-07-05T16:50:26.195', 'STOP_TIME':'2019-02-17T00:00:00.000',
        'LRO:DLRE_CLOCTIME_MIN':'0.00 <hour>', 'LRO:DLRE_CLOCTIME_MAX':'0.25 <hour>'}
    for name,value in expected.items():
        if field(name) != value:
            raise ValueError(f'Unsupported Diviner {name}')
    root = ET.parse(raw/(NAME+'.xml')).getroot()
    namespace = {'p':'http://pds.nasa.gov/pds4/pds/v1'}
    fields = root.findall('.//p:Field_Character', namespace)
    names = [node.find('p:name',namespace).text for node in fields]
    if names != ['x','y','clon','clat','tbol'] or fields[-1].find('p:unit',namespace).text != 'K':
        raise ValueError('Unsupported PDS4 thermal table columns or units')


def crop_chunks(chunks, expected_records=None):
    values = np.full(SHAPE, np.nan, dtype=np.float32)
    count = 0
    residual = 0.
    for data in chunks:
        if data.ndim != 2 or data.shape[1] != 5 or not np.isfinite(data).all():
            raise ValueError('Malformed Diviner numeric record')
        x,y = data[:,:2].T*RADIUS_M
        lon,lat,temp = data[:,2:].T
        # Source boundary bins have centers up to one nominal pixel beyond -80 degrees.
        if np.any((lat < -90) | (lat > -79.99) | (lon < -180) | (lon > 180) | (temp < 0)):
            raise ValueError('Unsupported thermal coordinates or values')
        px,py = FORWARD.transform(lon,lat,errcheck=True)
        if np.max(np.hypot(px-x,py-y),initial=0) > 1:
            raise ValueError('Diviner table coordinates do not match the documented lunar projection')
        ix,iy = np.rint(x/STEP).astype(int),np.rint(y/STEP).astype(int)
        error = np.max(np.maximum(abs(x-ix*STEP),abs(y-iy*STEP)),initial=0)
        residual = max(residual,float(error))
        if error > .9:
            raise ValueError('Source coordinates do not match the validated native lattice')
        covered = (abs(ix)<=200) & (abs(iy)<=200)
        rows,columns = 200-iy[covered],ix[covered]+200
        keys = rows*SHAPE[1]+columns
        if len(np.unique(keys)) != len(keys) or np.isfinite(values[rows,columns]).any():
            raise ValueError('Duplicate native thermal bins')
        values[rows,columns] = temp[covered]
        count += len(data)
    if expected_records is not None and count != expected_records:
        raise ValueError('Thermal record count differs from label')
    return values, {'source_records':count, 'registered_cells':int(np.isfinite(values).sum()),
                    'maximum_coordinate_quantization_m':residual}


def prepare(raw=RAW, output=OUTPUT, offline=False):
    acquisition = plan(raw)
    source = definitions()[IDENTIFIER]
    files = {name:file.model_dump() for name,file in source.files.items()}
    if not offline:
        fetch_files(raw,files)
    for name,spec in files.items():
        verify_file(raw/name,spec)
    validate_labels(raw)
    def chunks():
        with (raw/(NAME+'.tab')).open(encoding='ascii') as stream:
            next(stream)
            while records := list(islice(stream,100_000)):
                yield np.loadtxt(records,delimiter=',',ndmin=2)
    values,validation = crop_chunks(chunks(),3_604_300)
    destination = output/IDENTIFIER
    destination.mkdir(parents=True,exist_ok=True)
    path = destination/'temperature.npy'
    temporary = destination/'temperature.tmp'
    with temporary.open('wb') as stream:
        np.save(stream,values,allow_pickle=False)
    temporary.replace(path)
    registry = {'schema_version':1, 'source':source.model_dump(), 'shape':list(SHAPE),
        'transform':list(TRANSFORM)[:6], 'method':METHOD, 'validation':validation,
        'artifacts':{'temperature.npy':{'bytes':path.stat().st_size,'sha256':checksum(path)}}}
    temporary = destination/'registry.tmp'
    temporary.write_text(json.dumps(registry,indent=2),encoding='utf8')
    temporary.replace(destination/'registry.json')
    return {'acquisition':acquisition, **validation, 'minimum_k':float(np.nanmin(values)),
            'maximum_k':float(np.nanmax(values))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline',action='store_true')
    parser.add_argument('--plan',action='store_true')
    args = parser.parse_args()
    print(json.dumps(plan() if args.plan else prepare(offline=args.offline),indent=2))
