"""Reproducible, bounded acquisition and native-grid atlas preparation."""
import argparse
import json
import math
from pathlib import Path
import re
import shutil
import numpy as np
import rasterio
from pyproj import CRS
from backend.app.data.catalog import definitions
from backend.app.geospatial.global_terrain import slope_rows, SLOPE_METHOD
from lunaros.dataset import ROOT, checksum, fetch_files, verify_file

RAW = ROOT / 'data/raw/atlas'
OUTPUT = ROOT / 'data/processed/atlas'
DEFAULT_BUDGET = 256 * 1024 * 1024


def acquisition_plan(identifier: str, raw: Path = RAW, budget: int = DEFAULT_BUDGET):
    source = definitions()[identifier]
    if source.adapter=='range_zip_geology':
        from backend.app.data.geology import archive_definition
        archive=archive_definition();size=sum(item['compressed_bytes'] for item in archive['members'])+2*1024*1024
        disk=sum(item['bytes'] for item in archive['members'])*3
        if size>budget:raise ValueError('Selected archive members exceed explicit acquisition budget')
        if shutil.disk_usage(raw if raw.exists() else ROOT).free<disk:raise ValueError('Insufficient disk space for geology source and artifacts')
        return {'dataset_id':identifier,'download_bytes':size,'disk_budget_bytes':disk,'archive_bytes':archive['archive_bytes'],
            'subset_method':'Verified byte-range ZIP members only; preserve original polygons and rasterize categorical IDs'}
    size = sum(file.bytes for file in source.files.values())
    if not source.files or source.adapter != 'pds_equirectangular':
        raise ValueError('This source has no validated acquisition adapter')
    if size > budget:
        raise ValueError('Acquisition exceeds the explicit download budget; review size and obtain approval')
    if shutil.disk_usage(raw if raw.exists() else ROOT).free < size * 5:
        raise ValueError('Insufficient disk space for source and derived artifacts')
    return {'dataset_id': identifier, 'download_bytes': size, 'disk_budget_bytes': size * 5,
            'subset_method': 'Bounded full product; numeric queries/tiles use local windows'}


def validate_gld(path: Path, source):
    with path.open('rb') as stream:
        label = stream.read(23040).decode('ascii')
    clean = re.sub(r'/\*.*?\*/','',label,flags=re.S)
    def field(name):
        values = re.findall(r'^\s*'+re.escape(name)+r'\s*=\s*([^\r\n]+)',clean,re.M)
        if len(values)!=1: raise ValueError(f'Invalid label field {name}')
        return values[0].strip().strip('"')
    expected = {'PDS_VERSION_ID':'PDS3','TARGET_NAME':'MOON','PRODUCT_ID':source.product_id,
        'PRODUCT_VERSION_ID':source.version,'SAMPLE_TYPE':'LSB_INTEGER','SAMPLE_BITS':'16',
        'MAP_PROJECTION_TYPE':'EQUIRECTANGULAR','PROJECTION_LATITUDE_TYPE':'PLANETOCENTRIC',
        'POSITIVE_LONGITUDE_DIRECTION':'EAST','LINES':'5760','LINE_SAMPLES':'11520',
        'RECORD_BYTES':'23040','FILE_RECORDS':'5761','^IMAGE':'2','SCALING_FACTOR':'1.0','OFFSET':'0.0',
        'CORE_NULL':'-32768','CORE_LOW_REPR_SATURATION':'-32767','CORE_LOW_INSTR_SATURATION':'-32766',
        'CORE_HIGH_REPR_SATURATION':'-32764','CORE_HIGH_INSTR_SATURATION':'-32765'}
    for key,value in expected.items():
        if field(key)!=value: raise ValueError(f'Unsupported GLD100 {key}')
    for key,value in {'A_AXIS_RADIUS':1737.4,'B_AXIS_RADIUS':1737.4,'C_AXIS_RADIUS':1737.4,
        'MAP_RESOLUTION':32,'CENTER_LATITUDE':0,'CENTER_LONGITUDE':0,
        'SAMPLE_PROJECTION_OFFSET':-.5,'LINE_PROJECTION_OFFSET':2879.5}.items():
        if not math.isclose(float(field(key).split()[0]),value,abs_tol=1e-8):
            raise ValueError(f'Unsupported GLD100 geometry {key}')
    with rasterio.open(path) as raster:
        step = math.pi*1737400/(180*32)
        if (raster.shape!=(5760,11520) or raster.dtypes!=('int16',) or raster.count!=1
            or not CRS(raster.crs).equals(CRS(source.crs),ignore_axis_order=True)
            or not np.allclose(list(raster.transform)[:6],[step,0,0,0,-step,math.pi*1737400/2],atol=1e-6,rtol=0)):
            raise ValueError('GDAL metadata differs from validated lunar grid')
    return label


