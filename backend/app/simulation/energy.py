"""Deterministic bus energy accounting; no HTTP, database, frontend or AI logic."""

from datetime import timedelta
from math import fsum

from backend.app.models.mission import ScenarioCreate
from backend.app.models.simulation import BatteryInterval, Event, Interval, SimulationResult, Summary

ASSUMPTIONS = [
    "Hypothetical electrical input factors, not NASA average visibility or actual solar irradiance.",
    "Piecewise-constant input and demand within each UTC interval; factors multiply rated electrical output and derating.",
    "One ideal lossless common DC bus; no geography-dependent transmission losses or automatic terrain shading.",
    "Robot duty cycle is interval-averaged demand; habitat load profiles replace continuous demand when provided.",
    "Active batteries dispatch in lexicographic UUID order; bound events are resolved within reporting intervals.",
    "Charge/discharge power limits are bus-side; losses affect internal battery energy. No simultaneous charge/discharge.",
    "Capacity is internal energy; minimum SOC reserves a fraction of it. Aggregate SOC includes inactive stored batteries.",
    "No thermal effects, degradation, voltage dynamics, startup surges, orientation geometry or power conversion beyond derating/efficiency.",
    "Numerical threshold: storage dispatch below 1e-12 kW is ignored; shortage events use 1e-9 kW tolerance.",
]


