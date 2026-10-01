"""Explicit assumptions and evidence, never a universal human habitability score."""
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


class SuitabilityReport(BaseModel):
    model_version: str
    request: SuitabilityRequest
    candidates: list[Candidate]
    evaluated_centers: int
    supported_candidates: int
    search_spacing_km: float
    assumptions: list[str]
    warnings: list[str]
    sources: list[dict]
