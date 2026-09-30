from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class GlobeLocation(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    latitude_deg: float = Field(ge=-90, le=90)
    longitude_deg: float = Field(ge=0, lt=360)
    longitude_defined: bool = True
    frame: str = 'MEAN EARTH/POLAR AXIS OF DE421'


class GlobalElevation(BaseModel):
    value: float | None
    unit: Literal['m'] = 'm'
    status: Literal['ok', 'nodata', 'unavailable']
    source_id: str = 'LDEM_4'
    version: str = 'V3.0'
    method: str = 'Containing 0.25 degree pixel; global gridded altimetry, not local terrain analysis'
    angular_resolution_deg: float = 0.25
    reference_radius_m: float = 1737400


class GlobeInspection(BaseModel):
    coordinates: GlobeLocation
    elevation: GlobalElevation
    local_analysis: bool
    planning: bool
    local_region_id: str | None
    local_status: Literal['available', 'outside_coverage', 'unavailable', 'nodata']
    temporal_illumination: Literal[False] = False
    sample_row: int | None
    sample_column: int | None


class Destination(BaseModel):
    id: str
    name: str
    coordinates: GlobeLocation
    camera_distance_radii: float = Field(ge=1.08, le=6)
    description: str
    source_url: str
    coordinate_note: str


class GlobeMetadata(BaseModel):
    available: bool
    reference_radius_m: float = 1737400
    frame: str = 'MEAN EARTH/POLAR AXIS OF DE421'
    terrain_product: str = 'LDEM_4 V3.0'
    terrain_observation_start: str = '2009-07-13T17:33:17'
    terrain_observation_stop: str = '2016-11-29T05:48:19'
    terrain_creation_date: str = '2017-09-15'
    terrain_angular_resolution_deg: float = 0.25
    terrain_columns: int = 1440
    terrain_rows: int = 720
    terrain_url: str = '/globe/elevation.bin'
    texture_urls: list[str] = ['/globe/color-1k.jpg', '/globe/color-4k.jpg']
    imagery_product: str = 'NASA-SVS-4720-COLOR-2019'
    imagery_note: str = 'Visualization only; adjusted color, polar albedo fill and inpainting. Not quantitative imagery.'
    attribution: str = "NASA's Scientific Visualization Studio; LRO / LROC and LOLA teams"
    source_urls: list[str] = ['https://svs.gsfc.nasa.gov/4720/', 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm']
    artifacts: dict = {}