def prepare(identifier: str = 'gld100', raw: Path = RAW, output: Path = OUTPUT, offline=False):
    source = definitions()[identifier]
    plan = acquisition_plan(identifier,raw)
    if source.adapter=='range_zip_geology':
        from backend.app.data.geology import prepare_geology
        return plan|prepare_geology(source,raw,output,offline)
    files = {name: spec.model_dump() for name,spec in source.files.items()}
    if not offline: fetch_files(raw,files)
    for name,spec in files.items(): verify_file(raw/name,spec)
    directory = output/identifier
    try:
        registered=json.loads((directory/'registry.json').read_text(encoding='utf8'))
        if (registered['source']==source.model_dump() and registered.get('slope_method')==SLOPE_METHOD
            and set(registered['artifacts'])=={'elevation.npy','slope.npy'}):
            for name,spec in registered['artifacts'].items():verify_file(directory/name,spec)
            return plan | {'prepared':str(directory),'artifacts':registered['artifacts']}
    except (OSError,ValueError,KeyError):pass
    path = raw / next(iter(files))
    label = validate_gld(path,source)
    directory.mkdir(parents=True,exist_ok=True)
    # Copy native signed values, including every PDS null/saturation code. No resampling.
    native = np.memmap(path,dtype='<i2',offset=23040,mode='r',shape=(5760,11520))
    target = directory/'elevation.npy'
    result = np.lib.format.open_memmap(target,mode='w+',dtype='<i2',shape=native.shape)
    for row in range(0,native.shape[0],128): result[row:row+128] = native[row:row+128]
    result.flush(); del result
    slope_target=directory/'slope.npy'
    slopes=np.lib.format.open_memmap(slope_target,mode='w+',dtype='<f4',shape=native.shape)
    for row in range(0,native.shape[0],64):
        slopes[row:row+64]=slope_rows(native,32,row,min(row+64,native.shape[0]))
    slopes.flush();del slopes
    (directory/'source-label.txt').write_text(label.rstrip()+'\n',encoding='ascii')
    registry = {'schema_version':1,'source':source.model_dump(), 'shape':list(native.shape),
        'angular_step_deg':1/32,'reference_radius_m':1737400,'nodata_rule':'DN <= -32764 (five PDS special codes)',
        'processing':'Preserve native signed height in meters relative to lunar reference sphere; no interpolation',
        'slope_method':SLOPE_METHOD,
        'artifacts':{file.name:{'bytes':file.stat().st_size,'sha256':checksum(file)} for file in [target,slope_target]}}
    (directory/'registry.json').write_text(json.dumps(registry,indent=2)+'\n',encoding='utf8')
    return plan | {'prepared':str(directory), 'artifacts':registry['artifacts']}


if __name__=='__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset',default='gld100',choices=['gld100','usgs-geology'])
    parser.add_argument('--offline',action='store_true')
    parser.add_argument('--plan',action='store_true')
    args=parser.parse_args()
    print(json.dumps(acquisition_plan(args.dataset) if args.plan else prepare(args.dataset,offline=args.offline),indent=2))
