from datetime import datetime, timedelta, timezone
import random
from uuid import UUID

from pydantic import ValidationError
import pytest

from backend.app.models.mission import ScenarioCreate
from backend.app.simulation.energy import simulate

START = datetime(2027, 1, 1, tzinfo=timezone.utc)
SITE = {"latitude_deg": -89.5, "longitude_deg": 0}


def scenario(factors=(1,), generation=10, demand=10, battery=None, step=3600, other=()):
    assets = [{"id": str(UUID(int=1)), "kind": "solar_array", "name": "Synthetic solar", "location": SITE,
               "rated_power_kw": generation, "derating": 1},
              {"id": str(UUID(int=2)), "kind": "habitat", "name": "Synthetic habitat", "location": SITE, "demand_kw": demand}]
    if battery is not None:
        assets.append({"id": str(UUID(int=3)), "kind": "battery", "name": "Synthetic battery", "location": SITE,
                       "capacity_kwh": 100, "initial_soc": .5, "minimum_soc": 0,
                       "max_charge_kw": 100, "max_discharge_kw": 100, "charge_efficiency": 1, "discharge_efficiency": 1, **battery})
    assets.extend(other)
    return ScenarioCreate(name="Mathematical test only", site=SITE, assets=assets,
        mission={"start": START, "end": START + timedelta(seconds=step * len(factors)), "timestep_seconds": step,
                 "illumination_kind": "synthetic", "illumination_label": "Isolated mathematical input", "illumination_factors": list(factors)})


def assert_balance(result):
    summary = result.summary
    assert summary.generated_kwh + summary.initial_energy_kwh == pytest.approx(
        summary.demanded_kwh - summary.unserved_kwh + summary.curtailed_kwh + summary.battery_losses_kwh + summary.final_energy_kwh, abs=1e-8)
    assert abs(summary.energy_balance_error_kwh) < 1e-8
    for row in result.intervals:
        assert row.generation_kw + row.discharge_kw + row.unserved_kw == pytest.approx(row.demand_kw + row.charge_kw + row.curtailed_kw)
        assert abs(row.balance_error_kwh) < 1e-8


def test_constant_generation_equals_constant_demand():
    result = simulate(scenario(factors=[1] * 4, battery={}))
    assert result.summary.final_energy_kwh == 50
    assert result.summary.unserved_kwh == result.summary.curtailed_kwh == 0
    assert result.summary.first_power_shortage is None
    assert_balance(result)


@pytest.mark.parametrize("generation,demand,initial,final,curtail,unserved", [
    (20, 10, .5, 60, 0, 0), (0, 10, .5, 40, 0, 0),
    (20, 10, 1, 100, 10, 0), (0, 10, 0, 0, 0, 10),
])
def test_surplus_deficit_zero_generation_full_and_depleted(generation, demand, initial, final, curtail, unserved):
    result = simulate(scenario(generation=generation, demand=demand, battery={"initial_soc": initial}))
    assert result.summary.final_energy_kwh == final
    assert result.summary.curtailed_kwh == curtail
    assert result.summary.unserved_kwh == unserved
    assert_balance(result)


def test_bus_power_limits():
    charge = simulate(scenario(generation=20, demand=10, battery={"max_charge_kw": 2}))
    discharge = simulate(scenario(generation=0, demand=10, battery={"max_discharge_kw": 3}))
    assert charge.intervals[0].charge_kw == 2
    assert charge.summary.curtailed_kwh == 8
    assert discharge.intervals[0].discharge_kw == 3
    assert discharge.summary.unserved_kwh == 7
    assert "discharge_power" in discharge.intervals[0].batteries[str(UUID(int=3))].limits
    assert discharge.summary.first_power_shortage == START
    assert_balance(charge); assert_balance(discharge)


def test_efficiencies_and_variable_input():
    definition = scenario(factors=[1, 0], generation=10, demand=0,
        battery={"initial_soc": 0, "charge_efficiency": .8, "discharge_efficiency": .5})
    definition.assets[1].load_profile_kw = [0, 4]
    result = simulate(definition)
    assert result.intervals[0].energy_end_kwh == 8
    assert result.intervals[0].losses_kwh == pytest.approx(2)
    assert result.intervals[1].energy_end_kwh == 0
    assert result.intervals[1].losses_kwh == 4
    assert result.summary.battery_losses_kwh == pytest.approx(6)
    assert result.summary.unserved_kwh == 0
    assert_balance(result)


