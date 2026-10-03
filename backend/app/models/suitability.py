"""Explicit assumptions and evidence. The preliminary screening score is a relative
engineering-screening aid, never a human habitability or safety score."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.analysis import CircleArea
from backend.app.models.atlas import Quantity


class SuitabilityRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    area: CircleArea
    dataset: str = 'auto'
    max_slope_deg: float = Field(default=5, ge=0, le=30)
    candidate_radius_km: float = Field(default=5, ge=1, le=50)
    limit: int = Field(default=10, ge=1, le=10)


class ScoreComponent(BaseModel):
    criterion: Literal['low_slope_terrain', 'solar_visibility']
    label: str
    weight: float = Field(ge=0, le=1)
    value: float | None = Field(default=None, ge=0, le=1)
    evaluated: bool
    contribution: float = Field(ge=0, le=100)
    basis: str


class Candidate(BaseModel):
    id: str
    latitude_deg: float
    longitude_deg: float
    radius_km: float
    dataset_id: str
    source_id: str
    version: str
    spacing_m: float
    valid_terrain_fraction: float
    low_slope_fraction: float
    low_slope_area_km2: float
    mean_slope_deg: float
    solar_visibility: float | None
    solar_valid_fraction: float
    temperature_at_center: Quantity | None
    evidence_group: str
    tradeoff_front: int
    reasons: list[str]
    unknowns: list[str]
    screening_score: float = Field(default=0, ge=0, le=100)
    score_band: Literal['strong', 'promising', 'mixed', 'constrained'] = 'constrained'
    data_completeness: float = Field(default=0, ge=0, le=1)
    score_components: list[ScoreComponent] = Field(default_factory=list)
    rank_in_group: int = Field(default=0, ge=0)


class SuitabilityReport(BaseModel):
    model_version: str
    score_method: str = ''
    request: SuitabilityRequest
    candidates: list[Candidate]
    evaluated_centers: int
    supported_candidates: int
    search_spacing_km: float
    assumptions: list[str]
    warnings: list[str]
    sources: list[dict]


class NeighborhoodRequest(BaseModel):
    """Re-evaluate one returned candidate's neighborhood on its own native grid."""
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    latitude_deg: float = Field(ge=-90, le=90)
    longitude_deg: float = Field(ge=-180, le=360)
    radius_km: float = Field(gt=0, le=50)
    dataset_id: Literal['lola-south', 'gld100', 'lola-global']
    max_slope_deg: float = Field(default=5, ge=0, le=30)


class NeighborhoodCell(BaseModel):
    center: tuple[float, float]
    polygon: list[tuple[float, float]]
    elevation_m: float | None
    slope_deg: float | None
    low_slope: bool | None
    solar_visibility: float | None
    area_km2: float


class NeighborhoodReport(BaseModel):
    dataset_id: str
    source_id: str
    version: str
    spacing_m: float
    radius_km: float
    max_slope_deg: float
    center: tuple[float, float]
    cells: list[NeighborhoodCell]
    valid_terrain_fraction: float
    low_slope_fraction: float | None
    solar_visibility: float | None
    solar_valid_fraction: float
    method: str
