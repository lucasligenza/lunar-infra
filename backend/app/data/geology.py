"""USGS source polygon preparation; categorical values are never interpolated."""
import csv
import json
import math
import numpy as np
import shapefile
from affine import Affine
from pyproj import CRS
from rasterio.features import rasterize
from backend.app.data.range_archive import acquire_members
from lunaros.dataset import ROOT,checksum,verify_file

PINS=ROOT/'data/geology-archive.json'
METHOD='USGS source polygons rasterized at 16 ppd cell centers; categorical IDs; east-positive 0–360; no class interpolation'
RADIUS=1737400


def archive_definition():return json.loads(PINS.read_text(encoding='utf8'))


def category_table(raw):
    colors=list(csv.DictReader((raw/'GeologyUnit_colors.csv').read_text(encoding='utf-8-sig').splitlines()))
    descriptions={item['Unit']:item for item in csv.DictReader((raw/'Unified_Geologic_Map_of_the_Moon_DOMU_descriptions.csv').read_text(encoding='utf-8-sig').splitlines())}
    # Source polygons/colors use Iohs; the supplied description table labels the
    # same named secondary facies Ios. Preserve both codes and disclose the join.
    if set(item['unit'] for item in colors)-set(descriptions)!={'Iohs'} or set(descriptions)-set(item['unit'] for item in colors)!={'Ios'}:
        raise ValueError('Unexpected geology classification table discrepancy')
    descriptions['Iohs']=descriptions.pop('Ios')
    if len(colors)!=49:raise ValueError('Unexpected geology classification count')
    return [dict(id=index+1,code=item['unit'],color=item['color_hex'],name=descriptions[item['unit']]['Name'],
                 description=descriptions[item['unit']]['Description'],interpretation=descriptions[item['unit']]['Interpretation'],
                 description_source_code=descriptions[item['unit']]['Unit'],
                 source_note='Polygons/colors use Iohs; supplied description table uses Ios for the named secondary facies.' if item['unit']=='Iohs' else None) for index,item in enumerate(colors)]


def validate_crs(raw):
    wkt=(raw/'GeoUnits.prj').read_text(encoding='ascii');crs=CRS.from_wkt(wkt)
    expected=CRS.from_proj4('+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +R=1737400 +units=m +no_defs')
    if not crs.equals(expected,ignore_axis_order=True):raise ValueError('Unexpected source lunar projection')
    return wkt


def prepare_geology(source,raw,output,offline=False,budget=128*1024*1024):
    pins=archive_definition();members=pins['members']
    if not all((raw/item['filename']).exists() for item in members) and not offline:
        acquire_members(pins['url'],pins['archive_bytes'],members,raw,budget)
    for item in members:verify_file(raw/item['filename'],item)
    wkt=validate_crs(raw);categories=category_table(raw);directory=output/source.id;directory.mkdir(parents=True,exist_ok=True)
    try:
        registered=json.loads((directory/'registry.json').read_text(encoding='utf8'))
        if registered['source']==source.model_dump() and registered['method']==METHOD:
            for name,spec in registered['artifacts'].items():verify_file(directory/name,spec)
            return {'prepared':str(directory),'artifacts':registered['artifacts'],'cached':True}
    except (OSError,ValueError,KeyError):pass
    # One polygon and bounding window at a time; no global list of source vertices.
    rows,cols=2880,5760;step=math.pi*RADIUS/(180*16)
    transform=Affine(step,0,-math.pi*RADIUS,0,-step,math.pi*RADIUS/2)
    target=directory/'classes.npy';values=np.zeros((rows,cols),dtype=np.uint8)
    codes={item['code']:item['id'] for item in categories}
    with shapefile.Reader(raw/'GeoUnits.shp') as reader:
        if reader.shapeType!=shapefile.POLYGON or len(reader)!=12247:raise ValueError('Unexpected source polygon schema or count')
        if max(abs(reader.bbox[0]+math.pi*RADIUS),abs(reader.bbox[2]-math.pi*RADIUS),
               abs(reader.bbox[1]+math.pi*RADIUS/2),abs(reader.bbox[3]-math.pi*RADIUS/2))>1:
            raise ValueError('Source extent does not match global lunar projected coordinates')
        for item in reader.iterShapeRecords():
            code=item.record.as_dict()['FIRST_Unit']
            if code not in codes:raise ValueError('Unknown source geological classification')
            left,bottom,right,top=item.shape.bbox
            c0=max(0,math.floor((left-transform.c)/step));c1=min(cols,math.ceil((right-transform.c)/step))
            r0=max(0,math.floor((transform.f-top)/step));r1=min(rows,math.ceil((transform.f-bottom)/step))
            if c0>=c1 or r0>=r1:raise ValueError('Source polygon outside validated global extent')
            rasterize([(item.shape.__geo_interface__,codes[code])],out=values[r0:r1,c0:c1],
                transform=transform*Affine.translation(c0,r0),all_touched=False)
    # Original projected grid starts at -180; roll once to normalized 0–360.
    result=np.lib.format.open_memmap(target,mode='w+',dtype='u1',shape=(rows,cols))
    result[:,:cols//2]=values[:,cols//2:];result[:,cols//2:]=values[:,:cols//2];result.flush();del result
    category_path=directory/'categories.json';category_path.write_text(json.dumps(categories,indent=2)+'\n',encoding='utf8')
    registry={'schema_version':1,'source':source.model_dump(),'source_wkt':wkt,'shape':[rows,cols],'method':METHOD,
        'map_scale':5000000,'nodata':0,'source_polygons':12247,'unclassified_cells':int((values==0).sum()),
        'artifacts':{path.name:{'bytes':path.stat().st_size,'sha256':checksum(path)} for path in [target,category_path]}}
    (directory/'registry.json').write_text(json.dumps(registry,indent=2)+'\n',encoding='utf8')
    return {'prepared':str(directory),'artifacts':registry['artifacts'],'unclassified_cells':registry['unclassified_cells']}
