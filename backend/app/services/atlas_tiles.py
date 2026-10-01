"""Geographic color tiles; colors never serve as numerical data."""
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import Path
from uuid import uuid4
import numpy as np
from PIL import Image
from backend.app.geospatial.global_terrain import slope_at

STYLES={
 'elevation':{'name':'Elevation','unit':'m','minimum':-10000,'maximum':12000,'colors':['#183951','#527b91','#bcc1a7','#e2b883','#faf0da']},
 'slope':{'name':'Derived terrain slope','unit':'deg','minimum':0,'maximum':30,'colors':['#152f43','#4b8395','#c7cda2','#e4b56c','#ca6455']},
}


ENV_STYLES={'illumination':{'name':'Average solar visibility','unit':'fraction','minimum':0,'maximum':1,'colors':['#172633','#506372','#acac88','#f4da8b']}}

def tile_bounds(z,x,y):
    if not 0<=z<=5 or not 0<=x<2**(z+1) or not 0<=y<2**z:raise ValueError('Invalid geographic tile')
    step=180/2**z
    return [x*step,90-(y+1)*step,(x+1)*step,90-y*step]


def colors(values,style):
    if 'categories' in style:
        palette=np.zeros((50,4),dtype=np.uint8)
        for item in style['categories']:palette[item['id']]=[int(item['color'][i:i+2],16) for i in (1,3,5)]+[255]
        return palette[values.astype(np.uint8)]
    valid=np.isfinite(values)
    stops=np.linspace(style['minimum'],style['maximum'],len(style['colors']))
    palette=np.array([[int(color[i:i+2],16) for i in (1,3,5)] for color in style['colors']])
    rgba=np.zeros((*values.shape,4),dtype=np.uint8)
    for channel in range(3):rgba[...,channel]=np.interp(np.nan_to_num(values,nan=style['minimum']),stops,palette[:,channel]).astype(np.uint8)
    rgba[...,3]=valid.astype(np.uint8)*255
    return rgba


def layers(atlas):
    result=[dict(style,dataset_id=identifier,id=kind,source_id=grid.source.product_id,version=grid.source.version,
        angular_spacing_deg=1/grid.ppd,tile_size=256,max_level=5,
        sampling='Containing native pixel at tile-pixel center; no scientific interpolation; display colors clip to legend',
        url_template=f'/atlas/tiles/{identifier}/{kind}/{{z}}/{{x}}/{{y}}.png')
        for identifier,grid in atlas.grids.items() for kind,style in STYLES.items()]
    for identifier,grid in atlas.classifications.items():
        result.append(dict(name='USGS geological units',id='geology',dataset_id=identifier,unit='geological unit',
            source_id=grid.source.product_id,version=grid.source.version,angular_spacing_deg=1/grid.ppd,
            categories=grid.categories,minimum=None,maximum=None,colors=[],tile_size=256,max_level=5,
            sampling='Source polygons rasterized at cell centers; categorical values, no interpolation',
            url_template=f'/atlas/tiles/{identifier}/geology/{{z}}/{{x}}/{{y}}.png'))
    for identifier,grid in atlas.environment.items():
        kind='illumination'
        result.append(dict(ENV_STYLES[kind],id=kind,dataset_id=identifier,source_id=grid.source.product_id,
            version=grid.source.version,angular_spacing_deg=math.degrees(grid.transform.a/1737400),
            tile_size=256,max_level=5,sampling=grid.method,
            url_template=f'/atlas/tiles/{identifier}/{kind}/{{z}}/{{x}}/{{y}}.png'))
    return result


def tile_values(grid,layer,z,x,y,size=256):
    west,south,east,north=tile_bounds(z,x,y)
    lat=north-(np.arange(size)+.5)*(north-south)/size
    lon=west+(np.arange(size)+.5)*(east-west)/size
    if hasattr(grid,'at'):return grid.at(lon[None,:],lat[:,None])
    rows=np.minimum(grid.rows-1,np.floor((90-lat)*grid.ppd).astype(int))
    cols=np.floor((lon%360)*grid.ppd).astype(int)
    if layer=='geology':return np.asarray(grid.values[np.ix_(rows,cols)])
    if layer=='elevation':
        values=np.asarray(grid.values[np.ix_(rows,cols)],dtype=float)
        values[values<=-32764]=np.nan
        return values*(.5 if grid.source.id=='lola-global' else 1)
    if layer=='slope':
        if grid.slopes is not None:return np.asarray(grid.slopes[np.ix_(rows,cols)],dtype=float)
        return np.array([[slope_at(grid.values,grid.ppd,row,col,.5 if grid.source.id=='lola-global' else 1) for col in cols] for row in rows],dtype=float)
    raise ValueError('Unknown scientific layer')


def render_tile(atlas,identifier,layer,z,x,y):
    tile_bounds(z,x,y)
    if identifier in atlas.environment:
        if layer!='illumination':raise ValueError('Unsupported environmental layer')
        grid=atlas.environment[identifier];style=ENV_STYLES[layer]
    elif layer=='geology':
        if identifier not in atlas.classifications:raise ValueError('Geological layer is not prepared')
        grid=atlas.classifications[identifier];style={'categories':grid.categories}
    else:
        if layer not in STYLES:raise ValueError('Unknown layer')
        grid=atlas.grid(identifier);style=STYLES[layer]
    key=sha256(json.dumps({'source':grid.source.model_dump(),'style':style,'method':'native-tile-v1/spherical-slope-v1'},sort_keys=True).encode()).hexdigest()[:16]
    cache=atlas.directory/'tiles'/key/identifier/layer/str(z)/str(x)
    path=cache/f'{y}.png'
    if path.exists():return path.read_bytes()
    image=Image.fromarray(colors(tile_values(grid,layer,z,x,y),style))
    output=BytesIO();image.save(output,format='PNG');payload=output.getvalue()
    cache.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(f'.{uuid4().hex}.tmp')
    try:temporary.write_bytes(payload);temporary.replace(path)
    finally:temporary.unlink(missing_ok=True)
    # A bounded persistent cache, scoped to generated atlas tiles only.
    root=atlas.directory/'tiles';files=list(root.rglob('*.png'))
    if sum(file.stat().st_size for file in files)>256*1024*1024:
        for old in sorted(files,key=lambda file:file.stat().st_mtime)[:32]:
            if old.resolve().is_relative_to(root.resolve()):old.unlink(missing_ok=True)
    return payload