def simulate(definition: ScenarioCreate) -> SimulationResult:
    # Revalidate to guard against callers mutating an already-created Pydantic object.
    definition = ScenarioCreate.model_validate(definition.model_dump())
    mission = definition.mission
    factors = mission.illumination_factors
    if factors is None:
        raise ValueError("An explicit time-series illumination input is required; NASA average visibility is not temporal input")
    if mission.intervals * max(1, len(definition.assets)) > 100000:
        raise ValueError("Simulation exceeds 100000 asset-intervals; increase timestep or reduce duration/assets")
    assets = sorted(definition.assets, key=lambda item: str(item.id))
    batteries = [asset for asset in assets if asset.kind == "battery"]
    for asset in assets:
        if asset.kind == "habitat" and asset.load_profile_kw is not None and len(asset.load_profile_kw) != mission.intervals:
            raise ValueError("Habitat load profile requires one kW value per mission interval")
    energy = {str(b.id): b.capacity_kwh * b.initial_soc for b in batteries}
    capacity = fsum(b.capacity_kwh for b in batteries)
    initial = fsum(energy.values())
    minimum_soc = initial / capacity if capacity else None
    rows, events = [], []
    first_shortage = None
    shortage_active = False
    shortage_hours = 0.0
    dt = mission.timestep_seconds / 3600

    for index, factor in enumerate(factors):
        start = mission.start + timedelta(seconds=index * mission.timestep_seconds)
        generation_by_asset, load_by_asset = {}, {}
        for asset in assets:
            identifier = str(asset.id)
            if asset.kind == "solar_array":
                generation_by_asset[identifier] = asset.rated_power_kw * asset.derating * factor if asset.operational else 0
            elif asset.kind in ("habitat", "communications", "robot"):
                if asset.kind == "robot":
                    demand = asset.active_demand_kw * asset.duty_cycle + asset.idle_demand_kw * (1 - asset.duty_cycle)
                elif asset.kind == "habitat" and asset.load_profile_kw is not None:
                    demand = asset.load_profile_kw[index]
                else:
                    demand = asset.demand_kw
                load_by_asset[identifier] = demand if asset.operational else 0
        generated, demanded = fsum(generation_by_asset.values()), fsum(load_by_asset.values())
        net = generated - demanded
        before = energy.copy()
        charged = {str(b.id): 0.0 for b in batteries}
        discharged = charged.copy()
        losses = charged.copy()
        limits = {str(b.id): set() for b in batteries}
        curtailed = unserved = elapsed = 0.0
        remaining = dt
        # Fixed-sign net power can hit each storage bound at most once in an interval.
        for _ in range(len(batteries) + 2):
            if remaining <= 0:
                break
            required = abs(net)
            dispatch, bound_times = {}, {}
            for battery in batteries:
                identifier = str(battery.id)
                if not battery.operational or required <= 0:
                    continue
                charge = net > 0
                bound = battery.capacity_kwh if charge else battery.capacity_kwh * battery.minimum_soc
                room = bound - energy[identifier] if charge else energy[identifier] - bound
                maximum = battery.max_charge_kw if charge else battery.max_discharge_kw
                if room <= 0:
                    limits[identifier].add("capacity" if charge else "reserve")
                    continue
                power = min(required, maximum)
                if power < required:
                    limits[identifier].add("charge_power" if charge else "discharge_power")
                if power < 1e-12:
                    continue
                if charge and power * battery.charge_efficiency == 0:
                    raise ValueError("Battery parameters exceed supported numerical precision")
                dispatch[identifier] = power
                bound_times[identifier] = room / (power * battery.charge_efficiency) if charge else room * battery.discharge_efficiency / power
                required -= power
            segment = min(remaining, *bound_times.values()) if bound_times else remaining
            if segment <= 0:
                raise ValueError("Battery parameters exceed supported numerical precision")
            shortage = max(0.0, -net - fsum(dispatch.values())) if net < 0 else 0.0
            spilled = max(0.0, net - fsum(dispatch.values())) if net > 0 else 0.0
            event_time = start + timedelta(hours=elapsed)
            if shortage > 1e-9:
                if first_shortage is None:
                    first_shortage = event_time
                if not shortage_active:
                    events.append(Event(time=event_time, interval_index=index, kind="power_shortage", message="Electrical demand cannot be served"))
                shortage_hours += segment
            elif shortage_active:
                events.append(Event(time=event_time, interval_index=index, kind="power_restored", message="Electrical demand can be served again"))
            shortage_active = shortage > 1e-9
            unserved += shortage * segment
            curtailed += spilled * segment
            for battery in batteries:
                identifier = str(battery.id)
                power = dispatch.get(identifier, 0)
                if power <= 0:
                    continue
                if net > 0:
                    charged[identifier] += power * segment
                    energy[identifier] += power * segment * battery.charge_efficiency
                    losses[identifier] += power * segment * (1 - battery.charge_efficiency)
                else:
                    discharged[identifier] += power * segment
                    energy[identifier] -= power * segment / battery.discharge_efficiency
                    losses[identifier] += power * segment / battery.discharge_efficiency - power * segment
                if bound_times[identifier] <= segment:
                    energy[identifier] = battery.capacity_kwh if net > 0 else battery.capacity_kwh * battery.minimum_soc
                    limits[identifier].add("capacity" if net > 0 else "reserve")
                    events.append(Event(time=start + timedelta(hours=elapsed + segment), interval_index=index,
                                        kind="battery_full" if net > 0 else "battery_reserve", asset_id=identifier,
                                        message=f"{battery.name} reached {'capacity' if net > 0 else 'reserve SOC'}"))
                energy[identifier] = min(battery.capacity_kwh, max(battery.capacity_kwh * battery.minimum_soc, energy[identifier]))
            elapsed += segment
            remaining = max(0.0, dt - elapsed)
        else:
            raise ArithmeticError("Battery dispatch failed to converge")
        total_before, total_after, total_losses = fsum(before.values()), fsum(energy.values()), fsum(losses.values())
        balance = generated * dt + total_before - ((demanded * dt - unserved) + curtailed + total_losses + total_after)
        tolerance = 1e-9 * max(1, generated * dt, demanded * dt, total_before, total_after)
        if abs(balance) > tolerance:
            raise ArithmeticError("Interval energy balance failed")
        aggregate_soc = total_after / capacity if capacity else None
        if capacity:
            minimum_soc = min(minimum_soc, aggregate_soc)
        rows.append(Interval(index=index, start=start, end=start + timedelta(seconds=mission.timestep_seconds),
            generation_kw=generated, demand_kw=demanded, net_kw=net,
            charge_kw=fsum(charged.values()) / dt, discharge_kw=fsum(discharged.values()) / dt,
            curtailed_kw=curtailed / dt, unserved_kw=unserved / dt, losses_kwh=total_losses,
            energy_start_kwh=total_before, energy_end_kwh=total_after, soc_end=aggregate_soc, balance_error_kwh=balance,
            asset_generation_kw=generation_by_asset, asset_load_kw=load_by_asset,
            batteries={str(b.id): BatteryInterval(energy_start_kwh=before[str(b.id)], energy_end_kwh=energy[str(b.id)],
                soc_start=before[str(b.id)] / b.capacity_kwh, soc_end=energy[str(b.id)] / b.capacity_kwh,
                charge_kw=charged[str(b.id)] / dt, discharge_kw=discharged[str(b.id)] / dt,
                losses_kwh=losses[str(b.id)], limits=sorted(limits[str(b.id)])) for b in batteries},
            constraint_violations=["unserved_demand"] if unserved > 1e-9 else []))
    generated = fsum(row.generation_kw * dt for row in rows)
    demanded = fsum(row.demand_kw * dt for row in rows)
    unserved = fsum(row.unserved_kw * dt for row in rows)
    curtailed = fsum(row.curtailed_kw * dt for row in rows)
    losses = fsum(row.losses_kwh for row in rows)
    final = fsum(energy.values())
    return SimulationResult(mission=mission, input_kind=mission.illumination_kind, input_label=mission.illumination_label,
        assumptions=ASSUMPTIONS, intervals=rows, events=events,
        summary=Summary(generated_kwh=generated, demanded_kwh=demanded, unserved_kwh=unserved,
            curtailed_kwh=curtailed, battery_losses_kwh=losses, initial_energy_kwh=initial, final_energy_kwh=final,
            minimum_soc=minimum_soc, first_power_shortage=first_shortage, shortage_duration_hours=shortage_hours,
            energy_balance_error_kwh=generated + initial - (demanded - unserved + curtailed + losses + final)))
