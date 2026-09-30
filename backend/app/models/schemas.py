from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ScientificModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class Coordinates(ScientificModel):
    longitude_deg: float
    latitude_deg: float
    x_m: float
    y_m: float
    longitude_defined: bool = True
    frame: str = "MEAN EARTH/POLAR AXIS OF DE421"


class Measurement(ScientificModel):
    value: float | None
    unit: Literal["m", "deg", "fraction"]
    status: Literal["ok", "nodata", "unavailable"]
    quantity_kind: Literal["measured_gridded", "derived", "modeled"]
    source_id: str
    method: str
    resolution_m: float = Field(gt=0)
    support_m: float = Field(gt=0)
    notes: str

    @model_validator(mode="after")
    def consistent_status(self):
        if (self.status == "ok") != (self.value is not None):
            raise ValueError("Valid measurements need a finite value; missing measurements need null")
        return self


class SampleCell(ScientificModel):
    row: int
    column: int
    center: Coordinates


class SiteInspection(ScientificModel):
    region_id: str
    coordinates: Coordinates
    sample: SampleCell
    elevation: Measurement
    slope: Measurement
    solar_visibility: Measurement


class SourceFile(ScientificModel):
    url: str
    bytes: int
    sha256: str


class Dataset(ScientificModel):
    product_id: str
    version: str
    dataset_id: str
    available: bool
    quantity_kind: Literal["measured_gridded", "modeled"]
    unit: Literal["m", "fraction"]
    source_resolution_m: float
    prepared_resolution_m: float
    frame: str
    crs_wkt: str | None = None
    observation_start: str | None = None
    observation_stop: str | None = None
    created: str | None = None
    model_duration_years: float | None = None
    model_timestep_hours: float | None = None
    model_calendar_start: str | None = None
    model_calendar_stop: str | None = None
    processing: str
    files: dict[str, SourceFile]


class Layer(ScientificModel):
    id: Literal["elevation", "slope", "illumination"]
    name: str
    image_url: str
    unit: Literal["m", "deg", "fraction"]
    minimum: float
    maximum: float
    colors: list[str]
    description: str


class Region(ScientificModel):
    id: str
    name: str
    available: bool
    bounds_m: list[float]
    shape: list[int]
    resolution_m: float
    crs_proj: str
    reference_radius_m: float
    layers: list[Layer]


class Health(ScientificModel):
    status: Literal["ready", "unavailable"]
    detail: str
