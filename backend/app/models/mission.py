"""Versioned hypothetical infrastructure definitions, with explicit engineering units."""

from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID, uuid4

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

MODEL_VERSION = "energy-1.0"
Nonnegative = Annotated[float, Field(ge=0, le=1e9, allow_inf_nan=False, strict=True)]
Fraction = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False, strict=True)]
Efficiency = Annotated[float, Field(gt=0, le=1, allow_inf_nan=False, strict=True)]


class Definition(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_default=True, allow_inf_nan=False)


class Location(Definition):
    latitude_deg: float = Field(ge=-90, le=0, allow_inf_nan=False)
    longitude_deg: float = Field(ge=0, lt=360, allow_inf_nan=False)


class AssetBase(Definition):
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(min_length=1, max_length=100, pattern=r"\S")
    location: Location
    operational: bool = True


class Habitat(AssetBase):
    kind: Literal["habitat"] = "habitat"
    demand_kw: Nonnegative = 8
    load_profile_kw: list[Nonnegative] | None = Field(default=None, max_length=10000)


class SolarArray(AssetBase):
    kind: Literal["solar_array"] = "solar_array"
    rated_power_kw: Nonnegative = 20
    derating: Fraction = 0.85


class Battery(AssetBase):
    kind: Literal["battery"] = "battery"
    capacity_kwh: float = Field(default=100, gt=0, le=1e9, allow_inf_nan=False)
    max_charge_kw: Nonnegative = 20
    max_discharge_kw: Nonnegative = 20
    charge_efficiency: Efficiency = 0.95
    discharge_efficiency: Efficiency = 0.95
    initial_soc: Fraction = 0.8
    minimum_soc: float = Field(default=0.1, ge=0, lt=1, allow_inf_nan=False)

    @model_validator(mode="after")
    def reserve(self):
        if self.initial_soc < self.minimum_soc:
            raise ValueError("Initial SOC must be at least minimum SOC")
        return self


class Communications(AssetBase):
    kind: Literal["communications"] = "communications"
    demand_kw: Nonnegative = 0.5


class Robot(AssetBase):
    kind: Literal["robot"] = "robot"
    active_demand_kw: Nonnegative = 2
    idle_demand_kw: Nonnegative = 0.2
    duty_cycle: Fraction = 0.25


Asset = Annotated[Habitat | SolarArray | Battery | Communications | Robot, Field(discriminator="kind")]


class Mission(Definition):
    start: AwareDatetime = datetime(2027, 1, 1, tzinfo=timezone.utc)
    end: AwareDatetime = datetime(2027, 1, 3, tzinfo=timezone.utc)
    timestep_seconds: int = Field(default=3600, ge=1, le=604800, strict=True)
    illumination_kind: Literal["synthetic", "custom_hypothetical"] = "synthetic"
    illumination_label: str = Field(default="Explicit hypothetical input; not NASA illumination", min_length=1, max_length=200)
    illumination_factors: list[Fraction] | None = Field(default=None, max_length=10000)

    @property
    def intervals(self) -> int:
        return int((self.end - self.start).total_seconds() / self.timestep_seconds)

    @model_validator(mode="after")
    def time_axis(self):
        self.start = self.start.astimezone(timezone.utc)
        self.end = self.end.astimezone(timezone.utc)
        duration = (self.end - self.start).total_seconds()
        if duration <= 0 or duration % self.timestep_seconds or not 1 <= self.intervals <= 10000:
            raise ValueError("Mission requires 1-10000 complete, equal intervals with end after start")
        if self.illumination_factors is not None and len(self.illumination_factors) != self.intervals:
            raise ValueError("Illumination must contain one factor per mission interval")
        return self


class ScenarioCreate(Definition):
    name: str = Field(min_length=1, max_length=100, pattern=r"\S")
    region_id: Literal["south-pole"] = "south-pole"
    site: Location
    mission: Mission = Field(default_factory=Mission)
    assets: list[Asset] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def asset_ids(self):
        if len({a.id for a in self.assets}) != len(self.assets):
            raise ValueError("Asset identifiers must be unique")
        return self


class Scenario(ScenarioCreate):
    id: UUID
    schema_version: Literal[1] = 1
    model_version: Literal["energy-1.0"] = MODEL_VERSION
    dataset_identifiers: dict[str, str]
    revision: int = Field(ge=1)
    modified_at: AwareDatetime


class ScenarioPatch(Definition):
    revision: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=100, pattern=r"\S")
    site: Location | None = None
    mission: Mission | None = None


class AssetCreate(Definition):
    revision: int = Field(ge=1)
    asset: Asset


class AssetPatch(Definition):
    revision: int = Field(ge=1)
    changes: dict = Field(min_length=1)


class Revision(Definition):
    revision: int = Field(ge=1)
