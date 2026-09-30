"""Numeric atlas services independent of visualization and HTTP."""
import json
import math
from pathlib import Path
import numpy as np
from backend.app.data.atlas import OUTPUT, RAW
from backend.app.data.catalog import definitions
from backend.app.models.atlas import AtlasPoint, CatalogEntry, Quantity
from lunaros.dataset import checksum

RADIUS = 1737400


class NumericGrid:
    def __init__(self, values, source):
        self.values = values
        self.source = source
        self.rows,self.columns = values.shape
        self.ppd = self.columns/360
        self.step_m = math.pi*RADIUS/(180*self.ppd)
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
        slope = Quantity(value=None,unit='deg',status='unavailable',quantity_kind='derived',
            method='Slope processing not yet prepared',**common)
        return AtlasPoint(latitude_deg=latitude,longitude_deg=longitude%360,longitude_defined=abs(latitude)!=90,
            pixel_center=[lon,lat],sample_row=row,sample_column=col,dataset_id=self.source.id,
            elevation=elevation,slope=slope,frame_note=self.source.frame_note,
            terrain_source='LOLA polar fill' if self.source.id=='gld100' and abs(lat)>79 else self.source.instrument)


class AtlasStore:
    def __init__(self,directory:Path=OUTPUT,globe=None,polar=None):
        self.directory=directory; self.globe=globe; self.polar=polar
        self.definitions=definitions(); self.grids={}; self.errors={}
        if globe is not None: self.grids['lola-global']=NumericGrid(globe.elevation,self.definitions['lola-global'])
        source=self.definitions['gld100']; path=directory/source.id
        try:
            registry=json.loads((path/'registry.json').read_text(encoding='utf8'))
            if registry['schema_version']!=1 or registry['source']!=source.model_dump() or registry['shape']!=[5760,11520]:
                raise ValueError('Atlas registry does not match verified source')
            for name,spec in registry['artifacts'].items():
                if name!='elevation.npy' or (path/name).stat().st_size!=spec['bytes'] or checksum(path/name)!=spec['sha256']:
                    raise ValueError('Atlas numeric integrity check failed')
            values=np.load(path/'elevation.npy',mmap_mode='r',allow_pickle=False)
            if values.shape!=(5760,11520) or values.dtype!=np.dtype('<i2'):raise ValueError('Unexpected native grid')
            self.grids[source.id]=NumericGrid(values,source)
        except (OSError,ValueError,KeyError) as error:self.errors[source.id]=str(error)
    def catalog(self):
        result=[]
        for source in self.definitions.values():
            ready=source.id in self.grids or (source.adapter=='existing_polar' and self.polar is not None)
            downloaded=bool(source.files) and all((RAW/name).exists() for name in source.files)
            result.append(CatalogEntry(**source.model_dump(), acquisition_status='ready' if ready else
                'downloaded' if downloaded else 'not_acquired' if source.files else 'discovered',
                numerical_queries=ready,overlay_available=False,download_bytes=sum(file.bytes for file in source.files.values())))
        return result
    def grid(self,identifier='auto'):
        if identifier=='auto':identifier='gld100' if 'gld100' in self.grids else 'lola-global'
        if identifier not in self.grids:raise ValueError('Dataset unavailable for atlas numeric queries; prepare its validated adapter')
        return self.grids[identifier]
    def close(self):
        for grid in self.grids.values():
            if isinstance(grid.values,np.memmap): grid.values._mmap.close()
