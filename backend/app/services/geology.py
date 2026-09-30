import json
import math
import numpy as np
from backend.app.data.geology import METHOD
from backend.app.models.atlas import GeologyQuantity
from lunaros.dataset import checksum


class GeologyGrid:
    def __init__(self,directory,source):
        registry=json.loads((directory/'registry.json').read_text(encoding='utf8'))
        if registry['schema_version']!=1 or registry['source']!=source.model_dump() or registry['method']!=METHOD or registry['shape']!=[2880,5760]:
            raise ValueError('Geology registry differs from validated source')
        if set(registry['artifacts'])!={'classes.npy','categories.json'}:raise ValueError('Unexpected geology artifacts')
        for name,spec in registry['artifacts'].items():
            if (directory/name).stat().st_size!=spec['bytes'] or checksum(directory/name)!=spec['sha256']:raise ValueError('Geology artifact integrity failed')
        self.values=np.load(directory/'classes.npy',mmap_mode='r',allow_pickle=False)
        if self.values.shape!=(2880,5760) or self.values.dtype!=np.dtype('u1'):raise ValueError('Unexpected class grid')
        self.categories=json.loads((directory/'categories.json').read_text(encoding='utf8'))
        if len(self.categories)!=49 or [item['id'] for item in self.categories]!=list(range(1,50)):raise ValueError('Invalid category schema')
        self.source=source;self.rows,self.columns=self.values.shape;self.ppd=16
    def sample(self,longitude,latitude):
        if not math.isfinite(longitude) or not math.isfinite(latitude) or not -90<=latitude<=90:raise ValueError('Invalid lunar coordinates')
        row=min(self.rows-1,math.floor((90-latitude)*self.ppd));column=math.floor((longitude%360)*self.ppd)
        value=int(self.values[row,column]);category=self.categories[value-1] if value else None
        return GeologyQuantity(status='ok' if value else 'nodata',category=category,source_id=self.source.product_id,
            version=self.source.version,pixel_center=[(column+.5)/self.ppd,90-(row+.5)/self.ppd],frame_note=self.source.frame_note,
            method=METHOD)
