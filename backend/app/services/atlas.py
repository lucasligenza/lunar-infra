"""Numeric atlas services independent of visualization and HTTP."""
import json
import math
from pathlib import Path
import numpy as np
from backend.app.data.atlas import OUTPUT, RAW
from backend.app.data.catalog import definitions
from backend.app.models.atlas import AtlasPoint, CatalogEntry, Quantity
from backend.app.geospatial.global_terrain import slope_at, SLOPE_METHOD
from lunaros.dataset import checksum
from backend.app.services.geology import GeologyGrid

RADIUS = 1737400


class NumericGrid:
    def __init__(self, values, source, slopes=None):
        self.values = values
        self.source = source
        self.rows,self.columns = values.shape
        self.ppd = self.columns/360
        self.step_m = math.pi*RADIUS/(180*self.ppd)
        self.slopes=slopes
    def indices(self,longitude,latitude):
        if not math.isfinite(latitude) or not -90<=latitude<=90 or not math.isfinite(longitude):
            raise ValueError('Invalid lunar coordinates')
        return min(self.rows-1,math.floor((90-latitude)*self.ppd)),math.floor((longitude%360)*self.ppd)
    def sample(self,longitude,latitude):
        row,col = self.indices(longitude,latitude)
        raw = int(self.values[row,col])
        value = None if raw<=-32764 else raw*(.5 if self.source.id=='lola-global' else 1)
        lat = 90-(row+.5)/self.ppd
        lon = (col+.5)/self.ppd
        east = self.step_m*math.cos(math.radians(lat))
        common = dict(source_id=self.source.product_id,version=self.source.version,
                      spacing_north_m=self.step_m,spacing_east_m=east,
                      support_north_m=self.step_m,support_east_m=east)
        elevation = Quantity(value=value,unit='m',status='nodata' if value is None else 'ok',
            quantity_kind='measured_gridded',method='Containing native pixel; no interpolation',**common)
        derived=float(self.slopes[row,col]) if self.slopes is not None else slope_at(self.values,self.ppd,row,col,.5 if self.source.id=='lola-global' else 1)
        derived=derived if derived is not None and math.isfinite(derived) else None
        slope = Quantity(value=derived,unit='deg',status='ok' if derived is not None else 'nodata',quantity_kind='derived',
            method=SLOPE_METHOD,**(common|{'support_north_m':2*self.step_m,'support_east_m':2*east}))
        return AtlasPoint(latitude_deg=latitude,longitude_deg=longitude%360,longitude_defined=abs(latitude)!=90,
            pixel_center=[lon,lat],sample_row=row,sample_column=col,dataset_id=self.source.id,
            elevation=elevation,slope=slope,frame_note=self.source.frame_note,
            terrain_source='LOLA polar fill' if self.source.id=='gld100' and abs(lat)>79 else self.source.instrument)


class AtlasStore:
    def __init__(self,directory:Path=OUTPUT,globe=None,polar=None):
        self.directory=directory; self.globe=globe; self.polar=polar
        self.definitions=definitions(); self.grids={}; self.errors={};self.classifications={}
        if globe is not None: self.grids['lola-global']=NumericGrid(globe.elevation,self.definitions['lola-global'])
        source=self.definitions['gld100']; path=directory/source.id
        try:
            registry=json.loads((path/'registry.json').read_text(encoding='utf8'))
            if registry['schema_version']!=1 or registry['source']!=source.model_dump() or registry['shape']!=[5760,11520]:
                raise ValueError('Atlas registry does not match verified source')
            for name,spec in registry['artifacts'].items():
                if name not in {'elevation.npy','slope.npy'} or (path/name).stat().st_size!=spec['bytes'] or checksum(path/name)!=spec['sha256']:
                    raise ValueError('Atlas numeric integrity check failed')
            values=np.load(path/'elevation.npy',mmap_mode='r',allow_pickle=False)
            if values.shape!=(5760,11520) or values.dtype!=np.dtype('<i2'):raise ValueError('Unexpected native grid')
            slopes=None
            if 'slope.npy' in registry['artifacts']:
                if registry.get('slope_method')!=SLOPE_METHOD:raise ValueError('Unexpected slope derivation')
                slopes=np.load(path/'slope.npy',mmap_mode='r',allow_pickle=False)
                if slopes.shape!=values.shape or slopes.dtype!=np.dtype('<f4'):raise ValueError('Invalid slope grid')
            self.grids[source.id]=NumericGrid(values,source,slopes)
        except (OSError,ValueError,KeyError) as error:self.errors[source.id]=str(error)
        source=self.definitions['usgs-geology']
        try:self.classifications[source.id]=GeologyGrid(directory/source.id,source)
        except (OSError,ValueError,KeyError) as error:self.errors[source.id]=str(error)
    def catalog(self):
        result=[]
        for source in self.definitions.values():
            download_bytes=sum(file.bytes for file in source.files.values())
            if source.adapter=='range_zip_geology':
                from backend.app.data.geology import archive_definition
                download_bytes=sum(item['compressed_bytes'] for item in archive_definition()['members'])+2*1024*1024
            ready=source.id in self.grids or source.id in self.classifications or (source.adapter=='existing_polar' and self.polar is not None)
            downloaded=bool(source.files) and all((RAW/name).exists() for name in source.files)
            result.append(CatalogEntry(**source.model_dump(), acquisition_status='ready' if ready else
                'downloaded' if downloaded else 'not_acquired' if source.files else 'discovered',
                numerical_queries=ready,overlay_available=source.id in self.grids or source.id in self.classifications,download_bytes=download_bytes))
        return result
    def grid(self,identifier='auto'):
        if identifier=='auto':identifier='gld100' if 'gld100' in self.grids else 'lola-global'
        if identifier not in self.grids:raise ValueError('Dataset unavailable for atlas numeric queries; prepare its validated adapter')
        return self.grids[identifier]
    def close(self):
        for grid in self.classifications.values():grid.values._mmap.close()
        for grid in self.grids.values():
            if isinstance(grid.values,np.memmap): grid.values._mmap.close()
            if isinstance(grid.slopes,np.memmap): grid.slopes._mmap.close()
