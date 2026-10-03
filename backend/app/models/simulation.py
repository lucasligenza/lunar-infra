from typing import Literal

from pydantic import AwareDatetime, Field

from uuid import UUID
from backend.app.models.mission import Definition, Mission, MODEL_VERSION, Scenario


class BatteryInterval(Definition):
    energy_start_kwh: float
    energy_end_kwh: float
    soc_start: float
    soc_end: float
    charge_kw: float
    discharge_kw: float
    losses_kwh: float
    limits: list[str]


class RoverState(Definition):
    """Deterministic rover position at a reporting instant (rover-kinematics-1)."""
    latitude_deg: float
    longitude_deg: float
    state: Literal["parked", "outbound", "at_destination", "returning", "returned"]
    moving: bool
    distance_from_start_km: float
    odometer_km: float
    moving_hours: float


class Interval(Definition):
    index: int
    start: AwareDatetime
    end: AwareDatetime
    generation_kw: float
    demand_kw: float
    net_kw: float
    charge_kw: float
    discharge_kw: float
    curtailed_kw: float
    unserved_kw: float
    losses_kwh: float
    energy_start_kwh: float
    energy_end_kwh: float
    soc_end: float | None
    balance_error_kwh: float
    asset_generation_kw: dict[str, float]
    asset_load_kw: dict[str, float]
    batteries: dict[str, BatteryInterval]
    constraint_violations: list[str]
    # End-of-interval rover states; absent in runs stored before rover kinematics.
    rovers: dict[str, RoverState] = Field(default_factory=dict)


class Event(Definition):
    time: AwareDatetime
    interval_index: int
    kind: Literal["power_shortage", "power_restored", "battery_full", "battery_reserve"]
    asset_id: str | None = None
    message: str


class Summary(Definition):
    generated_kwh: float
    demanded_kwh: float
    unserved_kwh: float
    curtailed_kwh: float
    battery_losses_kwh: float
    initial_energy_kwh: float
    final_energy_kwh: float
    minimum_soc: float | None
    first_power_shortage: AwareDatetime | None
    shortage_duration_hours: float
    energy_balance_error_kwh: float


class SimulationResult(Definition):
    model_version: Literal["energy-1.0"] = MODEL_VERSION
    mission: Mission
    input_kind: Literal["synthetic", "custom_hypothetical"]
    input_label: str
    assumptions: list[str]
    motion_model_version: str | None = None
    intervals: list[Interval]
    events: list[Event]
    summary: Summary


class SimulationRun(Definition):
    id: UUID
    schema_version: Literal[1] = 1
    created_at: AwareDatetime
    scenario_snapshot: Scenario
    scientific_provenance: dict
    input_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    result_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    result: SimulationResult


class RunSummary(Definition):
    id: UUID
    created_at: AwareDatetime
    scenario_revision: int
    input_kind: Literal["synthetic", "custom_hypothetical"]
    summary: Summary