def test_exact_intra_interval_shortage_reserve_and_refinement():
    battery = {"capacity_kwh": 2, "initial_soc": .75, "minimum_soc": .25, "discharge_efficiency": .5}
    coarse = simulate(scenario(factors=[0, 1], generation=1, demand=1, battery=battery))
    fine = simulate(scenario(factors=[0] * 4 + [1] * 4, generation=1, demand=1, battery=battery, step=900))
    assert coarse.summary.first_power_shortage == START + timedelta(minutes=30)
    assert coarse.summary.shortage_duration_hours == .5
    assert coarse.summary.unserved_kwh == .5
    assert coarse.summary.final_energy_kwh == .5
    assert fine.summary == coarse.summary
    assert [e.kind for e in coarse.events] == ["battery_reserve", "power_shortage", "power_restored"]
    assert_balance(coarse); assert_balance(fine)


def test_multiple_battery_redispatch_and_asset_order_invariance():
    first = {"capacity_kwh": 1, "initial_soc": 1, "max_discharge_kw": 2}
    second = {"id": str(UUID(int=4)), "kind": "battery", "name": "Second", "location": SITE,
              "capacity_kwh": 1, "initial_soc": 1, "minimum_soc": 0, "max_discharge_kw": 2,
              "charge_efficiency": 1, "discharge_efficiency": 1}
    definition = scenario(generation=0, demand=2, battery=first, other=[second])
    result = simulate(definition)
    assert result.summary.unserved_kwh == 0
    assert result.intervals[0].discharge_kw == 2
    assert result.summary.final_energy_kwh == 0
    definition.assets.reverse()
    assert simulate(definition) == result
    assert_balance(result)


def test_robot_duty_operational_status_and_no_storage():
    robot = {"kind": "robot", "name": "Robot", "location": SITE, "active_demand_kw": 8, "idle_demand_kw": 2, "duty_cycle": .25}
    definition = scenario(generation=0, demand=0, other=[robot])
    result = simulate(definition)
    assert result.intervals[0].demand_kw == 3.5
    assert result.intervals[0].soc_end is None
    assert result.summary.minimum_soc is None
    definition.assets[-1].operational = False
    assert simulate(definition).summary.demanded_kwh == 0
    assert_balance(result)


def test_missing_invalid_illumination_and_load_profiles():
    definition = scenario()
    definition.mission.illumination_factors = None
    with pytest.raises(ValueError, match="explicit time-series"):
        simulate(definition)
    for invalid in [float("nan"), float("inf"), None, -1, 1.1]:
        with pytest.raises(ValidationError):
            scenario(factors=[invalid])
    definition = scenario()
    definition.assets[1].load_profile_kw = [1, 2]
    with pytest.raises(ValueError, match="load profile"):
        simulate(definition)
    definition = scenario(battery={})
    definition.assets[-1].capacity_kwh = -1
    with pytest.raises(ValidationError):
        simulate(definition)


def test_deterministic_randomized_balances_bounds_and_losses():
    rng = random.Random(421)
    for _ in range(30):
        capacity, minimum = rng.uniform(1, 200), rng.uniform(0, .4)
        definition = scenario(factors=[rng.random() for _ in range(12)], generation=rng.uniform(0, 50), demand=rng.uniform(0, 30), step=1800,
            battery={"capacity_kwh": capacity, "minimum_soc": minimum, "initial_soc": rng.uniform(minimum, 1),
                     "charge_efficiency": rng.uniform(.5, 1), "discharge_efficiency": rng.uniform(.5, 1),
                     "max_charge_kw": rng.uniform(0, 20), "max_discharge_kw": rng.uniform(0, 20)})
        result = simulate(definition)
        assert simulate(definition).model_dump_json() == result.model_dump_json()
        assert_balance(result)
        for row in result.intervals:
            state = row.batteries[str(UUID(int=3))]
            assert minimum * capacity - 1e-9 <= state.energy_end_kwh <= capacity + 1e-9
            assert state.charge_kw <= definition.assets[-1].max_charge_kw + 1e-9
            assert state.discharge_kw <= definition.assets[-1].max_discharge_kw + 1e-9
            assert state.charge_kw == 0 or state.discharge_kw == 0
            assert state.losses_kwh >= 0
