import pytest

from backend.app.simulation.energy import simulate
from backend.tests.test_energy import scenario, assert_balance


def test_capacity_crossing_mid_interval_accounts_for_loss_and_curtailment():
    result = simulate(scenario(generation=10, demand=0, battery={"capacity_kwh": 2, "initial_soc": 0, "charge_efficiency": .5}))
    assert result.summary.final_energy_kwh == 2
    assert result.summary.generated_kwh == 10
    assert result.summary.curtailed_kwh == 6
    assert result.summary.battery_losses_kwh == 2
    assert result.intervals[0].charge_kw == 4
    assert_balance(result)


def test_inactive_battery_cannot_serve_load_and_retains_energy():
    definition = scenario(generation=0, demand=10, battery={"operational": False})
    result = simulate(definition)
    assert result.summary.unserved_kwh == 10
    assert result.summary.final_energy_kwh == result.summary.initial_energy_kwh
    assert_balance(result)


def test_tiny_efficiency_rejected_when_bound_time_underflows():
    definition = scenario(generation=0, demand=100, battery={"capacity_kwh": 1, "initial_soc": .1, "discharge_efficiency": 5e-324})
    with pytest.raises(ValueError, match="numerical precision"):
        simulate(definition)


def test_shortage_constraint_uses_power_tolerance_independent_of_reporting_duration():
    result = simulate(scenario(generation=0, demand=2e-9, step=1))
    assert result.summary.first_power_shortage is not None
    assert result.intervals[0].constraint_violations == ["unserved_demand"]
    assert result.summary.unserved_kwh == pytest.approx(2e-9 / 3600, abs=1e-20)
    assert_balance(result)
