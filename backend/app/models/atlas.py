"""Scientific catalog contracts; discoveries are not automatically integrations."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class Coverage(BaseModel):
    south: float = Field(ge=-90, le=90)
    north: float = Field(ge=-90, le=90)
    west: float = Field(ge=0, le=360)
    east: float = Field(ge=0, le=360)


class SourceFile(BaseModel):
    url: str
    bytes: int = Field(gt=0)
    sha256: str = Field(pattern=r'^[0-9a-f]{64}$')


class DatasetRecord(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str = Field(pattern=r'^[a-z0-9-]+$')
    name: str
    category: Literal['terrain','imagery','geology','thermal','mineralogy','resources','gravity','illumination']
    mission: str
    instrument: str
    organization: str
    source_url: str
    citation: str
    version: str
    product_id: str
    period: dict
    coverage: Coverage | None
    pixels_per_degree: float | None = None
    spacing_m_at_equator: float | None = None
    unit: str
    crs: str
    longitude_convention: str
    frame_note: str
    data_type: Literal['numeric_raster','vector','model','imagery']
    adapter: str
    cache: str | None
    limitations: list[str]
    files: dict[str, SourceFile]


class CatalogEntry(DatasetRecord):
    acquisition_status: Literal['ready','downloaded','not_acquired','discovered']
    numerical_queries: bool
    overlay_available: bool
    download_bytes: int


class Quantity(BaseModel):
    value: float | None
    unit: str
    status: Literal['ok','nodata','unavailable']
    source_id: str
    version: str
    quantity_kind: str
    spacing_north_m: float
    spacing_east_m: float
    support_north_m: float
    support_east_m: float
    method: str


class AtlasPoint(BaseModel):
    latitude_deg: float
    longitude_deg: float
    longitude_defined: bool
    pixel_center: list[float]
    sample_row: int
    sample_column: int
    dataset_id: str
    elevation: Quantity
    slope: Quantity
    reference_radius_m: float = 1737400
    frame_note: str
    terrain_source: str
