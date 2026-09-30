import json
import math
from pathlib import Path
import numpy as np
from backend.app.models.globe import GlobeInspection, GlobeLocation, GlobalElevation, GlobeMetadata
from backend.app.geospatial.terrain import OutsideRegion
from lunaros.dataset import MANIFEST, checksum


class GlobeStore:
    def __init__(self, directory: Path):
        self.directory = directory
        self.registry = json.loads((directory / 'registry.json').read_text(encoding='utf-8'))
        from backend.app.data.globe import MANIFEST as imagery_manifest
        if (self.registry['schema_version'] != 1
            or self.registry['terrain'] != json.loads(MANIFEST.read_text())
            or self.registry['imagery'] != json.loads(imagery_manifest.read_text())
            or self.registry['grid'] != {'rows': 720, 'columns': 1440, 'pixels_per_degree': 4,
                'scale_m': .5, 'reference_radius_m': 1737400, 'frame': 'MEAN EARTH/POLAR AXIS OF DE421', 'nodata_dn': -32768}
            or set(self.registry['artifacts']) != {'color-1k.jpg', 'color-4k.jpg', 'elevation.bin'}):
            raise ValueError('Unexpected global scientific registry')
        for name, artifact in self.registry['artifacts'].items():
            path = directory / name
            if path.stat().st_size != artifact['bytes'] or checksum(path) != artifact['sha256']:
                raise ValueError('Global artifact integrity verification failed')
        raw = (directory / 'elevation.bin').read_bytes()
        if len(raw) != 2073600 or checksum(directory / 'elevation.bin') != self.registry['terrain']['files']['ldem_4.img']['sha256']:
            raise ValueError('Global elevation must preserve verified native samples')
        self.elevation = np.frombuffer(raw, dtype='<i2').reshape((720, 1440))

    def metadata(self):
        return GlobeMetadata(available=True, artifacts=self.registry['artifacts'])

    def sample(self, longitude: float, latitude: float):
        row = min(719, math.floor((90 - latitude) * 4))
        column = math.floor((longitude % 360) * 4)
        value = int(self.elevation[row, column])
        return GlobalElevation(value=None if value == -32768 else value * .5,
                               status='nodata' if value == -32768 else 'ok'), row, column


def inspect(longitude: float, latitude: float, globe: GlobeStore | None, terrain) -> GlobeInspection:
    coordinates = GlobeLocation(latitude_deg=latitude, longitude_deg=longitude % 360,
                                longitude_defined=abs(latitude) != 90)
    elevation, row, column = globe.sample(longitude, latitude) if globe else (GlobalElevation(value=None, status='unavailable'), None, None)
    local_status = 'outside_coverage'
    if latitude <= 0:
        # Geographic coverage comes from the same grid contract used by analysis,
        # including half-open bounds; availability/nodata are separate outcomes.
        from backend.app.geospatial.terrain import project, cell_at
        from backend.app.data.pipeline import TRANSFORM, SHAPE
        try:
            cell_at(TRANSFORM, SHAPE, *project(longitude, latitude))
            if terrain is None:
                local_status = 'unavailable'
            else:
                local_status = 'available' if terrain.inspect(longitude, latitude).elevation.status == 'ok' else 'nodata'
        except OutsideRegion:
            pass
    supported = local_status == 'available'
    return GlobeInspection(coordinates=coordinates, elevation=elevation, sample_row=row, sample_column=column,
        local_status=local_status, local_analysis=supported, planning=supported,
        local_region_id='south-pole' if local_status != 'outside_coverage' else None)
