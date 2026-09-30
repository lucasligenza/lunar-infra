from typing import Literal

from pydantic import AwareDatetime, Field

from backend.app.models.mission import Definition, Mission, MODEL_VERSION


class BatteryInterval(Definition):
    energy_start_kwh: float
    energy_end_kwh: float
    soc_start: float
    soc_end: float
    charge_kw: float
    discharge_kw: float
    losses_kwh: float
    limits: list[str]


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
    intervals: list[Interval]
    events: list[Event]
    summary: Summary
